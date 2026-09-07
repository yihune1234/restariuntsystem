const http = require('http');
const app = require('./app');
const config = require('./config/env');
const logger = require('./config/logger');
const { connectDB, disconnectDB } = require('./config/database');

const server = http.createServer(app);

const startServer = async () => {
  try {
    await connectDB();

    server.listen(config.port, '0.0.0.0', () => {
      logger.info(`=======================================================`);
      logger.info(`🚀 Faarees Digital Menu Backend running on port ${config.port}`);
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

const gracefulShutdown = async (signal) => {
  logger.warn(`Received ${signal}. Starting graceful shutdown...`);

  server.close(async () => {
    logger.info('HTTP Server closed.');
    await disconnectDB();
    logger.info('Graceful shutdown completed. Exiting process.');
    process.exit(0);
  });

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
