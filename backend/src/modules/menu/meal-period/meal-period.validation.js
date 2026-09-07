const Joi = require('joi');

const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

const createMealPeriodSchema = {
  body: Joi.object({
    name: Joi.string().min(2).max(50).required(),
    nameEn: Joi.string().allow('').max(50).default(''),
    nameOm: Joi.string().allow('').max(50).default(''),
    nameAm: Joi.string().allow('').max(50).default(''),
    startTime: Joi.string().pattern(timePattern).required().messages({
      'string.pattern.base': 'Start time must be in HH:mm format (e.g. 06:00)',
    }),
    endTime: Joi.string().pattern(timePattern).required().messages({
      'string.pattern.base': 'End time must be in HH:mm format (e.g. 11:30)',
    }),
    displayOrder: Joi.number().min(0).default(0),
  }),
};

const updateMealPeriodSchema = {
  params: Joi.object({
    id: Joi.string().hex().length(24).required(),
  }),
  body: Joi.object({
    name: Joi.string().min(2).max(50),
    nameEn: Joi.string().allow('').max(50),
    nameOm: Joi.string().allow('').max(50),
    nameAm: Joi.string().allow('').max(50),
    startTime: Joi.string().pattern(timePattern).messages({
      'string.pattern.base': 'Start time must be in HH:mm format (e.g. 06:00)',
    }),
    endTime: Joi.string().pattern(timePattern).messages({
      'string.pattern.base': 'End time must be in HH:mm format (e.g. 11:30)',
    }),
    displayOrder: Joi.number().min(0),
    isActive: Joi.boolean(),
  }),
};

const mealPeriodIdParamSchema = {
  params: Joi.object({
    id: Joi.string().hex().length(24).required(),
  }),
};

module.exports = {
  createMealPeriodSchema,
  updateMealPeriodSchema,
  mealPeriodIdParamSchema,
};
