const socketAuthMiddleware = require('./socket.auth');
const logger = require('../config/logger');
const {
  getBranchRoom,
  getCashierRoom,
  getKitchenRoom,
  getWaiterRoom,
  getManagerRoom,
  getOrderRoom,
  getCustomerSessionRoom,
} = require('./rooms');
const { Order } = require('../modules/orders/order.model');

/**
 * Configure Socket.IO server with authentication and secured room routing
 */
const setupSocketServer = (io) => {
  // Apply handshake authentication
  io.use(socketAuthMiddleware);

  io.on('connection', async (socket) => {
    // 1. Handle Staff Connection
    if (socket.user) {
      const { id, role, branchId, name } = socket.user;
      logger.info(`Staff socket connected: ${name} (${role}) - Socket ID: ${socket.id}`);

      if (branchId) {
        // Join generic branch room
        socket.join(getBranchRoom(branchId));

        // Join role-specific rooms
        if (role === 'OWNER' || role === 'MANAGER') {
          socket.join(getManagerRoom(branchId));
          socket.join(getCashierRoom(branchId));
          socket.join(getKitchenRoom(branchId));
          socket.join(getWaiterRoom(branchId));
        } else if (role === 'CASHIER') {
          socket.join(getCashierRoom(branchId));
        } else if (role === 'KITCHEN') {
          socket.join(getKitchenRoom(branchId));
        } else if (role === 'WAITER') {
          socket.join(getWaiterRoom(branchId));
        }
      }
    }

    // 2. Handle Customer Session Connection
    if (socket.customerSession) {
      const { id: sessionId, branchId, tableId } = socket.customerSession;
      logger.info(`Customer socket connected: Session ${sessionId} (Table: ${tableId}) - Socket ID: ${socket.id}`);

      // Customer joins their own session room
      socket.join(getCustomerSessionRoom(sessionId));

      // Allow customer to subscribe to their specific order tracking room
      socket.on('order:track', async ({ orderId }) => {
        try {
          const order = await Order.findOne({
            _id: orderId,
            customerSessionId: sessionId,
          });

          if (order) {
            socket.join(getOrderRoom(orderId));
            logger.info(`Customer joined tracking room for order ${order.orderNumber}`);
            socket.emit('order:track:success', { orderId, orderNumber: order.orderNumber });
          } else {
            socket.emit('order:track:error', { message: 'Order not found in this session' });
          }
        } catch (err) {
          socket.emit('order:track:error', { message: 'Failed to join tracking room' });
        }
      });
    }

    socket.on('disconnect', (reason) => {
      logger.debug(`Socket disconnected: ${socket.id} (${reason})`);
    });
  });
};

module.exports = setupSocketServer;
