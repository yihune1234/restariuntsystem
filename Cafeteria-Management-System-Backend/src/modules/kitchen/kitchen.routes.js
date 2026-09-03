const express = require('express');
const kitchenController = require('./kitchen.controller');
const { orderIdParamSchema } = require('./kitchen.validation');
const validate = require('../../middleware/validation.middleware');
const { authenticateStaff } = require('../../middleware/auth.middleware');
const { requireRoles } = require('../../middleware/role.middleware');

const router = express.Router();

// Kitchen endpoints require staff authentication and KITCHEN, MANAGER, or OWNER role
router.use(authenticateStaff, requireRoles('OWNER', 'MANAGER', 'KITCHEN'));

/**
 * @openapi
 * /kitchen/orders:
 *   get:
 *     summary: Get confirmed and preparing orders in kitchen queue
 *     tags:
 *       - Kitchen
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of kitchen queue orders
 */
router.get('/orders', kitchenController.getKitchenQueue);

/**
 * @openapi
 * /kitchen/orders/{orderId}/start:
 *   post:
 *     summary: Kitchen marks order as PREPARING
 *     tags:
 *       - Kitchen
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
 *         description: Order transitioned to PREPARING
 */
router.post('/orders/:orderId/start', validate(orderIdParamSchema), kitchenController.startPreparation);

/**
 * @openapi
 * /kitchen/orders/{orderId}/ready:
 *   post:
 *     summary: Kitchen marks order as READY for waiter pickup
 *     tags:
 *       - Kitchen
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
 *         description: Order transitioned to READY and waiters notified
 */
router.post('/orders/:orderId/ready', validate(orderIdParamSchema), kitchenController.markReady);

module.exports = router;
