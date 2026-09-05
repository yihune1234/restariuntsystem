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

const foodRouter = express.Router();

foodRouter.use(authenticateStaff);

foodRouter.get('/', requireRoles('OWNER', 'MANAGER', 'CASHIER', 'KITCHEN'), foodController.getFoodItems);

foodRouter.post('/', validate(createFoodSchema), requireRoles('OWNER', 'MANAGER'), foodController.createFood);

foodRouter.get('/:foodId', validate(foodIdParamSchema), requireRoles('OWNER', 'MANAGER', 'CASHIER', 'KITCHEN'), foodController.getFoodItemById);

foodRouter.patch('/:foodId', validate(updateFoodSchema), requireRoles('OWNER', 'MANAGER'), foodController.updateFoodItem);

foodRouter.delete('/:foodId', validate(foodIdParamSchema), requireRoles('OWNER', 'MANAGER'), foodController.deleteFoodItem);

foodRouter.delete('/:foodId/image', validate(foodIdParamSchema), requireRoles('OWNER', 'MANAGER'), foodController.removeImage);

foodRouter.patch('/reorder', requireRoles('OWNER', 'MANAGER'), foodController.reorderFoodItems);

module.exports = {
  foodRouter,
};
