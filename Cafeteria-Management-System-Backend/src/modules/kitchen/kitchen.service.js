const { Order } = require('../orders/order.model');
const { transitionOrderStatus } = require('../orders/order-state-machine');
const socketEmitter = require('../../sockets/socket.emitter');
const { NotFoundError, BadRequestError } = require('../../utils/errors');

class KitchenService {
  async getKitchenQueue() {
    const orders = await Order.find({
      paymentStatus: 'PAID',
      orderStatus: { $in: ['PENDING', 'PREPARING'] },
    })
      .populate('tableId', 'tableNumber capacity')
      .sort({ createdAt: 1 });

    return orders;
  }

  async startPreparation(orderId, staffUser) {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new NotFoundError('Order not found', 'ORDER_NOT_FOUND');
    }

    if (order.orderStatus !== 'PENDING') {
      throw new BadRequestError('Only PENDING orders can be started', 'INVALID_ORDER_STATUS');
    }

    const updatedOrder = await transitionOrderStatus({
      order,
      nextStatus: 'PREPARING',
      changedBy: staffUser.id,
      changedByRole: staffUser.role,
    });

    socketEmitter.emitOrderPreparing(updatedOrder);

    return updatedOrder.populate('tableId', 'tableNumber');
  }

  async markReady(orderId, staffUser) {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new NotFoundError('Order not found', 'ORDER_NOT_FOUND');
    }

    if (order.orderStatus !== 'PREPARING') {
      throw new BadRequestError('Only PREPARING orders can be marked ready', 'INVALID_ORDER_STATUS');
    }

    const updatedOrder = await transitionOrderStatus({
      order,
      nextStatus: 'READY',
      changedBy: staffUser.id,
      changedByRole: staffUser.role,
    });

    socketEmitter.emitOrderReady(updatedOrder);

    return updatedOrder.populate('tableId', 'tableNumber');
  }
}

module.exports = new KitchenService();
