const { BadRequestError } = require('../../utils/errors');
const OrderStatusHistory = require('./order-status-history.model');

// Strict transition graph
const ALLOWED_TRANSITIONS = {
  WAITING_FOR_PAYMENT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['TAKEN_BY_WAITER', 'CANCELLED'],
  TAKEN_BY_WAITER: ['DELIVERED', 'CANCELLED'],
  DELIVERED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

/**
 * Validates whether an order transition from `currentStatus` to `nextStatus` is allowed
 */
const canTransition = (currentStatus, nextStatus) => {
  const allowedNext = ALLOWED_TRANSITIONS[currentStatus] || [];
  return allowedNext.includes(nextStatus);
};

/**
 * Transition order to a new state and record immutable audit history
 *
 * @param {object} params
 * @param {import('./order.model').Order} params.order - Mongoose order document
 * @param {string} params.nextStatus - Target order status
 * @param {string} [params.changedBy] - User ID who triggered transition
 * @param {string} [params.changedByRole] - Role of user ('KITCHEN', 'WAITER', 'CASHIER', 'MANAGER', 'SYSTEM')
 * @param {string} [params.reason] - Optional reason (e.g. cancellation notes)
 * @param {object} [params.metadata] - Extra context
 * @param {import('mongoose').ClientSession} [params.session] - MongoDB transaction session
 */
const transitionOrderStatus = async ({
  order,
  nextStatus,
  changedBy = null,
  changedByRole = 'SYSTEM',
  reason = '',
  metadata = {},
  session = null,
}) => {
  const currentStatus = order.orderStatus;

  if (currentStatus === nextStatus) {
    return order; // No-op if same state
  }

  if (!canTransition(currentStatus, nextStatus)) {
    throw new BadRequestError(
      `Invalid order status transition from '${currentStatus}' to '${nextStatus}'. Allowed transitions: ${ALLOWED_TRANSITIONS[currentStatus]?.join(', ') || 'None'}`,
      'INVALID_STATUS_TRANSITION'
    );
  }

  // Update timestamps based on target state
  const now = new Date();
  if (nextStatus === 'CONFIRMED') order.confirmedAt = now;
  if (nextStatus === 'PREPARING') order.preparedAt = now;
  if (nextStatus === 'READY') order.readyAt = now;
  if (nextStatus === 'DELIVERED') order.deliveredAt = now;
  if (nextStatus === 'COMPLETED') order.completedAt = now;
  if (nextStatus === 'CANCELLED') {
    order.cancelledAt = now;
    order.cancelReason = reason || 'Cancelled by staff or system';
  }

  order.orderStatus = nextStatus;
  await order.save({ session });

  // Record status history audit
  const historyDoc = new OrderStatusHistory({
    orderId: order._id,
    fromStatus: currentStatus,
    toStatus: nextStatus,
    changedBy,
    changedByRole,
    reason,
    metadata,
  });

  await historyDoc.save({ session });

  return order;
};

module.exports = {
  ALLOWED_TRANSITIONS,
  canTransition,
  transitionOrderStatus,
};
