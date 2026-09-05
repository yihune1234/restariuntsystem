const { BadRequestError } = require('../../utils/errors');

const ALLOWED_TRANSITIONS = {
  PENDING: ['PREPARING', 'CANCELLED'],
  WAITING_FOR_PAYMENT: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

const canTransition = (currentStatus, nextStatus) => {
  const allowedNext = ALLOWED_TRANSITIONS[currentStatus] || [];
  return allowedNext.includes(nextStatus);
};

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
    return order;
  }

  if (!canTransition(currentStatus, nextStatus)) {
    throw new BadRequestError(
      `Invalid order status transition from '${currentStatus}' to '${nextStatus}'. Allowed transitions: ${ALLOWED_TRANSITIONS[currentStatus]?.join(', ') || 'None'}`,
      'INVALID_STATUS_TRANSITION'
    );
  }

  const now = new Date();
  if (nextStatus === 'PREPARING') order.preparedAt = now;
  if (nextStatus === 'READY') order.readyAt = now;
  if (nextStatus === 'COMPLETED') order.completedAt = now;
  if (nextStatus === 'CANCELLED') {
    order.cancelledAt = now;
    order.cancelReason = reason || 'Cancelled by staff or system';
  }

  order.orderStatus = nextStatus;
  await order.save({ session });

  return order;
};

module.exports = {
  ALLOWED_TRANSITIONS,
  canTransition,
  transitionOrderStatus,
};
