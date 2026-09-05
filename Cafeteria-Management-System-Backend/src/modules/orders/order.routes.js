const express = require('express');
const orderController = require('./order.controller');
const {
  createOrderSchema,
  orderIdParamSchema,
  cancelOrderSchema,
  securityCodeParamSchema,
} = require('./order.validation');
const validate = require('../../middleware/validation.middleware');
const {
  authenticateStaff,
  authenticateAny,
} = require('../../middleware/auth.middleware');
const { paymentLimiter } = require('../../middleware/rate-limit.middleware');
const { requireRoles } = require('../../middleware/role.middleware');

const orderRouter = express.Router();

orderRouter.post('/', authenticateAny, validate(createOrderSchema), orderController.createOrder);

orderRouter.get('/:orderId', authenticateAny, validate(orderIdParamSchema), orderController.getOrderById);

orderRouter.get('/', authenticateStaff, requireRoles('OWNER', 'MANAGER', 'CASHIER', 'KITCHEN'), orderController.getOrders);

orderRouter.post(
  '/:orderId/cancel',
  authenticateStaff,
  requireRoles('OWNER', 'MANAGER', 'CASHIER'),
  validate(cancelOrderSchema),
  orderController.cancelOrder
);

orderRouter.post(
  '/:orderId/complete',
  authenticateStaff,
  requireRoles('OWNER', 'MANAGER', 'CASHIER'),
  validate(orderIdParamSchema),
  orderController.completeOrder
);

orderRouter.get(
  '/public/code/:code',
  paymentLimiter,
  validate(securityCodeParamSchema),
  orderController.getOrderBySecurityCodePublic
);

module.exports = {
  orderRouter,
};
