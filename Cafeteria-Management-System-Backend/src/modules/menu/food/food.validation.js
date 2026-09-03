const Joi = require('joi');

const createFoodSchema = {
  params: Joi.object({
    branchId: Joi.string().hex().length(24).required(),
  }),
  body: Joi.object({
    categoryId: Joi.string().hex().length(24).required(),
    name: Joi.string().min(2).max(100).required(),
    nameEn: Joi.string().allow('').max(100).default(''),
    nameOm: Joi.string().allow('').max(100).default(''),
    nameAm: Joi.string().allow('').max(100).default(''),
    description: Joi.string().allow('').max(500),
    descriptionEn: Joi.string().allow('').max(500).default(''),
    descriptionOm: Joi.string().allow('').max(500).default(''),
    descriptionAm: Joi.string().allow('').max(500).default(''),
    price: Joi.number().positive().required(),
    preparationTimeMinutes: Joi.number().min(1).max(180).default(15),
    displayOrder: Joi.number().min(0).default(0),
    isAvailable: Joi.boolean().default(true),
  }),
};

const updateFoodSchema = {
  params: Joi.object({
    foodId: Joi.string().hex().length(24).required(),
  }),
  body: Joi.object({
    categoryId: Joi.string().hex().length(24),
    name: Joi.string().min(2).max(100),
    nameEn: Joi.string().allow('').max(100),
    nameOm: Joi.string().allow('').max(100),
    nameAm: Joi.string().allow('').max(100),
    description: Joi.string().allow('').max(500),
    descriptionEn: Joi.string().allow('').max(500),
    descriptionOm: Joi.string().allow('').max(500),
    descriptionAm: Joi.string().allow('').max(500),
    price: Joi.number().positive(),
    preparationTimeMinutes: Joi.number().min(1).max(180),
    displayOrder: Joi.number().min(0),
    isAvailable: Joi.boolean(),
    isActive: Joi.boolean(),
  }),
};

const foodIdParamSchema = {
  params: Joi.object({
    foodId: Joi.string().hex().length(24).required(),
  }),
};

module.exports = {
  createFoodSchema,
  updateFoodSchema,
  foodIdParamSchema,
};
