const { Order } = require('../orders/order.model');
const { transitionOrderStatus } = require('../orders/order-state-machine');
const socketEmitter = require('../../sockets/socket.emitter');
const { AuditLog } = require('../audit/audit.model');
const { NotFoundError, BadRequestError } = require('../../utils/errors');

class KitchenService {
  /**
   * Get active confirmed & preparing orders for the kitchen display system (KDS)
   * CRITICAL INVARIANT: Kitchen MUST NEVER receive UNPAID orders.
   */
  async getKitchenQueue(branchId) {
    const orders = await Order.find({
      branchId,
      paymentStatus: 'PAID', // strictly paid
      orderStatus: { $in: ['CONFIRMED', 'PREPARING'] },
    })
      .populate('tableId', 'tableNumber capacity')
      .sort({ confirmedAt: 1, createdAt: 1 });

    return orders;
  }

  /**
   * Start preparing order (CONFIRMED -> PREPARING)
   */
  async startPreparation(orderId, staffUser, ipAddress = '', userAgent = '') {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new NotFoundError('Order not found', 'ORDER_NOT_FOUND');
    }

    if (staffUser.role !== 'OWNER' && order.branchId.toString() !== staffUser.branchId.toString()) {
      throw new BadRequestError('Cannot modify an order in another branch', 'BRANCH_MISMATCH');
    }

    if (order.paymentStatus !== 'PAID') {
      throw new BadRequestError('Cannot prepare an unpaid order', 'ORDER_UNPAID');
    }

    const updatedOrder = await transitionOrderStatus({
      order,
      nextStatus: 'PREPARING',
      changedBy: staffUser.id,
      changedByRole: staffUser.role,
      reason: 'Kitchen started preparation',
    });

    // Record audit
    await AuditLog.create({
      organizationId: order.organizationId,
      branchId: order.branchId,
      userId: staffUser.id,
      action: 'START_ORDER',
      entityType: 'Order',
      entityId: order._id,
      oldValue: { orderStatus: 'CONFIRMED' },
      newValue: { orderStatus: 'PREPARING' },
      ipAddress,
      userAgent,
    });

    // Real-time broadcast
    socketEmitter.emitOrderPreparing(updatedOrder);

    return updatedOrder.populate('tableId', 'tableNumber');
  }

  /**
   * Mark order ready for waiter pickup (PREPARING -> READY)
   */
  async markReady(orderId, staffUser, ipAddress = '', userAgent = '') {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new NotFoundError('Order not found', 'ORDER_NOT_FOUND');
    }

    if (staffUser.role !== 'OWNER' && order.branchId.toString() !== staffUser.branchId.toString()) {
      throw new BadRequestError('Cannot modify an order in another branch', 'BRANCH_MISMATCH');
    }

    const updatedOrder = await transitionOrderStatus({
      order,
      nextStatus: 'READY',
      changedBy: staffUser.id,
      changedByRole: staffUser.role,
      reason: 'Kitchen marked food ready',
    });

    // Record audit
    await AuditLog.create({
      organizationId: order.organizationId,
      branchId: order.branchId,
      userId: staffUser.id,
      action: 'MARK_READY',
      entityType: 'Order',
      entityId: order._id,
      oldValue: { orderStatus: 'PREPARING' },
      newValue: { orderStatus: 'READY' },
      ipAddress,
      userAgent,
    });

    // Real-time broadcast to Waiters
    socketEmitter.emitOrderReady(updatedOrder);

    return updatedOrder.populate('tableId', 'tableNumber');
  }
}

module.exports = new KitchenService();
