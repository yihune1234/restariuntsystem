const express = require('express');
const stockController = require('./stock.controller');
const {
  setStockSchema,
  bulkSetStockSchema,
  updateStockSchema,
  branchStockTodaySchema,
} = require('./stock.validation');
const validate = require('../../middleware/validation.middleware');
const { authenticateStaff } = require('../../middleware/auth.middleware');
const { requireRoles } = require('../../middleware/role.middleware');
const { verifyBranchAccess } = require('../../middleware/branch.middleware');

const stockRouter = express.Router();
const branchStockRouter = express.Router({ mergeParams: true });

branchStockRouter.use(authenticateStaff);
stockRouter.use(authenticateStaff);

/**
 * @openapi
 * /branches/{branchId}/stock/today:
 *   get:
 *     summary: Get today's food stock and depletion levels for branch
 *     tags:
 *       - Daily Food Stock
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: branchId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Stock levels for today
 */
branchStockRouter.get(
  '/today',
  validate(branchStockTodaySchema),
  verifyBranchAccess,
  requireRoles('OWNER', 'MANAGER', 'CASHIER', 'KITCHEN'),
  stockController.getTodayStock
);

/**
 * @openapi
 * /branches/{branchId}/stock:
 *   post:
 *     summary: Set or update daily prepared stock for a food item (Manager)
 *     tags:
 *       - Daily Food Stock
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: branchId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - foodItemId
 *               - preparedQuantity
 *             properties:
 *               foodItemId:
 *                 type: string
 *               preparedQuantity:
 *                 type: number
 *               lowStockThreshold:
 *                 type: number
 *     responses:
 *       200:
 *         description: Stock updated
 */
branchStockRouter.post(
  '/',
  validate(setStockSchema),
  verifyBranchAccess,
  requireRoles('OWNER', 'MANAGER'),
  stockController.setStock
);

/**
 * @openapi
 * /branches/{branchId}/stock/bulk:
 *   post:
 *     summary: Bulk initialize daily prepared stock for multiple food items
 *     tags:
 *       - Daily Food Stock
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: branchId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Stock list updated
 */
branchStockRouter.post(
  '/bulk',
  validate(bulkSetStockSchema),
  verifyBranchAccess,
  requireRoles('OWNER', 'MANAGER'),
  stockController.bulkSetStock
);

/**
 * @openapi
 * /stock/{stockId}:
 *   patch:
 *     summary: Update stock record
 *     tags:
 *       - Daily Food Stock
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: stockId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Stock updated
 */
stockRouter.patch(
  '/:stockId',
  validate(updateStockSchema),
  requireRoles('OWNER', 'MANAGER'),
  stockController.updateStock
);

module.exports = {
  stockRouter,
  branchStockRouter,
};
