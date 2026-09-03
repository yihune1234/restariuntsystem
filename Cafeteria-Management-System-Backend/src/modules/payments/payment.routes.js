const express = require('express');
const paymentController = require('./payment.controller');
const {
  initiateChapaSchema,
  verifyChapaSchema,
  confirmCashierPaymentSchema,
  orderIdParamSchema,
} = require('./payment.validation');
const validate = require('../../middleware/validation.middleware');
const {
  authenticateStaff,
  authenticateCustomer,
  authenticateAny,
} = require('../../middleware/auth.middleware');
const { requireRoles } = require('../../middleware/role.middleware');
const { paymentLimiter } = require('../../middleware/rate-limit.middleware');

const paymentRouter = express.Router();
const orderPaymentRouter = express.Router({ mergeParams: true });

/**
 * @openapi
 * /payments/chapa/webhook:
 *   post:
 *     summary: Chapa IPN / Webhook notification endpoint
 *     tags:
 *       - Payments
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tx_ref:
 *                 type: string
 *     responses:
 *       200:
 *         description: Webhook processed
 */
paymentRouter.post('/chapa/webhook', paymentController.handleChapaWebhook);

/**
 * @openapi
 * /payments/chapa/verify:
 *   post:
 *     summary: Server-side Chapa payment verification and idempotency check
 *     tags:
 *       - Payments
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
 *               - transactionReference
 *             properties:
 *               transactionReference:
 *                 type: string
 *     responses:
 *       200:
 *         description: Verified payment details
 */
paymentRouter.post(
  '/chapa/verify',
  paymentLimiter,
  validate(verifyChapaSchema),
  paymentController.verifyChapa
);

/**
 * @openapi
 * /orders/{orderId}/payment/chapa/initiate:
 *   post:
 *     summary: Initiate Chapa online checkout session for an order
 *     tags:
 *       - Payments
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
 *         description: Checkout URL generated
 */
orderPaymentRouter.post(
  '/chapa/initiate',
  paymentLimiter,
  authenticateAny,
  validate(initiateChapaSchema),
  paymentController.initiateChapa
);

/**
 * @openapi
 * /orders/{orderId}/payment/confirm:
 *   post:
 *     summary: Cashier confirms payment received (Cash or POS Card)
 *     tags:
 *       - Payments
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
 *               paymentMethod:
 *                 type: string
 *                 enum: [CASH, CARD]
 *                 default: CASH
 *     responses:
 *       200:
 *         description: Payment confirmed and order sent to kitchen
 */
orderPaymentRouter.post(
  '/confirm',
  authenticateStaff,
  requireRoles('OWNER', 'MANAGER', 'CASHIER'),
  validate(confirmCashierPaymentSchema),
  paymentController.confirmCashierPayment
);

/**
 * @openapi
 * /orders/{orderId}/payment:
 *   get:
 *     summary: Get payment details for an order
 *     tags:
 *       - Payments
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
 *         description: Payment details
 */
orderPaymentRouter.get(
  '/',
  authenticateAny,
  validate(orderIdParamSchema),
  paymentController.getOrderPayment
);

module.exports = {
  paymentRouter,
  orderPaymentRouter,
};
