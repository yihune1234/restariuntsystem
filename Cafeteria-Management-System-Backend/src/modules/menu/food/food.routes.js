const express = require('express');
const foodController = require('./food.controller');
const {
  createFoodSchema,
  updateFoodSchema,
  foodIdParamSchema,
} = require('./food.validation');
const validate = require('../../../middleware/validation.middleware');
const { authenticateStaff } = require('../../../middleware/auth.middleware');
const { requireRoles } = require('../../../middleware/role.middleware');
const { verifyBranchAccess } = require('../../../middleware/branch.middleware');

const foodRouter = express.Router();
const branchFoodRouter = express.Router({ mergeParams: true });

branchFoodRouter.use(authenticateStaff);
foodRouter.use(authenticateStaff);

/**
 * @openapi
 * /branches/{branchId}/food-items:
 *   get:
 *     summary: List all food items in a branch (Manager/Staff)
 *     tags:
 *       - Menu - Food Items
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: branchId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of food items
 */
branchFoodRouter.get(
  '/',
  verifyBranchAccess,
  requireRoles('OWNER', 'MANAGER', 'CASHIER', 'KITCHEN', 'WAITER'),
  foodController.getFoodItemsByBranch
);

/**
 * @openapi
 * /branches/{branchId}/food-items:
 *   post:
 *     summary: Create new food item
 *     tags:
 *       - Menu - Food Items
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
 *               - categoryId
 *               - name
 *               - price
 *             properties:
 *               categoryId:
 *                 type: string
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               preparationTimeMinutes:
 *                 type: number
 *     responses:
 *       201:
 *         description: Food item created
 */
branchFoodRouter.post(
  '/',
  validate(createFoodSchema),
  verifyBranchAccess,
  requireRoles('OWNER', 'MANAGER'),
  foodController.createFood
);

/**
 * @openapi
 * /food-items/{foodId}:
 *   get:
 *     summary: Get single food item details
 *     tags:
 *       - Menu - Food Items
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: foodId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Food item details
 */
foodRouter.get(
  '/:foodId',
  validate(foodIdParamSchema),
  requireRoles('OWNER', 'MANAGER', 'CASHIER', 'KITCHEN', 'WAITER'),
  foodController.getFoodItemById
);

/**
 * @openapi
 * /food-items/{foodId}:
 *   patch:
 *     summary: Update food item details or price
 *     tags:
 *       - Menu - Food Items
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: foodId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Food item updated
 */
foodRouter.patch(
  '/:foodId',
  validate(updateFoodSchema),
  requireRoles('OWNER', 'MANAGER'),
  foodController.updateFoodItem
);

/**
 * @openapi
 * /food-items/{foodId}:
 *   delete:
 *     summary: Soft delete food item
 *     tags:
 *       - Menu - Food Items
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: foodId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Food item deleted
 */
foodRouter.delete(
  '/:foodId',
  validate(foodIdParamSchema),
  requireRoles('OWNER', 'MANAGER'),
  foodController.deleteFoodItem
);

/**
 * @openapi
 * /food-items/{foodId}/image:
 *   delete:
 *     summary: Remove food image and clean up Cloudinary storage
 *     tags:
 *       - Menu - Food Items
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: foodId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Food image removed
 */
foodRouter.delete(
  '/:foodId/image',
  validate(foodIdParamSchema),
  requireRoles('OWNER', 'MANAGER'),
  foodController.removeImage
);

module.exports = {
  foodRouter,
  branchFoodRouter,
};
