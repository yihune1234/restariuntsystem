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

const mealPeriodRouter = express.Router();

mealPeriodRouter.use(authenticateStaff);

mealPeriodRouter.get('/', requireRoles('OWNER', 'MANAGER', 'CASHIER', 'KITCHEN'), mealPeriodController.getMealPeriods);

mealPeriodRouter.post('/', validate(createMealPeriodSchema), requireRoles('OWNER', 'MANAGER'), mealPeriodController.createMealPeriod);

mealPeriodRouter.get('/:id', validate(mealPeriodIdParamSchema), requireRoles('OWNER', 'MANAGER'), mealPeriodController.getMealPeriodById);

mealPeriodRouter.patch('/:id', validate(updateMealPeriodSchema), requireRoles('OWNER', 'MANAGER'), mealPeriodController.updateMealPeriod);

mealPeriodRouter.delete('/:id', validate(mealPeriodIdParamSchema), requireRoles('OWNER', 'MANAGER'), mealPeriodController.deleteMealPeriod);

mealPeriodRouter.patch('/reorder', requireRoles('OWNER', 'MANAGER'), mealPeriodController.reorderMealPeriods);

module.exports = {
  mealPeriodRouter,
};
