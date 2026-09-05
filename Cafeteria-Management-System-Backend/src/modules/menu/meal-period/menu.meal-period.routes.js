const express = require('express');
const mealPeriodController = require('./meal-period.controller');
const validate = require('../../../middleware/validation.middleware');
const { authenticateStaff } = require('../../../middleware/auth.middleware');
const { requireRoles } = require('../../../middleware/role.middleware');

const Joi = require('joi');

const createMealPeriodSchema = {
  body: Joi.object({
    name: Joi.string().min(2).max(50).required(),
    nameEn: Joi.string().allow('').max(50).default(''),
    nameOm: Joi.string().allow('').max(50).default(''),
    nameAm: Joi.string().allow('').max(50).default(''),
    startTime: Joi.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).required(),
    endTime: Joi.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).required(),
    displayOrder: Joi.number().min(0).default(0),
    isActive: Joi.boolean().default(true),
  }),
};

const updateMealPeriodSchema = {
  params: Joi.object({ id: Joi.string().hex().length(24).required() }),
  body: Joi.object({
    name: Joi.string().min(2).max(50),
    nameEn: Joi.string().allow('').max(50),
    nameOm: Joi.string().allow('').max(50),
    nameAm: Joi.string().allow('').max(50),
    startTime: Joi.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
    endTime: Joi.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
    displayOrder: Joi.number().min(0),
    isActive: Joi.boolean(),
  }),
};

const menuMealPeriodRouter = express.Router();

menuMealPeriodRouter.use(authenticateStaff);

menuMealPeriodRouter.get('/', requireRoles('OWNER', 'MANAGER', 'CASHIER'), mealPeriodController.getMealPeriods);
menuMealPeriodRouter.post('/', validate(createMealPeriodSchema), requireRoles('OWNER', 'MANAGER'), mealPeriodController.createMealPeriod);
menuMealPeriodRouter.get('/:id', requireRoles('OWNER', 'MANAGER'), mealPeriodController.getMealPeriodById);
menuMealPeriodRouter.patch('/:id', validate(updateMealPeriodSchema), requireRoles('OWNER', 'MANAGER'), mealPeriodController.updateMealPeriod);
menuMealPeriodRouter.delete('/:id', requireRoles('OWNER', 'MANAGER'), mealPeriodController.deleteMealPeriod);

module.exports = { menuMealPeriodRouter };
