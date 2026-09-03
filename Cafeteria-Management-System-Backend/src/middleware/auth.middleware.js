const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { getDefaultOrganizationId, getDefaultBranchId } = require('../config/singleBranch');
const { UnauthorizedError, ForbiddenError } = require('../utils/errors');
const { User } = require('../modules/users/user.model');
const CustomerSession = require('../modules/customer-sessions/customer-session.model');

/**
 * Authenticate staff user via JWT Bearer token
 *
 * In single-branch mode, if the user lacks an organizationId or branchId,
 * the default values are auto-resolved and injected into the request.
 */
const authenticateStaff = async (req, res, next) => {
  try {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new UnauthorizedError('Access token is missing. Please provide Authorization: Bearer <token>', 'NO_TOKEN_PROVIDED'));
    }

    const decoded = jwt.verify(token, config.jwt.accessSecret);

    // Verify user exists and is active
    const user = await User.findOne({ _id: decoded.id, isActive: true });
    if (!user) {
      return next(new UnauthorizedError('User belonging to this token no longer exists or is deactivated', 'USER_DEACTIVATED'));
    }

    let organizationId = user.organizationId ? user.organizationId.toString() : null;
    let branchId = user.branchId ? user.branchId.toString() : null;

    // Single-branch mode: auto-resolve missing org/branch IDs for all roles
    if (!organizationId) {
      organizationId = await getDefaultOrganizationId();
    }
    if (!branchId) {
      branchId = await getDefaultBranchId();
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId,
      branchId,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new UnauthorizedError('Access token has expired', 'TOKEN_EXPIRED'));
    }
    if (error.name === 'JsonWebTokenError') {
      return next(new UnauthorizedError('Invalid access token', 'INVALID_TOKEN'));
    }
    next(error);
  }
};

/**
 * Authenticate customer session via x-session-token header
 */
const authenticateCustomer = async (req, res, next) => {
  try {
    const sessionToken = req.headers['x-session-token'] || req.query.sessionToken;

    if (!sessionToken) {
      return next(new UnauthorizedError('Customer session token is missing. Please scan a table QR code.', 'MISSING_SESSION_TOKEN'));
    }

    // Lookup session token
    const session = await CustomerSession.findOne({
      sessionToken,
      isActive: true,
    }).populate('tableId', 'tableNumber branchId isActive');

    if (!session) {
      return next(new UnauthorizedError('Invalid or inactive customer session. Please scan QR code again.', 'INVALID_SESSION_TOKEN'));
    }

    if (new Date() > session.expiresAt) {
      session.isActive = false;
      await session.save();
      return next(new UnauthorizedError('Customer session has expired. Please re-scan table QR code.', 'SESSION_EXPIRED'));
    }

    req.customerSession = {
      id: session._id.toString(),
      sessionToken: session.sessionToken,
      branchId: session.branchId.toString(),
      tableId: session.tableId ? session.tableId._id.toString() : null,
      tableNumber: session.tableId ? session.tableId.tableNumber : null,
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Authenticate either staff (via Bearer token) or customer (via x-session-token)
 */
const authenticateAny = async (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return authenticateStaff(req, res, next);
  }
  if (req.headers['x-session-token'] || req.query.sessionToken) {
    return authenticateCustomer(req, res, next);
  }
  return next(new UnauthorizedError('Authentication required. Provide staff bearer token or customer session token.', 'UNAUTHORIZED'));
};

module.exports = {
  authenticateStaff,
  authenticateCustomer,
  authenticateAny,
};
