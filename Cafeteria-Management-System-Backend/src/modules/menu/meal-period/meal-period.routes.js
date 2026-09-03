const express = require('express');
const mealPeriodController = require('./meal-period.controller');
const {
  createMealPeriodSchema,
  updateMealPeriodSchema,
  mealPeriodIdParamSchema,
} = require('./meal-period.validation');
const validate = require('../../../middleware/validation.middleware');
const { authenticateStaff } = require('../../../middleware/auth.middleware');
const { requireRoles } = require('../../../middleware/role.middleware');
const { verifyBranchAccess } = require('../../../middleware/branch.middleware');

const mealPeriodRouter = express.Router();
const branchMealPeriodRouter = express.Router({ mergeParams: true });

branchMealPeriodRouter.use(authenticateStaff);
mealPeriodRouter.use(authenticateStaff);

/**
 * @openapi
 * /branches/{branchId}/meal-periods:
 *   get:
 *     summary: List meal periods for a branch
 *     tags:
 *       - Menu - Meal Periods
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
 *         description: List of meal periods
 */
branchMealPeriodRouter.get(
  '/',
  verifyBranchAccess,
  requireRoles('OWNER', 'MANAGER', 'CASHIER', 'WAITER'),
  mealPeriodController.getMealPeriodsByBranch
);

/**
 * @openapi
 * /branches/{branchId}/meal-periods:
 *   post:
 *     summary: Create meal period (e.g. BREAKFAST, LUNCH, DINNER)
 *     tags:
 *       - Menu - Meal Periods
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: branchId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Meal period created
 */
branchMealPeriodRouter.post(
  '/',
  validate(createMealPeriodSchema),
  verifyBranchAccess,
  requireRoles('OWNER', 'MANAGER'),
  mealPeriodController.createMealPeriod
);

/**
 * @openapi
 * /meal-periods/{id}:
 *   get:
 *     summary: Get meal period by ID
 *     tags:
 *       - Menu - Meal Periods
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Meal period details
 */
mealPeriodRouter.get(
  '/:id',
  validate(mealPeriodIdParamSchema),
  requireRoles('OWNER', 'MANAGER'),
  mealPeriodController.getMealPeriodById
);

/**
 * @openapi
 * /meal-periods/{id}:
 *   patch:
 *     summary: Update meal period
 *     tags:
 *       - Menu - Meal Periods
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Meal period updated
 */
mealPeriodRouter.patch(
  '/:id',
  validate(updateMealPeriodSchema),
  requireRoles('OWNER', 'MANAGER'),
  mealPeriodController.updateMealPeriod
);

/**
 * @openapi
 * /meal-periods/{id}:
 *   delete:
 *     summary: Soft delete meal period
 *     tags:
 *       - Menu - Meal Periods
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Meal period deleted
 */
mealPeriodRouter.delete(
  '/:id',
  validate(mealPeriodIdParamSchema),
  requireRoles('OWNER', 'MANAGER'),
  mealPeriodController.deleteMealPeriod
);

module.exports = {
  mealPeriodRouter,
  branchMealPeriodRouter,
};
