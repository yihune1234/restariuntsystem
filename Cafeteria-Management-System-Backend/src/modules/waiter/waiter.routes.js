const express = require('express');
const waiterController = require('./waiter.controller');
const { orderIdParamSchema } = require('./waiter.validation');
const validate = require('../../middleware/validation.middleware');
const { authenticateStaff } = require('../../middleware/auth.middleware');
const { requireRoles } = require('../../middleware/role.middleware');

const router = express.Router();

// Waiter endpoints require staff authentication and WAITER, MANAGER, or OWNER role
router.use(authenticateStaff, requireRoles('OWNER', 'MANAGER', 'WAITER'));

/**
 * @openapi
 * /waiter/orders/ready:
 *   get:
 *     summary: View ready orders waiting for waiter pickup and delivery
 *     tags:
 *       - Waiter
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of ready orders
 */
router.get('/orders/ready', waiterController.getReadyOrders);

/**
 * @openapi
 * /waiter/orders/{orderId}/take:
 *   post:
 *     summary: Waiter takes order to deliver to customer table
 *     tags:
 *       - Waiter
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order transitioned to TAKEN_BY_WAITER
 */
router.post('/orders/:orderId/take', validate(orderIdParamSchema), waiterController.takeOrder);

/**
 * @openapi
 * /waiter/orders/{orderId}/deliver:
 *   post:
 *     summary: Waiter delivers order to table (Marks DELIVERED & COMPLETED)
 *     tags:
 *       - Waiter
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order transitioned to DELIVERED and COMPLETED
 */
router.post('/orders/:orderId/deliver', validate(orderIdParamSchema), waiterController.deliverOrder);

module.exports = router;
