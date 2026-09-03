const mongoose = require('mongoose');
const { Order } = require('./order.model');
const { transitionOrderStatus } = require('./order-state-machine');
const FoodItem = require('../menu/food/food.model');
const Branch = require('../branches/branch.model');
const { Table } = require('../tables/table.model');
const CustomerSession = require('../customer-sessions/customer-session.model');
const stockService = require('../inventory/stock.service');
const { AuditLog } = require('../audit/audit.model');
const { generateOrderNumber } = require('../../utils/order-number');
const { generateSecurityCode } = require('../../utils/security-code');
const socketEmitter = require('../../sockets/socket.emitter');
const { NotFoundError, BadRequestError, ForbiddenError } = require('../../utils/errors');
const logger = require('../../config/logger');

class OrderService {
  /**
   * Create a new Order (Source of Truth calculations on server)
   */
  async createOrder({
    branchId,
    tableId,
    customerSessionId = null,
    customerName = null,
    customerNote = '',
    items,
    source = 'CUSTOMER_QR',
    createdBy = null,
    ipAddress = '',
    userAgent = '',
  }) {
    if (!items || !items.length) {
      throw new BadRequestError('Order must contain at least one item', 'EMPTY_ORDER');
    }

    // 1. Verify branch exists and is active
    const branch = await Branch.findOne({ _id: branchId, isActive: true, deletedAt: null });
    if (!branch) {
      throw new NotFoundError('Branch not found or inactive', 'BRANCH_NOT_FOUND');
    }

    // 2. Verify table exists and belongs to branch (if tableId is provided)
    let table = null;
    if (tableId) {
      table = await Table.findOne({ _id: tableId, branchId, isActive: true, deletedAt: null });
      if (!table) {
        throw new NotFoundError('Table not found in this branch', 'TABLE_NOT_FOUND');
      }
    }

    // 3. Verify customer session if ordered by customer
    if (customerSessionId) {
      const session = await CustomerSession.findOne({
        _id: customerSessionId,
        branchId,
        isActive: true,
      });

      if (!session || new Date() > session.expiresAt) {
        throw new BadRequestError('Customer session has expired or is invalid. Please scan QR again.', 'INVALID_SESSION');
      }
    }

    // 4. Validate food items and independently compute subtotal from database prices
    const foodItemIds = items.map((i) => i.foodItemId);
    const dbFoods = await FoodItem.find({
      _id: { $in: foodItemIds },
      branchId,
      isActive: true,
      deletedAt: null,
    });

    const foodMap = new Map();
    dbFoods.forEach((f) => foodMap.set(f._id.toString(), f));

    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const food = foodMap.get(item.foodItemId.toString());

      if (!food) {
        throw new BadRequestError(`Food item '${item.foodItemId}' not found or inactive in this branch`, 'FOOD_NOT_FOUND');
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
        unitPriceSnapshot: food.price,
        quantity: qty,
        subtotal: itemSubtotal,
        notes: item.notes ? item.notes.trim() : '',
      });
    }

    subtotal = parseFloat(subtotal.toFixed(2));

    // 5. Calculate taxes and totals from branch settings
    const taxRate = branch.settings?.taxRate !== undefined ? branch.settings.taxRate : 0.15;
    const serviceRate = branch.settings?.serviceChargeRate || 0;

    const discount = 0;
    const tax = parseFloat((subtotal * taxRate).toFixed(2));
    const serviceCharge = parseFloat((subtotal * serviceRate).toFixed(2));
    const total = parseFloat((subtotal - discount + tax + serviceCharge).toFixed(2));

    // 6. Generate sequential order number & secure security code
    const orderNumber = await generateOrderNumber(branchId);
    const securityCode = generateSecurityCode();

    // 7. Save Order
    const order = await Order.create({
      orderNumber,
      organizationId: branch.organizationId,
      branchId: branch._id,
      tableId: table ? table._id : null,
      customerName: customerName || null,
      customerNote: customerNote || '',
      orderType: table ? 'TABLE' : 'NO_TABLE',
      customerSessionId: customerSessionId || null,
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
      orderStatus: 'WAITING_FOR_PAYMENT',
      createdBy: createdBy || null,
    });

    // 8. Create Audit Log
    await AuditLog.create({
      organizationId: branch.organizationId,
      branchId: branch._id,
      userId: createdBy || null,
      action: 'CREATE_ORDER',
      entityType: 'Order',
      entityId: order._id,
      newValue: {
        orderNumber,
        total,
        itemCount: orderItems.length,
        source,
      },
      ipAddress,
      userAgent,
    });

    // 9. Emit real-time Socket events for frontend integration
    socketEmitter.emitOrderCreated(order);
    socketEmitter.emitNewOrder(order);

    return order.populate('tableId', 'tableNumber capacity');
  }

  /**
   * Get single order by ID
   */
  async getOrderById(orderId) {
    const order = await Order.findById(orderId)
      .populate('tableId', 'tableNumber')
      .populate('branchId', 'name code address settings')
      .populate('assignedWaiterId', 'name')
      .populate('createdBy', 'name role');

    if (!order) {
      throw new NotFoundError('Order not found', 'ORDER_NOT_FOUND');
    }

    return order;
  }

  /**
   * Query orders in a branch with pagination & filters
   */
  async getBranchOrders(branchId, { status, paymentStatus, date, tableId, source, page = 1, limit = 20 }) {
    const filter = { branchId };

    if (status) filter.orderStatus = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (tableId) filter.tableId = tableId;
    if (source) filter.source = source;

    if (date) {
      const startOfDay = new Date(`${date}T00:00:00.000Z`);
      const endOfDay = new Date(`${date}T23:59:59.999Z`);
      filter.createdAt = { $gte: startOfDay, $lte: endOfDay };
    }

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('tableId', 'tableNumber')
        .populate('assignedWaiterId', 'name')
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

  /**
   * Cancel an order (Restores stock if order was already confirmed/paid)
   */
  async cancelOrder({ orderId, staffUser, reason = '', ipAddress = '', userAgent = '' }) {
    const session = await mongoose.startSession();
    let cancelledOrder = null;

    try {
      await session.withTransaction(async () => {
        const order = await Order.findById(orderId).session(session);
        if (!order) {
          throw new NotFoundError('Order not found', 'ORDER_NOT_FOUND');
        }

        if (['DELIVERED', 'COMPLETED', 'CANCELLED'].includes(order.orderStatus)) {
          throw new BadRequestError(`Cannot cancel an order in '${order.orderStatus}' status`, 'CANNOT_CANCEL_ORDER');
        }

        // If order was already paid, restore inventory stock
        if (order.paymentStatus === 'PAID') {
          await stockService.restoreStockAtomic({
            items: order.items.map((it) => ({
              foodItemId: it.foodItemId,
              quantity: it.quantity,
            })),
            branchId: order.branchId,
            session,
          });

          order.paymentStatus = 'REFUNDED';
        }

        cancelledOrder = await transitionOrderStatus({
          order,
          nextStatus: 'CANCELLED',
          changedBy: staffUser ? staffUser.id : null,
          changedByRole: staffUser ? staffUser.role : 'CUSTOMER',
          reason: reason || 'Cancelled by staff/customer',
          session,
        });

        // Audit log
        const audit = new AuditLog({
          organizationId: order.organizationId,
          branchId: order.branchId,
          userId: staffUser ? staffUser.id : null,
          action: 'CANCEL_ORDER',
          entityType: 'Order',
          entityId: order._id,
          newValue: { orderStatus: 'CANCELLED', reason },
          ipAddress,
          userAgent,
        });
        await audit.save({ session });
      });
    } finally {
      await session.endSession();
    }

    if (cancelledOrder) {
      socketEmitter.emitOrderCancelled(
        cancelledOrder._id.toString(),
        cancelledOrder.branchId.toString(),
        cancelledOrder.orderNumber,
        reason || 'Cancelled by staff/customer'
      );
    }

    return cancelledOrder;
  }

  /**
   * Get all orders for a table session (all customers at the same table)
   */
  async getTableSessionOrders(tableId) {
    const orders = await Order.find({
      tableId: new mongoose.Types.ObjectId(tableId),
      orderStatus: { $nin: ['CANCELLED'] },
    })
      .populate('customerSessionId', 'sessionToken')
      .sort({ createdAt: 1 });

    const sessionOrders = {};
    let totalAmount = 0;

    orders.forEach(order => {
      const sessionId = order.customerSessionId?._id?.toString() || 'no-session';
      if (!sessionOrders[sessionId]) {
        sessionOrders[sessionId] = {
          sessionId,
          orders: [],
          subtotal: 0,
        };
      }
      sessionOrders[sessionId].orders.push(order);
      sessionOrders[sessionId].subtotal += order.total;
      totalAmount += order.total;
    });

    return {
      tableId,
      orders,
      sessionOrders: Object.values(sessionOrders),
      totalAmount,
      orderCount: orders.length,
    };
  }

  /**
   * Get combined bill for a table (all sessions combined)
   */
  async getTableBill(tableId) {
    const result = await this.getTableSessionOrders(tableId);

    const allItems = [];
    result.orders.forEach(order => {
      order.items.forEach(item => {
        allItems.push({
          orderId: order._id,
          orderNumber: order.orderNumber,
          foodNameSnapshot: item.foodNameSnapshot,
          quantity: item.quantity,
          unitPrice: item.unitPriceSnapshot,
          subtotal: item.subtotal,
          notes: item.notes,
        });
      });
    });

    return {
      tableId,
      orders: result.orders,
      items: allItems,
      totalAmount: result.totalAmount,
      orderCount: result.orderCount,
      summary: {
        subtotal: result.orders.reduce((sum, o) => sum + o.subtotal, 0),
        discount: result.orders.reduce((sum, o) => sum + (o.discount || 0), 0),
        tax: result.orders.reduce((sum, o) => sum + o.tax, 0),
        serviceCharge: result.orders.reduce((sum, o) => sum + (o.serviceCharge || 0), 0),
        total: result.totalAmount,
      },
    };
  }
  /**
   * PUBLIC (unauthenticated) order lookup by 4-digit securityCode.
   *
   * Used by the customer "track by pickup code" fallback when the tracking
   * link is lost. Only minimal, non-sensitive fields are returned so the
   * endpoint can be exposed without authentication.
   */
  async getOrderBySecurityCode(code) {
    const order = await Order.findOne({
      securityCode: String(code),
      deletedAt: null,
      orderStatus: { $ne: 'CANCELLED' },
    })
      .populate('tableId', 'tableNumber capacity')
      .select(
        'orderNumber securityCode orderStatus paymentStatus total subtotal tax serviceCharge discount createdAt readyAt completedAt branchId tableId items.foodNameSnapshot items.quantity items.subtotal'
      )
      .lean();

    if (!order) {
      throw new NotFoundError('No active order found with that pickup code', 'ORDER_NOT_FOUND');
    }
    return order;
  }

  /**
   * STAFF: find the active order matching a pickup code within a branch.
   * A code is ambiguous only if several non-completed orders share it, which
   * is unlikely in practice; the full matches array is returned so the
   * cashier can disambiguate (e.g. by table number) when it happens.
   */
  async getOrdersBySecurityCode(branchId, code) {
    const matches = await Order.find({
      branchId,
      securityCode: String(code),
      deletedAt: null,
      orderStatus: { $nin: ['COMPLETED', 'CANCELLED'] },
    })
      .populate('tableId', 'tableNumber capacity')
      .populate('customerSessionId', 'sessionToken')
      .sort({ createdAt: -1 })
      .limit(5);

    if (!matches.length) {
      throw new NotFoundError('No active order found with that pickup code', 'ORDER_NOT_FOUND');
    }
    return { matches, count: matches.length };
  }
}

module.exports = new OrderService();
