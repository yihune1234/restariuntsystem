const { Order } = require('../orders/order.model');
const { transitionOrderStatus } = require('../orders/order-state-machine');
const socketEmitter = require('../../sockets/socket.emitter');
const { AuditLog } = require('../audit/audit.model');
const { NotFoundError, BadRequestError } = require('../../utils/errors');

class WaiterService {
  /**
   * Get all ready orders awaiting waiter pickup
   */
  async getReadyOrders(branchId) {
    const orders = await Order.find({
      branchId,
      orderStatus: { $in: ['READY', 'TAKEN_BY_WAITER'] },
    })
      .populate('tableId', 'tableNumber capacity')
      .populate('assignedWaiterId', 'name')
      .sort({ readyAt: 1, createdAt: 1 });

    return orders;
  }

  /**
   * Waiter claims/takes food to deliver to table (READY -> TAKEN_BY_WAITER)
   */
  async takeOrder(orderId, waiterUser, ipAddress = '', userAgent = '') {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new NotFoundError('Order not found', 'ORDER_NOT_FOUND');
    }

    if (waiterUser.role !== 'OWNER' && order.branchId.toString() !== waiterUser.branchId.toString()) {
      throw new BadRequestError('Cannot take an order from another branch', 'BRANCH_MISMATCH');
    }

    order.assignedWaiterId = waiterUser.id;

    const updatedOrder = await transitionOrderStatus({
      order,
      nextStatus: 'TAKEN_BY_WAITER',
      changedBy: waiterUser.id,
      changedByRole: waiterUser.role,
      reason: `Waiter ${waiterUser.name || ''} took the order for delivery`,
    });

    // Record audit
    await AuditLog.create({
      organizationId: order.organizationId,
      branchId: order.branchId,
      userId: waiterUser.id,
      action: 'TAKE_ORDER',
      entityType: 'Order',
      entityId: order._id,
      oldValue: { orderStatus: 'READY' },
      newValue: { orderStatus: 'TAKEN_BY_WAITER', assignedWaiterId: waiterUser.id },
      ipAddress,
      userAgent,
    });

    // Broadcast
    socketEmitter.emitOrderTaken(updatedOrder);

    return updatedOrder.populate('tableId', 'tableNumber');
  }

  /**
   * Waiter delivers food to table (TAKEN_BY_WAITER -> DELIVERED -> COMPLETED)
   */
  async deliverOrder(orderId, waiterUser, ipAddress = '', userAgent = '') {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new NotFoundError('Order not found', 'ORDER_NOT_FOUND');
    }

    if (waiterUser.role !== 'OWNER' && order.branchId.toString() !== waiterUser.branchId.toString()) {
      throw new BadRequestError('Cannot deliver an order from another branch', 'BRANCH_MISMATCH');
    }

    // 1. Transition to DELIVERED
    const deliveredOrder = await transitionOrderStatus({
      order,
      nextStatus: 'DELIVERED',
      changedBy: waiterUser.id,
      changedByRole: waiterUser.role,
      reason: 'Waiter successfully delivered order to customer table',
    });

    // 2. Complete order lifecycle (DELIVERED -> COMPLETED)
    const completedOrder = await transitionOrderStatus({
      order: deliveredOrder,
      nextStatus: 'COMPLETED',
      changedBy: waiterUser.id,
      changedByRole: waiterUser.role,
      reason: 'Order completed upon successful delivery',
    });

    // Record audit
    await AuditLog.create({
      organizationId: order.organizationId,
      branchId: order.branchId,
      userId: waiterUser.id,
      action: 'DELIVER_ORDER',
      entityType: 'Order',
      entityId: order._id,
      oldValue: { orderStatus: 'TAKEN_BY_WAITER' },
      newValue: { orderStatus: 'COMPLETED' },
      ipAddress,
      userAgent,
    });

    // Broadcast
    socketEmitter.emitOrderDelivered(completedOrder);
    socketEmitter.emitOrderCompleted(completedOrder);

    return completedOrder.populate('tableId', 'tableNumber');
  }
}

module.exports = new WaiterService();
