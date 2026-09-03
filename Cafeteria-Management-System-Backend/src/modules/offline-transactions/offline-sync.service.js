const mongoose = require('mongoose');
const stockService = require('../inventory/stock.service');
const orderService = require('../orders/order.service');
const cashierProvider = require('../payments/providers/cashier.provider');
const { OfflineTransaction } = require('./offline-transaction.model');
const auditService = require('../audit/audit.service');
const { runInTransaction } = require('../../utils/transaction');
const { getTodayBusinessDate } = require('../../utils/date');

const PRIORITY_ORDER = { STOCK: 0, ORDER: 1, PAYMENT: 2, WASTE: 3, EXPENSE: 4 };

const offlineSyncService = {
  async syncBatch(records, userId, branchId) {
    const results = [];
    const sorted = [...records].sort((a, b) =>
      (PRIORITY_ORDER[a.operationType] ?? 5) - (PRIORITY_ORDER[b.operationType] ?? 5)
    );

    for (const tx of sorted) {
      const result = await this.syncTransaction(tx, userId, branchId);
      results.push({
        clientRefId: tx.clientRefId,
        ...result,
      });
    }

    return results;
  },

  async syncTransaction(tx, userId, branchId) {
    try {
      switch (tx.operationType) {
        case 'STOCK':
          return await this.syncStockTransaction(tx, userId, branchId);
        case 'WASTE':
          return await this.syncWasteTransaction(tx, userId, branchId);
        case 'ORDER':
          return await this.syncOrderTransaction(tx, userId, branchId);
        case 'PAYMENT':
          return await this.syncPaymentTransaction(tx, userId, branchId);
        case 'EXPENSE':
        case 'TABLE':
        case 'OTHER':
          // Recorded + applied during approval; nothing to "sync" into a new
          // domain record. Mark as synced so the local queue clears.
          await OfflineTransaction.findOneAndUpdate(
            { clientRefId: tx.clientRefId },
            { syncStatus: 'SYNCED', syncedAt: new Date() }
          );
          return { success: true, message: `${tx.operationType} entry recorded` };
        default:
          return { success: false, message: `Unknown operation type: ${tx.operationType}` };
      }
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  async syncWasteTransaction(tx, userId, branchId) {
    try {
      const businessDate = getTodayBusinessDate();
      const stockData = tx.stockData || {};
      if (!stockData.foodItemId || !stockData.changeQuantity) {
        return { success: false, message: 'Waste entry requires foodItemId and changeQuantity' };
      }
      await stockService.recordWasteAtomic({
        foodItemId: stockData.foodItemId,
        branchId: new mongoose.Types.ObjectId(branchId),
        quantity: Number(stockData.changeQuantity),
        reason: tx.reason || 'Waste',
        session: null,
      });

      await OfflineTransaction.findOneAndUpdate(
        { clientRefId: tx.clientRefId },
        { syncStatus: 'SYNCED', syncedAt: new Date() }
      );
      return { success: true, data: { businessDate } };
    } catch (err) {
      await OfflineTransaction.findOneAndUpdate(
        { clientRefId: tx.clientRefId },
        {
          syncStatus: err.message.includes('insufficient') || err.message.includes('out of stock') ? 'CONFLICT' : 'FAILED',
          syncError: err.message,
          conflictData: { serverError: err.message, timestamp: new Date().toISOString() },
        }
      );
      return {
        success: false,
        conflict: err.message.includes('insufficient') || err.message.includes('out of stock'),
        message: err.message,
      };
    }
  },

  async syncStockTransaction(tx, userId, branchId) {
    try {
      return await runInTransaction(async (session) => {
        await stockService.deductStockAtomic({
          items: tx.stockData.items,
          branchId: new mongoose.Types.ObjectId(branchId),
          session,
        });

        await OfflineTransaction.findOneAndUpdate(
          { clientRefId: tx.clientRefId },
          { syncStatus: 'SYNCED', syncedAt: new Date() },
          { session }
        );

        await auditService.logAction({
          branchId,
          userId,
          action: 'OFFLINE_STOCK_SYNCED',
          entityType: 'OfflineTransaction',
          entityId: tx._id,
        });

        return { success: true };
      });
    } catch (err) {
      await OfflineTransaction.findOneAndUpdate(
        { clientRefId: tx.clientRefId },
        { 
          syncStatus: err.message.includes('out of stock') || err.message.includes('insufficient') ? 'CONFLICT' : 'FAILED',
          syncError: err.message,
          conflictData: { serverError: err.message, timestamp: new Date().toISOString() }
        }
      );

      if (err.message.includes('out of stock') || err.message.includes('insufficient')) {
        return { success: false, conflict: true, message: err.message };
      }
      return { success: false, message: err.message };
    }
  },

  async syncOrderTransaction(tx, userId, branchId) {
    try {
      const order = await orderService.createOrder({
        branchId: new mongoose.Types.ObjectId(branchId),
        tableId: tx.orderData.tableNumber ? null : tx.orderData.tableId,
        customerName: tx.orderData.customerName || 'Walk-in',
        customerNote: tx.orderData.customerNote || '',
        items: tx.orderData.items,
        source: 'MANUAL',
        createdBy: new mongoose.Types.ObjectId(userId),
      });

      await OfflineTransaction.findOneAndUpdate(
        { clientRefId: tx.clientRefId },
        { syncStatus: 'SYNCED', syncedAt: new Date(), orderId: order._id }
      );

      await auditService.logAction({
        branchId,
        userId,
        action: 'OFFLINE_ORDER_SYNCED',
        entityType: 'OfflineTransaction',
        entityId: tx._id,
        newValue: { orderId: order._id, orderNumber: order.orderNumber },
      });

      return { success: true, data: { orderId: order._id, orderNumber: order.orderNumber } };
    } catch (err) {
      await OfflineTransaction.findOneAndUpdate(
        { clientRefId: tx.clientRefId },
        { syncStatus: 'FAILED', syncError: err.message }
      );
      return { success: false, message: err.message };
    }
  },

  async syncPaymentTransaction(tx, userId, branchId) {
    try {
      const staffUser = await require('../users/user.model').findById(userId);
      if (!staffUser) {
        return { success: false, message: 'User not found' };
      }

      await cashierProvider.confirmCashierPayment({
        orderId: tx.paymentData.orderId,
        staffUser,
        paymentMethod: tx.paymentData.method || 'cash',
        ipAddress: '',
        userAgent: 'offline-sync',
      });

      await OfflineTransaction.findOneAndUpdate(
        { clientRefId: tx.clientRefId },
        { syncStatus: 'SYNCED', syncedAt: new Date() }
      );

      await auditService.logAction({
        branchId,
        userId,
        action: 'OFFLINE_PAYMENT_SYNCED',
        entityType: 'OfflineTransaction',
        entityId: tx._id,
      });

      return { success: true };
    } catch (err) {
      await OfflineTransaction.findOneAndUpdate(
        { clientRefId: tx.clientRefId },
        { syncStatus: 'FAILED', syncError: err.message }
      );
      return { success: false, message: err.message };
    }
  },
};

module.exports = offlineSyncService;
