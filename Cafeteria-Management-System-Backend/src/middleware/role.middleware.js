const { ForbiddenError, UnauthorizedError } = require('../utils/errors');

/**
 * Restrict endpoint access to specified roles
 * @param  {...string} allowedRoles - e.g. 'OWNER', 'MANAGER', 'CASHIER', 'KITCHEN', 'WAITER'
 */
const requireRoles = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return next(new UnauthorizedError('Authentication required prior to role verification', 'UNAUTHORIZED'));
  }

  if (!allowedRoles.includes(req.user.role)) {
    return next(
      new ForbiddenError(
        `Access denied. Role '${req.user.role}' is not authorized to access this resource. Required role(s): ${allowedRoles.join(', ')}`,
        'INSUFFICIENT_PERMISSIONS'
      )
    );
  }

  next();
};

module.exports = {
  requireRoles,
};
