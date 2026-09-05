const { getIO } = require('../config/socket');
const logger = require('../config/logger');
const SOCKET_EVENTS = require('./events');
const {
  getOrderRoom,
  getCustomerSessionRoom,
} = require('./rooms');

class SocketEmitter {
  getIOInstance() {
    try {
      return getIO();
    } catch (err) {
      return null;
    }
  }

  emitOrderCreated(order) {
    const io = this.getIOInstance();
    if (!io) return;

    const payload = {
      orderId: order._id,
      orderNumber: order.orderNumber,
      tableId: order.tableId,
      total: order.total,
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
      createdAt: order.createdAt,
    };

    io.emit(SOCKET_EVENTS.ORDER_CREATED, payload);
  }

  emitOrderConfirmed(order) {
    const io = this.getIOInstance();
    if (!io) return;

    const payload = {
      orderId: order._id,
      orderNumber: order.orderNumber,
      tableId: order.tableId,
      items: order.items,
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
      confirmedAt: order.confirmedAt,
    };

    io.emit(SOCKET_EVENTS.ORDER_CONFIRMED, payload);
  }

  emitOrderPreparing(order) {
    const io = this.getIOInstance();
    if (!io) return;

    const payload = {
      orderId: order._id,
      orderNumber: order.orderNumber,
      orderStatus: order.orderStatus,
      preparedAt: order.preparedAt,
    };

    io.to(getOrderRoom(order._id.toString())).emit(SOCKET_EVENTS.ORDER_PREPARING, payload);
    if (order.customerSessionId) {
      io.to(getCustomerSessionRoom(order.customerSessionId.toString())).emit(SOCKET_EVENTS.ORDER_PREPARING, payload);
    }
  }

  emitOrderReady(order) {
    const io = this.getIOInstance();
    if (!io) return;

    const payload = {
      orderId: order._id,
      orderNumber: order.orderNumber,
      tableId: order.tableId,
      orderStatus: order.orderStatus,
      readyAt: order.readyAt,
    };

    io.emit(SOCKET_EVENTS.ORDER_READY, payload);
    io.to(getOrderRoom(order._id.toString())).emit(SOCKET_EVENTS.ORDER_READY, payload);

    if (order.customerSessionId) {
      io.to(getCustomerSessionRoom(order.customerSessionId.toString())).emit(SOCKET_EVENTS.ORDER_READY, payload);
    }
  }

  emitOrderCompleted(order) {
    const io = this.getIOInstance();
    if (!io) return;

    const payload = {
      orderId: order._id,
      orderNumber: order.orderNumber,
      tableId: order.tableId,
      orderStatus: order.orderStatus,
      total: order.total,
      completedAt: order.completedAt,
    };

    io.emit(SOCKET_EVENTS.ORDER_COMPLETED, payload);
    io.to(getOrderRoom(order._id.toString())).emit(SOCKET_EVENTS.ORDER_COMPLETED, payload);
    if (order.customerSessionId) {
      io.to(getCustomerSessionRoom(order.customerSessionId.toString())).emit(SOCKET_EVENTS.ORDER_COMPLETED, payload);
    }
  }

  emitOrderCancelled(orderId, orderNumber, reason) {
    const io = this.getIOInstance();
    if (!io) return;

    const payload = {
      orderId,
      orderNumber,
      orderStatus: 'CANCELLED',
      reason,
      cancelledAt: new Date().toISOString(),
    };

    io.emit(SOCKET_EVENTS.ORDER_CANCELLED, payload);
    io.to(getOrderRoom(orderId.toString())).emit(SOCKET_EVENTS.ORDER_CANCELLED, payload);
  }

  emitMenuItemUpdated(item) {
    const io = this.getIOInstance();
    if (!io) return;
    io.emit(SOCKET_EVENTS.MENU_ITEM_UPDATED, {
      itemId: item._id,
      isAvailable: item.isAvailable,
      isActive: item.isActive,
      price: item.price,
      name: item.name,
      tags: item.tags,
    });
  }

  emitMenuItemCreated(item) {
    const io = this.getIOInstance();
    if (!io) return;
    io.emit(SOCKET_EVENTS.MENU_ITEM_CREATED, {
      itemId: item._id,
      categoryId: item.categoryId,
      name: item.name,
    });
  }

  emitMenuCategoryUpdated(category) {
    const io = this.getIOInstance();
    if (!io) return;
    io.emit(SOCKET_EVENTS.MENU_CATEGORY_UPDATED, {
      categoryId: category._id,
      name: category.name,
      isActive: category.isActive,
      displayOrder: category.displayOrder,
    });
  }
}

module.exports = new SocketEmitter();
