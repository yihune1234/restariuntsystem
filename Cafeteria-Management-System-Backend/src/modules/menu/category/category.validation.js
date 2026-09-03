const Joi = require('joi');

const createCategorySchema = {
  params: Joi.object({
    branchId: Joi.string().hex().length(24).required(),
  }),
  body: Joi.object({
    mealPeriodId: Joi.string().hex().length(24).required(),
    name: Joi.string().min(2).max(50).required(),
    nameEn: Joi.string().allow('').max(50).default(''),
    nameOm: Joi.string().allow('').max(50).default(''),
    nameAm: Joi.string().allow('').max(50).default(''),
    displayOrder: Joi.number().min(0).default(0),
  }),
};

const updateCategorySchema = {
  params: Joi.object({
    id: Joi.string().hex().length(24).required(),
  }),
  body: Joi.object({
    mealPeriodId: Joi.string().hex().length(24),
    name: Joi.string().min(2).max(50),
    nameEn: Joi.string().allow('').max(50),
    nameOm: Joi.string().allow('').max(50),
    nameAm: Joi.string().allow('').max(50),
    displayOrder: Joi.number().min(0),
    isActive: Joi.boolean(),
  }),
};

const categoryIdParamSchema = {
  params: Joi.object({
    id: Joi.string().hex().length(24).required(),
  }),
};

module.exports = {
  createCategorySchema,
  updateCategorySchema,
  categoryIdParamSchema,
};
