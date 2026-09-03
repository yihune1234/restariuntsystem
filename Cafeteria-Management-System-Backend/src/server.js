const http = require('http');
const app = require('./app');
const config = require('./config/env');
const logger = require('./config/logger');
const { connectDB, disconnectDB } = require('./config/database');
const { initSocket } = require('./config/socket');
const setupSocketServer = require('./sockets/socket.server');

const server = http.createServer(app);

// Initialize Socket.IO with HTTP Server
const io = initSocket(server);
setupSocketServer(io);

// Start server after connecting to MongoDB
const startServer = async () => {
  try {
    await connectDB();

    server.listen(config.port, () => {
      logger.info(`=======================================================`);
      logger.info(`🚀 Paperless Restaurant Backend Server running on port ${config.port}`);
      logger.info(`🌟 Environment: ${config.env}`);
      logger.info(`📚 Swagger API Docs: http://localhost:${config.port}/api-docs`);
      logger.info(`❤️  Health Check: http://localhost:${config.port}/api/v1/health`);
      logger.info(`=======================================================`);
    });
  } catch (error) {
    logger.error(`Fatal Server Startup Error: ${error.message}`);
    process.exit(1);
  }
};

// Graceful Shutdown Handler
const gracefulShutdown = async (signal) => {
  logger.warn(`Received ${signal}. Starting graceful shutdown...`);

  server.close(async () => {
    logger.info('HTTP Server closed.');

    // Close Socket.IO connections
    if (io) {
      io.close(() => {
        logger.info('Socket.IO connections closed.');
      });
    }

    // Disconnect MongoDB
    await disconnectDB();

    logger.info('Graceful shutdown completed. Exiting process.');
    process.exit(0);
  });

  // Force exit after 10s if connections don't close in time
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection at:', { promise, reason });
});

process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.message}`, { stack: error.stack });
  process.exit(1);
});

startServer();

module.exports = { app, server };
