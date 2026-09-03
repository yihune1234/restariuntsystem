const { getIO } = require('../config/socket');
const logger = require('../config/logger');
const SOCKET_EVENTS = require('./events');
const {
  getBranchRoom,
  getCashierRoom,
  getKitchenRoom,
  getWaiterRoom,
  getManagerRoom,
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

  /**
   * Emit order creation (sent to cashier room if UNPAID, or customer tracking)
   */
  emitOrderCreated(order) {
    const io = this.getIOInstance();
    if (!io) return;

    const payload = {
      orderId: order._id,
      orderNumber: order.orderNumber,
      branchId: order.branchId,
      tableId: order.tableId,
      total: order.total,
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
      createdAt: order.createdAt,
    };

    // Notify Cashiers of new order needing payment
    if (order.paymentStatus === 'UNPAID') {
      io.to(getCashierRoom(order.branchId.toString())).emit(SOCKET_EVENTS.ORDER_PAYMENT_REQUIRED, payload);
    }

    // Notify customer session room
    if (order.customerSessionId) {
      io.to(getCustomerSessionRoom(order.customerSessionId.toString())).emit(SOCKET_EVENTS.ORDER_CREATED, payload);
    }
  }

  /**
   * Emit order confirmed / payment successful (Notifies Kitchen and Customer)
   */
  emitOrderConfirmed(order) {
    const io = this.getIOInstance();
    if (!io) return;

    const payload = {
      orderId: order._id,
      orderNumber: order.orderNumber,
      branchId: order.branchId,
      tableId: order.tableId,
      items: order.items,
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
      confirmedAt: order.confirmedAt,
    };

    // CRITICAL: Kitchen only receives CONFIRMED & PAID orders
    io.to(getKitchenRoom(order.branchId.toString())).emit(SOCKET_EVENTS.ORDER_CONFIRMED, payload);
    io.to(getManagerRoom(order.branchId.toString())).emit(SOCKET_EVENTS.ORDER_CONFIRMED, payload);

    // Notify customer tracking room
    io.to(getOrderRoom(order._id.toString())).emit(SOCKET_EVENTS.ORDER_CONFIRMED, payload);
    if (order.customerSessionId) {
      io.to(getCustomerSessionRoom(order.customerSessionId.toString())).emit(SOCKET_EVENTS.ORDER_CONFIRMED, payload);
    }
  }

  /**
   * Emit kitchen started preparing
   */
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

  /**
   * Emit kitchen completed preparation -> Order READY for Waiter pickup
   */
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

    // Notify Waiters of food ready to pick up
    io.to(getWaiterRoom(order.branchId.toString())).emit(SOCKET_EVENTS.ORDER_READY, payload);
    io.to(getOrderRoom(order._id.toString())).emit(SOCKET_EVENTS.ORDER_READY, payload);

    if (order.customerSessionId) {
      io.to(getCustomerSessionRoom(order.customerSessionId.toString())).emit(SOCKET_EVENTS.ORDER_READY, payload);
    }
  }

  /**
   * Emit order taken by waiter
   */
  emitOrderTaken(order) {
    const io = this.getIOInstance();
    if (!io) return;

    const payload = {
      orderId: order._id,
      orderNumber: order.orderNumber,
      orderStatus: order.orderStatus,
      assignedWaiterId: order.assignedWaiterId,
    };

    io.to(getOrderRoom(order._id.toString())).emit(SOCKET_EVENTS.ORDER_TAKEN, payload);
    if (order.customerSessionId) {
      io.to(getCustomerSessionRoom(order.customerSessionId.toString())).emit(SOCKET_EVENTS.ORDER_TAKEN, payload);
    }
  }

  /**
   * Emit order delivered
   */
  emitOrderDelivered(order) {
    const io = this.getIOInstance();
    if (!io) return;

    const payload = {
      orderId: order._id,
      orderNumber: order.orderNumber,
      orderStatus: order.orderStatus,
      deliveredAt: order.deliveredAt,
    };

    io.to(getOrderRoom(order._id.toString())).emit(SOCKET_EVENTS.ORDER_DELIVERED, payload);
    if (order.customerSessionId) {
      io.to(getCustomerSessionRoom(order.customerSessionId.toString())).emit(SOCKET_EVENTS.ORDER_DELIVERED, payload);
    }
  }

  /**
   * Emit order status update event (used by waiters, kitchen, customers).
   * Emits the canonical order-status events so clients listening on
   * `order:preparing`, `order:ready`, etc. receive updates consistently.
   */
  emitOrderStatusUpdate(order) {
    const io = this.getIOInstance();
    if (!io) return;

    const payload = {
      orderId: order._id,
      orderNumber: order.orderNumber,
      orderStatus: order.orderStatus,
      orderStatusLabel: order.orderStatus, // For compatibility
      paymentStatus: order.paymentStatus,
      total: order.total,
      updatedAt: order.updatedAt || order.createdAt,
      customerSessionId: order.customerSessionId,
      branchId: order.branchId,
      tableId: order.tableId,
    };

    const eventByStatus = {
      CONFIRMED: SOCKET_EVENTS.ORDER_CONFIRMED,
      PREPARING: SOCKET_EVENTS.ORDER_PREPARING,
      READY: SOCKET_EVENTS.ORDER_READY,
      TAKEN_BY_WAITER: SOCKET_EVENTS.ORDER_TAKEN,
      DELIVERED: SOCKET_EVENTS.ORDER_DELIVERED,
      COMPLETED: SOCKET_EVENTS.ORDER_COMPLETED,
    };
    const eventName = eventByStatus[order.orderStatus];

    // Emit to customer session room for tracking
    if (order.customerSessionId) {
      io.to(getCustomerSessionRoom(order.customerSessionId.toString())).emit(
        eventName || 'order:status', payload
      );
    }

    // Emit to branch rooms for real-time updates
    io.to(getBranchRoom(order.branchId.toString())).emit(eventName || 'order:status', payload);
    io.to(getCashierRoom(order.branchId.toString())).emit(eventName || 'order:status', payload);
    io.to(getKitchenRoom(order.branchId.toString())).emit(eventName || 'order:status', payload);
    io.to(getWaiterRoom(order.branchId.toString())).emit(eventName || 'order:status', payload);

    // Emit to specific order room for targeted updates
    io.to(getOrderRoom(order._id.toString())).emit(eventName || 'order:status', payload);
  }

  /**
   * Emit newOrder event for frontend integration. Emits the canonical
   * `order:created` event (previously a raw `newOrder` string that clients no
   * longer listen on).
   */
  emitNewOrder(order) {
    const io = this.getIOInstance();
    if (!io) return;

    const payload = {
      orderId: order._id,
      orderNumber: order.orderNumber,
      branchId: order.branchId,
      tableId: order.tableId,
      total: order.total,
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
      createdAt: order.createdAt,
      customerSessionId: order.customerSessionId,
    };

    // Emit to cashier room for payment required
    io.to(getCashierRoom(order.branchId.toString())).emit(SOCKET_EVENTS.ORDER_CREATED, payload);

    // Emit to branch room for general notification
    io.to(getBranchRoom(order.branchId.toString())).emit(SOCKET_EVENTS.ORDER_CREATED, payload);
  }

  /**
   * Emit when a food item becomes sold out
   */
  emitFoodSoldOut(branchId, foodItemId, foodName) {
    const io = this.getIOInstance();
    if (!io) return;

    const payload = {
      foodItemId,
      foodName,
      status: 'SOLD_OUT',
      timestamp: new Date().toISOString(),
    };

    io.to(getBranchRoom(branchId.toString())).emit(SOCKET_EVENTS.FOOD_SOLD_OUT, payload);
    io.to(getManagerRoom(branchId.toString())).emit(SOCKET_EVENTS.FOOD_SOLD_OUT, payload);
  }

  /**
   * Emit when food item availability changes
   */
  emitFoodAvailabilityChanged(branchId, foodItemId, foodName, isAvailable) {
    const io = this.getIOInstance();
    if (!io) return;

    const payload = {
      foodItemId,
      foodName,
      isAvailable,
      timestamp: new Date().toISOString(),
    };

    io.to(getBranchRoom(branchId.toString())).emit(SOCKET_EVENTS.FOOD_AVAILABILITY_CHANGED, payload);
    io.to(getManagerRoom(branchId.toString())).emit(SOCKET_EVENTS.FOOD_AVAILABILITY_CHANGED, payload);
  }

  /**
   * Emit when stock is updated (received, deducted, wasted)
   */
  emitStockUpdated(branchId, stockData) {
    const io = this.getIOInstance();
    if (!io) return;

    const payload = {
      branchId,
      ...stockData,
      timestamp: new Date().toISOString(),
    };

    io.to(getBranchRoom(branchId.toString())).emit(SOCKET_EVENTS.STOCK_UPDATED, payload);
    io.to(getManagerRoom(branchId.toString())).emit(SOCKET_EVENTS.STOCK_UPDATED, payload);
  }

  /**
   * Emit when table status changes
   */
  emitTableStatusChanged(branchId, tableId, status, tableNumber, capacity, assignedWaiterId = null, waiterName = null) {
    const io = this.getIOInstance();
    if (!io) return;

    const payload = {
      tableId,
      tableNumber,
      status,
      capacity,
      assignedWaiterId: assignedWaiterId || null,
      waiterName: waiterName || null,
      timestamp: new Date().toISOString(),
    };

    io.to(getBranchRoom(branchId.toString())).emit(SOCKET_EVENTS.TABLE_STATUS_CHANGED, payload);
    io.to(getWaiterRoom(branchId.toString())).emit(SOCKET_EVENTS.TABLE_STATUS_CHANGED, payload);
    io.to(getManagerRoom(branchId.toString())).emit(SOCKET_EVENTS.TABLE_STATUS_CHANGED, payload);
  }

  /** Emit a dedicated table-waiter assignment change (for Manager/Owner + waiter). */
  emitTableAssignmentChanged({ branchId, tableId, tableNumber, waiterId, waiterName, assignedWaiterId }) {
    const io = this.getIOInstance();
    if (!io) return;

    const payload = {
      tableId,
      tableNumber,
      waiterId: waiterId || null,
      waiterName: waiterName || null,
      assignedWaiterId: assignedWaiterId || null,
      timestamp: new Date().toISOString(),
    };

    io.to(getBranchRoom(String(branchId))).emit(SOCKET_EVENTS.TABLE_ASSIGNMENT_CHANGED, payload);
    io.to(getWaiterRoom(String(branchId))).emit(SOCKET_EVENTS.TABLE_ASSIGNMENT_CHANGED, payload);
    io.to(getManagerRoom(String(branchId))).emit(SOCKET_EVENTS.TABLE_ASSIGNMENT_CHANGED, payload);
    io.to(getCashierRoom(String(branchId))).emit(SOCKET_EVENTS.TABLE_ASSIGNMENT_CHANGED, payload);
  }

  /**
   * Emit when payment is confirmed
   */
  emitPaymentConfirmed(orderId, branchId, amount, paymentMethod) {
    const io = this.getIOInstance();
    if (!io) return;

    const payload = {
      orderId,
      amount,
      paymentMethod,
      status: 'PAID',
      timestamp: new Date().toISOString(),
    };

    io.to(getBranchRoom(branchId.toString())).emit(SOCKET_EVENTS.PAYMENT_CONFIRMED, payload);
    io.to(getCashierRoom(branchId.toString())).emit(SOCKET_EVENTS.PAYMENT_CONFIRMED, payload);
    io.to(getManagerRoom(branchId.toString())).emit(SOCKET_EVENTS.PAYMENT_CONFIRMED, payload);
  }

  /**
   * Emit when order is completed
   */
  emitOrderCompleted(order) {
    const io = this.getIOInstance();
    if (!io) return;

    const payload = {
      orderId: order._id,
      orderNumber: order.orderNumber,
      branchId: order.branchId,
      tableId: order.tableId,
      orderStatus: order.orderStatus,
      total: order.total,
      completedAt: order.completedAt,
    };

    io.to(getBranchRoom(order.branchId.toString())).emit(SOCKET_EVENTS.ORDER_COMPLETED, payload);
    io.to(getOrderRoom(order._id.toString())).emit(SOCKET_EVENTS.ORDER_COMPLETED, payload);
    if (order.customerSessionId) {
      io.to(getCustomerSessionRoom(order.customerSessionId.toString())).emit(SOCKET_EVENTS.ORDER_COMPLETED, payload);
    }
  }

  /**
   * Emit when order is cancelled
   */
  emitOrderCancelled(orderId, branchId, orderNumber, reason) {
    const io = this.getIOInstance();
    if (!io) return;

    const payload = {
      orderId,
      orderNumber,
      branchId,
      orderStatus: 'CANCELLED',
      reason,
      cancelledAt: new Date().toISOString(),
    };

    io.to(getBranchRoom(branchId.toString())).emit(SOCKET_EVENTS.ORDER_CANCELLED, payload);
    io.to(getCashierRoom(branchId.toString())).emit(SOCKET_EVENTS.ORDER_CANCELLED, payload);
    io.to(getOrderRoom(orderId.toString())).emit(SOCKET_EVENTS.ORDER_CANCELLED, payload);
  }
}

module.exports = new SocketEmitter();
