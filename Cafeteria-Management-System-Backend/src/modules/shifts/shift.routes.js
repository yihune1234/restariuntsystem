const express = require('express');
const shiftController = require('./shift.controller');
const {
  startShiftSchema,
  endShiftSchema,
  getBranchShiftsSchema,
} = require('./shift.validation');
const validate = require('../../middleware/validation.middleware');
const { authenticateStaff } = require('../../middleware/auth.middleware');
const { requireRoles } = require('../../middleware/role.middleware');
const { verifyBranchAccess } = require('../../middleware/branch.middleware');

const shiftRouter = express.Router();
const branchShiftRouter = express.Router({ mergeParams: true });

shiftRouter.use(authenticateStaff);
branchShiftRouter.use(authenticateStaff);

/**
 * @openapi
 * /shifts/start:
 *   post:
 *     summary: Staff clocks in / opens shift
 *     tags:
 *       - Shifts
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               startingCash:
 *                 type: number
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Shift started
 */
shiftRouter.post('/start', validate(startShiftSchema), shiftController.startShift);

/**
 * @openapi
 * /shifts/end:
 *   post:
 *     summary: Staff clocks out / closes shift with cash reconciliation
 *     tags:
 *       - Shifts
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               closingCash:
 *                 type: number
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Shift closed
 */
shiftRouter.post('/end', validate(endShiftSchema), shiftController.endShift);

/**
 * @openapi
 * /shifts/active:
 *   get:
 *     summary: Get current authenticated staff active shift
 *     tags:
 *       - Shifts
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current shift info
 */
shiftRouter.get('/active', shiftController.getActiveShift);

/**
 * @openapi
 * /branches/{branchId}/shifts:
 *   get:
 *     summary: List all staff shifts for a branch (Manager/Owner)
 *     tags:
 *       - Shifts
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
 *         description: List of shifts
 */
branchShiftRouter.get(
  '/',
  validate(getBranchShiftsSchema),
  verifyBranchAccess,
  requireRoles('OWNER', 'MANAGER'),
  shiftController.getBranchShifts
);

module.exports = {
  shiftRouter,
  branchShiftRouter,
};
