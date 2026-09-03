const DailyStock = require('./daily-stock.model');
const FoodItem = require('../menu/food/food.model');
const Branch = require('../branches/branch.model');
const { getTodayBusinessDate } = require('../../utils/date');
const { NotFoundError, BadRequestError, ConflictError } = require('../../utils/errors');
const logger = require('../../config/logger');
const socketEmitter = require('../../sockets/socket.emitter');

class StockService {
  /**
   * Set or update today's prepared stock for a food item
   */
  async setDailyStock(branchId, { foodItemId, preparedQuantity, lowStockThreshold = 5, businessDate }) {
    const targetDate = businessDate || getTodayBusinessDate();

    const branch = await Branch.findOne({ _id: branchId, deletedAt: null });
    if (!branch) {
      throw new NotFoundError('Branch not found', 'BRANCH_NOT_FOUND');
    }

    const foodItem = await FoodItem.findOne({ _id: foodItemId, branchId, deletedAt: null });
    if (!foodItem) {
      throw new NotFoundError('Food item not found in this branch', 'FOOD_NOT_FOUND');
    }

    // Find existing stock record or create new
    let stock = await DailyStock.findOne({
      branchId,
      foodItemId,
      businessDate: targetDate,
    });

    if (stock) {
      // Adjust prepared quantity, recalc remaining
      const difference = preparedQuantity - stock.preparedQuantity;
      stock.preparedQuantity = preparedQuantity;
      stock.remainingQuantity = Math.max(0, stock.remainingQuantity + difference);
      stock.lowStockThreshold = lowStockThreshold;
      stock.updateStatus();
      await stock.save();
    } else {
      stock = new DailyStock({
        branchId,
        foodItemId,
        businessDate: targetDate,
        preparedQuantity,
        soldQuantity: 0,
        remainingQuantity: preparedQuantity,
        lowStockThreshold,
      });
      stock.updateStatus();
      await stock.save();
    }

    const populatedStock = await stock.populate('foodItemId', 'name price categoryId');

    socketEmitter.emitStockUpdated(branchId.toString(), {
      foodItemId,
      foodName: populatedStock.foodItemId?.name,
      preparedQuantity: stock.preparedQuantity,
      remainingQuantity: stock.remainingQuantity,
      status: stock.status,
    });

    if (stock.status === 'SOLD_OUT') {
      socketEmitter.emitFoodSoldOut(branchId.toString(), foodItemId.toString(), populatedStock.foodItemId?.name);
    } else if (stock.status === 'LOW_STOCK') {
      socketEmitter.emitFoodAvailabilityChanged(branchId.toString(), foodItemId.toString(), populatedStock.foodItemId?.name, true);
    }

    return populatedStock;
  }

  /**
   * Bulk initialize daily stock for multiple food items in a branch
   */
  async bulkSetDailyStock(branchId, items, businessDate) {
    const targetDate = businessDate || getTodayBusinessDate();
    const results = [];

    for (const item of items) {
      const stock = await this.setDailyStock(branchId, {
        foodItemId: item.foodItemId,
        preparedQuantity: item.preparedQuantity,
        lowStockThreshold: item.lowStockThreshold || 5,
        businessDate: targetDate,
      });
      results.push(stock);
    }

    return results;
  }

  /**
   * Get today's active stock overview for a branch
   */
  async getTodayStock(branchId, businessDate) {
    const targetDate = businessDate || getTodayBusinessDate();

    const stocks = await DailyStock.find({
      branchId,
      businessDate: targetDate,
    })
      .populate('foodItemId', 'name price categoryId imageUrl isAvailable')
      .sort({ status: 1, remainingQuantity: 1 });

    return stocks;
  }

  /**
   * Update existing stock record
   */
  async updateStock(stockId, { preparedQuantity, lowStockThreshold }) {
    const stock = await DailyStock.findById(stockId);
    if (!stock) {
      throw new NotFoundError('Daily stock record not found', 'STOCK_NOT_FOUND');
    }

    if (preparedQuantity !== undefined) {
      const diff = preparedQuantity - stock.preparedQuantity;
      stock.preparedQuantity = preparedQuantity;
      stock.remainingQuantity = Math.max(0, stock.remainingQuantity + diff);
    }

    if (lowStockThreshold !== undefined) {
      stock.lowStockThreshold = lowStockThreshold;
    }

    stock.updateStatus();
    await stock.save();

    return stock.populate('foodItemId', 'name price categoryId');
  }

  /**
   * CRITICAL ATOMIC STOCK DEDUCTION
   * Must be called inside a MongoDB session transaction when confirming order payment.
   * Guarantees remainingQuantity can NEVER become negative.
   *
   * @param {object} params
   * @param {Array} params.items - [{ foodItemId, quantity, foodName }]
   * @param {string} params.branchId
   * @param {import('mongoose').ClientSession} params.session - Mongoose transaction session
   */
  async deductStockAtomic({ items, branchId, session }) {
    const businessDate = getTodayBusinessDate();
    const soldOutItems = [];

    for (const item of items) {
      const foodItemId = item.foodItemId;
      const qty = Number(item.quantity);

      // 1. Check if a DailyStock record exists for today
      const stockDoc = await DailyStock.findOne({
        branchId,
        foodItemId,
        businessDate,
      }).session(session);

      if (stockDoc) {
        // Atomic conditional decrement: remainingQuantity MUST be >= qty
        const updatedStock = await DailyStock.findOneAndUpdate(
          {
            _id: stockDoc._id,
            remainingQuantity: { $gte: qty },
          },
          {
            $inc: {
              soldQuantity: qty,
              remainingQuantity: -qty,
            },
          },
          {
            session,
            new: true,
          }
        );

        if (!updatedStock) {
          throw new BadRequestError(
            `Food item '${item.foodName || 'Item'}' is out of stock or insufficient quantity remaining (Requested: ${qty}, Available: ${stockDoc.remainingQuantity})`,
            'FOOD_OUT_OF_STOCK'
          );
        }

        // Update status after atomic decrement
        updatedStock.updateStatus();
        await updatedStock.save({ session });

        if (updatedStock.status === 'SOLD_OUT') {
          soldOutItems.push({
            foodItemId,
            foodName: item.foodName,
            status: 'SOLD_OUT',
          });
        }
      }
    }

    return { success: true, soldOutItems };
  }

  /**
   * ATOMIC STOCK RESTORATION
   * Used when an order is cancelled or refunded to return quantities to stock
   */
  async restoreStockAtomic({ items, branchId, session }) {
    const businessDate = getTodayBusinessDate();

    for (const item of items) {
      const foodItemId = item.foodItemId;
      const qty = Number(item.quantity);

      const stockDoc = await DailyStock.findOne({
        branchId,
        foodItemId,
        businessDate,
      }).session(session);

      if (stockDoc) {
        const updatedStock = await DailyStock.findByIdAndUpdate(
          stockDoc._id,
          {
            $inc: {
              soldQuantity: -qty,
              remainingQuantity: qty,
            },
          },
          {
            session,
            new: true,
          }
        );

        if (updatedStock) {
          updatedStock.updateStatus();
          await updatedStock.save({ session });
        }
      }
    }

    return { success: true };
  }

  async addStockAtomic({ foodItemId, branchId, quantity, reason, session }) {
    const businessDate = getTodayBusinessDate();
    const foodItem = await FoodItem.findById(foodItemId).lean();
    if (!foodItem) {
      throw new NotFoundError('Food item not found', 'FOOD_NOT_FOUND');
    }

    let stockDoc = await DailyStock.findOne({
      branchId,
      foodItemId,
      businessDate,
    }).session(session);

    if (stockDoc) {
      stockDoc.preparedQuantity += quantity;
      stockDoc.remainingQuantity += quantity;
      stockDoc.updateStatus();
      await stockDoc.save({ session });
    } else {
      stockDoc = new DailyStock({
        branchId,
        foodItemId,
        businessDate,
        preparedQuantity: quantity,
        soldQuantity: 0,
        remainingQuantity: quantity,
        lowStockThreshold: 5,
      });
      stockDoc.updateStatus();
      await stockDoc.save({ session });
    }

    return { success: true, stock: stockDoc, foodName: foodItem.name };
  }

  async recordWasteAtomic({ foodItemId, branchId, quantity, reason, session }) {
    const businessDate = getTodayBusinessDate();
    const foodItem = await FoodItem.findById(foodItemId).lean();
    if (!foodItem) {
      throw new NotFoundError('Food item not found', 'FOOD_NOT_FOUND');
    }

    const stockDoc = await DailyStock.findOne({
      branchId,
      foodItemId,
      businessDate,
    }).session(session);

    if (!stockDoc) {
      throw new BadRequestError(
        `No stock record found for '${foodItem.name}' today`,
        'NO_STOCK_RECORD'
      );
    }

    if (stockDoc.remainingQuantity < quantity) {
      throw new BadRequestError(
        `Insufficient stock for '${foodItem.name}'. Available: ${stockDoc.remainingQuantity}, Requested waste: ${quantity}`,
        'INSUFFICIENT_STOCK'
      );
    }

    stockDoc.remainingQuantity -= quantity;
    stockDoc.updateStatus();
    await stockDoc.save({ session });

    return { success: true, stock: stockDoc, foodName: foodItem.name };
  }
}

module.exports = new StockService();
