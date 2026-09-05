const mongoose = require('mongoose');
const { Order } = require('./order.model');
const { transitionOrderStatus } = require('./order-state-machine');
const FoodItem = require('../menu/food/food.model');
const { Table } = require('../tables/table.model');
const socketEmitter = require('../../sockets/socket.emitter');
const { generateOrderNumber } = require('../../utils/order-number');
const { generateSecurityCode } = require('../../utils/security-code');
const { NotFoundError, BadRequestError } = require('../../utils/errors');

class OrderService {
  async createOrder({
    tableId,
    customerName = null,
    customerNote = '',
    items,
    source = 'CUSTOMER_QR',
    createdBy = null,
  }) {
    if (!items || !items.length) {
      throw new BadRequestError('Order must contain at least one item', 'EMPTY_ORDER');
    }

    let table = null;
    if (tableId) {
      table = await Table.findOne({ _id: tableId, isActive: true, deletedAt: null });
      if (!table) {
        throw new NotFoundError('Table not found', 'TABLE_NOT_FOUND');
      }
    }

    const foodItemIds = items.map((i) => i.foodItemId);
    const dbFoods = await FoodItem.find({
      _id: { $in: foodItemIds },
      isActive: true,
      deletedAt: null,
    }).populate('categoryId', 'name');

    const foodMap = new Map();
    dbFoods.forEach((f) => foodMap.set(f._id.toString(), f));

    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const food = foodMap.get(item.foodItemId.toString());

      if (!food) {
        throw new BadRequestError(`Food item '${item.foodItemId}' not found or inactive`, 'FOOD_NOT_FOUND');
      }

      if (!food.isAvailable) {
        throw new BadRequestError(`Food item '${food.name}' is currently marked unavailable`, 'FOOD_UNAVAILABLE');
      }

      const qty = parseInt(item.quantity, 10);
      if (isNaN(qty) || qty <= 0) {
        throw new BadRequestError(`Invalid quantity for food item '${food.name}'`, 'INVALID_QUANTITY');
      }

      const itemSubtotal = parseFloat((food.price * qty).toFixed(2));
      subtotal += itemSubtotal;

      orderItems.push({
        foodItemId: food._id,
        foodNameSnapshot: food.name,
        categorySnapshot: food.categoryId?.name || '',
        unitPriceSnapshot: food.price,
        quantity: qty,
        subtotal: itemSubtotal,
        notes: item.notes ? item.notes.trim() : '',
      });
    }

    subtotal = parseFloat(subtotal.toFixed(2));

    const taxRate = 0.15;
    const discount = 0;
    const tax = parseFloat((subtotal * taxRate).toFixed(2));
    const serviceCharge = 0;
    const total = parseFloat((subtotal - discount + tax + serviceCharge).toFixed(2));

    const orderNumber = await generateOrderNumber();
    const securityCode = generateSecurityCode();

    const order = await Order.create({
      orderNumber,
      tableId: table ? table._id : null,
      customerName: customerName || null,
      customerNote: customerNote || '',
      securityCode,
      source,
      items: orderItems,
      subtotal,
      discount,
      tax,
      serviceCharge,
      total,
      paymentMethod: 'UNSET',
      paymentStatus: 'UNPAID',
      orderStatus: 'PENDING',
      createdBy: createdBy || null,
    });

    socketEmitter.emitOrderCreated(order);

    return order.populate('tableId', 'tableNumber capacity');
  }

  async getOrderById(orderId) {
    const order = await Order.findById(orderId)
      .populate('tableId', 'tableNumber')
      .populate('createdBy', 'name role');

    if (!order) {
      throw new NotFoundError('Order not found', 'ORDER_NOT_FOUND');
    }

    return order;
  }

  async getOrders({ status, paymentStatus, date, page = 1, limit = 20 }) {
    const filter = {};

    if (status) filter.orderStatus = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;

    if (date) {
      const startOfDay = new Date(`${date}T00:00:00.000Z`);
      const endOfDay = new Date(`${date}T23:59:59.999Z`);
      filter.createdAt = { $gte: startOfDay, $lte: endOfDay };
    }

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('tableId', 'tableNumber')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Order.countDocuments(filter),
    ]);

    return {
      orders,
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async cancelOrder({ orderId, reason = '' }) {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new NotFoundError('Order not found', 'ORDER_NOT_FOUND');
    }

    if (['COMPLETED', 'CANCELLED'].includes(order.orderStatus)) {
      throw new BadRequestError(`Cannot cancel an order in '${order.orderStatus}' status`, 'CANNOT_CANCEL_ORDER');
    }

    if (order.paymentStatus === 'PAID') {
      order.paymentStatus = 'REFUNDED';
    }

    const cancelledOrder = await transitionOrderStatus({
      order,
      nextStatus: 'CANCELLED',
      changedBy: null,
      changedByRole: 'STAFF',
      reason: reason || 'Cancelled by staff',
    });

    socketEmitter.emitOrderCancelled(
      cancelledOrder._id.toString(),
      cancelledOrder.orderNumber,
      reason || 'Cancelled by staff'
    );

    return cancelledOrder;
  }

  async getOrderBySecurityCode(code) {
    const order = await Order.findOne({
      securityCode: String(code),
      deletedAt: null,
      orderStatus: { $ne: 'CANCELLED' },
    })
      .populate('tableId', 'tableNumber capacity')
      .select(
        'orderNumber securityCode orderStatus paymentStatus total subtotal tax serviceCharge discount createdAt readyAt completedAt tableId items.foodNameSnapshot items.quantity items.subtotal'
      )
      .lean();

    if (!order) {
      throw new NotFoundError('No active order found with that pickup code', 'ORDER_NOT_FOUND');
    }
    return order;
  }

  async completeOrder(orderId) {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new NotFoundError('Order not found', 'ORDER_NOT_FOUND');
    }

    if (order.orderStatus !== 'READY') {
      throw new BadRequestError('Only READY orders can be completed', 'INVALID_ORDER_STATUS');
    }

    const completedOrder = await transitionOrderStatus({
      order,
      nextStatus: 'COMPLETED',
      changedBy: null,
      changedByRole: 'STAFF',
    });

    socketEmitter.emitOrderCompleted(completedOrder);

    return completedOrder.populate('tableId', 'tableNumber');
  }
}

module.exports = new OrderService();
