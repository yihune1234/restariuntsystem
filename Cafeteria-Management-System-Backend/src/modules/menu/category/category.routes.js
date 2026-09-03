const express = require('express');
const categoryController = require('./category.controller');
const {
  createCategorySchema,
  updateCategorySchema,
  categoryIdParamSchema,
} = require('./category.validation');
const validate = require('../../../middleware/validation.middleware');
const { authenticateStaff } = require('../../../middleware/auth.middleware');
const { requireRoles } = require('../../../middleware/role.middleware');
const { verifyBranchAccess } = require('../../../middleware/branch.middleware');

const categoryRouter = express.Router();
const branchCategoryRouter = express.Router({ mergeParams: true });

branchCategoryRouter.use(authenticateStaff);
categoryRouter.use(authenticateStaff);

/**
 * @openapi
 * /branches/{branchId}/categories:
 *   get:
 *     summary: List categories in a branch (optionally filter by mealPeriodId)
 *     tags:
 *       - Menu - Categories
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: branchId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: mealPeriodId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of categories
 */
branchCategoryRouter.get(
  '/',
  verifyBranchAccess,
  requireRoles('OWNER', 'MANAGER', 'CASHIER', 'WAITER'),
  categoryController.getCategoriesByBranch
);

/**
 * @openapi
 * /branches/{branchId}/categories:
 *   post:
 *     summary: Create new category within a meal period
 *     tags:
 *       - Menu - Categories
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
 *         description: Category created
 */
branchCategoryRouter.post(
  '/',
  validate(createCategorySchema),
  verifyBranchAccess,
  requireRoles('OWNER', 'MANAGER'),
  categoryController.createCategory
);

/**
 * @openapi
 * /categories/{id}:
 *   get:
 *     summary: Get category by ID
 *     tags:
 *       - Menu - Categories
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
 *         description: Category details
 */
categoryRouter.get(
  '/:id',
  validate(categoryIdParamSchema),
  requireRoles('OWNER', 'MANAGER'),
  categoryController.getCategoryById
);

/**
 * @openapi
 * /categories/{id}:
 *   patch:
 *     summary: Update category details
 *     tags:
 *       - Menu - Categories
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
 *         description: Category updated
 */
categoryRouter.patch(
  '/:id',
  validate(updateCategorySchema),
  requireRoles('OWNER', 'MANAGER'),
  categoryController.updateCategory
);

/**
 * @openapi
 * /categories/{id}:
 *   delete:
 *     summary: Soft delete category
 *     tags:
 *       - Menu - Categories
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
 *         description: Category deleted
 */
categoryRouter.delete(
  '/:id',
  validate(categoryIdParamSchema),
  requireRoles('OWNER', 'MANAGER'),
  categoryController.deleteCategory
);

module.exports = {
  categoryRouter,
  branchCategoryRouter,
};
