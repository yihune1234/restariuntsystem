const express = require('express');
const orderController = require('./order.controller');
const {
  createOrderSchema,
  getBranchOrdersSchema,
  orderIdParamSchema,
  cancelOrderSchema,
  getOrdersBySecurityCodeSchema,
  securityCodeParamSchema,
} = require('./order.validation');
const validate = require('../../middleware/validation.middleware');
const {
  authenticateStaff,
  authenticateCustomer,
  authenticateAny,
} = require('../../middleware/auth.middleware');
const { paymentLimiter } = require('../../middleware/rate-limit.middleware');
const { requireRoles } = require('../../middleware/role.middleware');
const { verifyBranchAccess } = require('../../middleware/branch.middleware');

const orderRouter = express.Router();
const branchOrderRouter = express.Router({ mergeParams: true });

/**
 * @openapi
 * /orders:
 *   post:
 *     summary: Create order (Customer via QR session or Cashier staff)
 *     tags:
 *       - Orders
 *     security:
 *       - customerSessionAuth: []
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - branchId
 *               - tableId
 *               - items
 *             properties:
 *               branchId:
 *                 type: string
 *               tableId:
 *                 type: string
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - foodItemId
 *                     - quantity
 *                   properties:
 *                     foodItemId:
 *                       type: string
 *                     quantity:
 *                       type: integer
 *                     notes:
 *                       type: string
 *     responses:
 *       201:
 *         description: Order created with server-computed prices and orderNumber
 */
orderRouter.post('/', authenticateAny, validate(createOrderSchema), orderController.createOrder);

/**
 * @openapi
 * /orders/{orderId}:
 *   get:
 *     summary: Get order details by ID
 *     tags:
 *       - Orders
 *     security:
 *       - customerSessionAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order details
 */
orderRouter.get('/:orderId', authenticateAny, validate(orderIdParamSchema), orderController.getOrderById);

/**
 * @openapi
 * /orders/{orderId}/cancel:
 *   post:
 *     summary: Cancel order (Restores stock if already confirmed)
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Order cancelled
 */
orderRouter.post(
  '/:orderId/cancel',
  authenticateStaff,
  requireRoles('OWNER', 'MANAGER', 'CASHIER'),
  validate(cancelOrderSchema),
  orderController.cancelOrder
);

/**
 * @openapi
 * /branches/{branchId}/orders:
 *   get:
 *     summary: Query orders for a branch with filters and pagination (Staff)
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: branchId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: paymentStatus
 *         schema:
 *           type: string
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paginated orders list
 */
branchOrderRouter.get(
  '/',
  authenticateStaff,
  validate(getBranchOrdersSchema),
  verifyBranchAccess,
  requireRoles('OWNER', 'MANAGER', 'CASHIER', 'KITCHEN', 'WAITER'),
  orderController.getBranchOrders
);

branchOrderRouter.get(
  '/table/:tableId/session',
  authenticateStaff,
  verifyBranchAccess,
  requireRoles('OWNER', 'MANAGER', 'CASHIER', 'WAITER'),
  orderController.getTableSessionOrders
);

branchOrderRouter.get(
  '/table/:tableId/bill',
  authenticateStaff,
  verifyBranchAccess,
  requireRoles('OWNER', 'MANAGER', 'CASHIER', 'WAITER'),
  orderController.getTableBill
);

/**
 * @openapi
 * /branches/{branchId}/orders/code/{code}:
 *   get:
 *     summary: Staff lookup of the active order matching a 4-digit pickup code
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: branchId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^\d{4}$'
 *     responses:
 *       200:
 *         description: Active order(s) matching the pickup code
 */
branchOrderRouter.get(
  '/code/:code',
  authenticateStaff,
  validate(getOrdersBySecurityCodeSchema),
  verifyBranchAccess,
  requireRoles('OWNER', 'MANAGER', 'CASHIER', 'WAITER'),
  orderController.getOrdersBySecurityCode
);

/**
 * @openapi
 * /public/orders/code/{code}:
 *   get:
 *     summary: Public order tracking by 4-digit pickup code (no auth)
 *     description: >
 *       Lets a customer re-find their order with the pickup code shown after
 *       checkout when the tracking link is lost. Returns only minimal,
 *       non-sensitive order fields. Rate limited.
 *     tags:
 *       - Orders
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^\d{4}$'
 *     responses:
 *       200:
 *         description: Minimal public order status
 *       404:
 *         description: No active order with that code
 */
orderRouter.get(
  '/public/code/:code',
  paymentLimiter,
  validate(securityCodeParamSchema),
  orderController.getOrderBySecurityCodePublic
);

module.exports = {
  orderRouter,
  branchOrderRouter,
};
