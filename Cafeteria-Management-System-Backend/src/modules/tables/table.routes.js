const express = require('express');
const tableController = require('./table.controller');
const branchController = require('../branches/branch.controller');
const {
  createTableSchema,
  updateTableSchema,
  tableIdParamSchema,
  qrTokenParamSchema,
  assignWaiterSchema,
  occupancySchema,
} = require('./table.validation');
const validate = require('../../middleware/validation.middleware');
const { authenticateStaff } = require('../../middleware/auth.middleware');
const { requireRoles } = require('../../middleware/role.middleware');
const { verifyBranchAccess } = require('../../middleware/branch.middleware');

const tableRouter = express.Router();
const branchTableRouter = express.Router({ mergeParams: true });
const publicQrRouter = express.Router();
const publicBranchesRouter = express.Router();

/**
 * @openapi
 * /public/branches:
 *   get:
 *     summary: Public listing of all active branches (no auth)
 *     tags: [Public]
 *     responses:
 *       200:
 *         description: List of active branches for the marketing landing page
 */
publicBranchesRouter.get('/', branchController.listPublicBranches);

/**
 * @openapi
 * /public/qr/{qrToken}:
 *   get:
 *     summary: Public endpoint - Validate table QR code scanned by customer
 *     tags:
 *       - Public
 *     parameters:
 *       - in: path
 *         name: qrToken
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: QR is valid and returns table and branch context
 *       404:
 *         description: Invalid or expired QR code
 */
publicQrRouter.get('/:qrToken', validate(qrTokenParamSchema), tableController.validateQR);

// Branch staff routes
branchTableRouter.use(authenticateStaff);
tableRouter.use(authenticateStaff);

/**
 * @openapi
 * /branches/{branchId}/tables:
 *   get:
 *     summary: List all tables in a branch
 *     tags:
 *       - Tables
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
 *         description: List of tables
 */
branchTableRouter.get(
  '/',
  verifyBranchAccess,
  requireRoles('OWNER', 'MANAGER', 'CASHIER', 'WAITER'),
  tableController.getTablesByBranch
);

/**
 * @openapi
 * /branches/{branchId}/tables:
 *   post:
 *     summary: Create a new table with secure QR token
 *     tags:
 *       - Tables
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
 *               - tableNumber
 *             properties:
 *               tableNumber:
 *                 type: string
 *               capacity:
 *                 type: number
 *                 default: 4
 *     responses:
 *       201:
 *         description: Table created
 */
branchTableRouter.post(
  '/',
  validate(createTableSchema),
  verifyBranchAccess,
  requireRoles('OWNER', 'MANAGER'),
  tableController.createTable
);

/**
 * @openapi
 * /tables/{tableId}:
 *   get:
 *     summary: Get single table details
 *     tags:
 *       - Tables
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tableId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Table details
 */
tableRouter.get(
  '/:tableId',
  validate(tableIdParamSchema),
  requireRoles('OWNER', 'MANAGER', 'CASHIER', 'WAITER'),
  tableController.getTableById
);

/**
 * @openapi
 * /tables/{tableId}:
 *   patch:
 *     summary: Update table info or status
 *     tags:
 *       - Tables
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tableId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Table updated
 */
tableRouter.patch(
  '/:tableId',
  validate(updateTableSchema),
  requireRoles('OWNER', 'MANAGER', 'WAITER'),
  tableController.updateTable
);

/**
 * @openapi
 * /tables/{tableId}:
 *   delete:
 *     summary: Deactivate/Archive a table (soft delete)
 *     tags:
 *       - Tables
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tableId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Table deactivated
 *       400:
 *         description: Cannot delete table with active orders
 */
tableRouter.delete(
  '/:tableId',
  validate(tableIdParamSchema),
  requireRoles('OWNER', 'MANAGER'),
  tableController.deactivateTable
);

/**
 * @openapi
 * /tables/{tableId}/regenerate-qr:
 *   post:
 *     summary: Regenerate secure QR token for a table
 *     tags:
 *       - Tables
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tableId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: New QR token generated
 */
tableRouter.post(
  '/:tableId/regenerate-qr',
  validate(tableIdParamSchema),
  requireRoles('OWNER', 'MANAGER'),
  tableController.regenerateQR
);

/**
 * @openapi
 * /tables/{tableId}/assign-waiter:
 *   post:
 *     summary: Assign or unassign the responsible waiter for a table
 *     security:
 *       - bearerAuth: []
 */
tableRouter.post(
  '/:tableId/assign-waiter',
  validate(assignWaiterSchema),
  requireRoles('OWNER', 'MANAGER', 'WAITER'),
  tableController.assignWaiter
);

/**
 * @openapi
 * /tables/{tableId}/occupancy:
 *   post:
 *     summary: Update seated customer count for a table (staff-only)
 *     security:
 *       - bearerAuth: []
 */
tableRouter.post(
  '/:tableId/occupancy',
  validate(occupancySchema),
  requireRoles('OWNER', 'MANAGER', 'WAITER', 'CASHIER'),
  tableController.updateOccupancy
);

/**
 * @openapi
 * /tables/{tableId}/clear:
 *   post:
 *     summary: Waiter confirms customer left — the only path back to AVAILABLE
 *     security:
 *       - bearerAuth: []
 */
tableRouter.post(
  '/:tableId/clear',
  validate(tableIdParamSchema),
  requireRoles('OWNER', 'MANAGER', 'WAITER'),
  tableController.clearTable
);

/**
 * @openapi
 * /branches/{branchId}/tables/bulk-assign-waiters:
 *   post:
 *     summary: Assign one waiter to (or unassign across) multiple tables at once (Manager/Owner)
 *     security:
 *       - bearerAuth: []
 */
branchTableRouter.post(
  '/bulk-assign-waiters',
  requireRoles('OWNER', 'MANAGER'),
  tableController.bulkAssignWaiters
);

module.exports = {
  tableRouter,
  branchTableRouter,
  publicQrRouter,
  publicBranchesRouter,
};
