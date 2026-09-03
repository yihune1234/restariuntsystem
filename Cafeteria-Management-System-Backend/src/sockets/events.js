/**
 * Socket.IO Event Constants
 */

const SOCKET_EVENTS = {
  // Order Lifecycle Events
  ORDER_CREATED: 'order:created',
  ORDER_PAYMENT_REQUIRED: 'order:payment-required',
  PAYMENT_CONFIRMED: 'payment:confirmed',
  ORDER_CONFIRMED: 'order:confirmed',
  ORDER_PREPARING: 'order:preparing',
  ORDER_READY: 'order:ready',
  ORDER_TAKEN: 'order:taken',
  ORDER_DELIVERED: 'order:delivered',
  ORDER_COMPLETED: 'order:completed',
  ORDER_CANCELLED: 'order:cancelled',

  // Menu & Stock Events
  FOOD_SOLD_OUT: 'food:sold-out',
  FOOD_AVAILABILITY_CHANGED: 'food:availability-changed',
  STOCK_UPDATED: 'stock:updated',

  // Table Events
  TABLE_STATUS_CHANGED: 'table:status-changed',
  TABLE_ASSIGNMENT_CHANGED: 'table:assignment-changed',
};

module.exports = SOCKET_EVENTS;
