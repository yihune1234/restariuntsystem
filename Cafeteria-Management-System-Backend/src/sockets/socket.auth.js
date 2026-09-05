const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { User } = require('../modules/users/user.model');
const CustomerSession = require('../modules/customer-sessions/customer-session.model');
const logger = require('../config/logger');

/**
 * Socket.IO Handshake Authentication Middleware
 * Authenticates either:
 * 1. Staff users with Bearer JWT token
 * 2. Customers with x-session-token / sessionToken
 */
const socketAuthMiddleware = async (socket, next) => {
  try {
    const authHeader = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
    const sessionToken = socket.handshake.auth?.sessionToken || socket.handshake.headers?.['x-session-token'];

    // 1. Staff Authentication
    if (authHeader) {
      let token = authHeader;
      if (token.startsWith('Bearer ')) {
        token = token.slice(7).trim();
      }

      const decoded = jwt.verify(token, config.jwt.accessSecret);
      const user = await User.findOne({ _id: decoded.id, isActive: true });

      if (!user) {
        return next(new Error('Authentication failed: Staff user inactive or removed'));
      }

      socket.user = {
        id: user._id.toString(),
        name: user.name,
        role: user.role,
      };

      return next();
    }

    // 2. Customer Session Authentication
    if (sessionToken) {
      const session = await CustomerSession.findOne({
        sessionToken,
        isActive: true,
      });

      if (!session || new Date() > session.expiresAt) {
        return next(new Error('Authentication failed: Customer session invalid or expired'));
      }

      socket.customerSession = {
        id: session._id.toString(),
        sessionToken: session.sessionToken,
        tableId: session.tableId ? session.tableId.toString() : null,
      };

      return next();
    }

    return next(new Error('Authentication error: Provide staff token or customer session token'));
  } catch (error) {
    logger.warn(`Socket authentication error: ${error.message}`);
    return next(new Error(`Authentication failed: ${error.message}`));
  }
};

module.exports = socketAuthMiddleware;
