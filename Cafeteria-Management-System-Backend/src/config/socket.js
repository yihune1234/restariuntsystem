const { Server } = require('socket.io');
const config = require('./env');
const logger = require('./logger');

let io = null;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: config.socketCorsOrigin,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  logger.info('Socket.IO initialized successfully');
  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO has not been initialized. Please call initSocket first.');
  }
  return io;
};

module.exports = {
  initSocket,
  getIO,
};
