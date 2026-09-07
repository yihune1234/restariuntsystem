const Joi = require('joi');

const createCategorySchema = {
  body: Joi.object({
    name: Joi.string().min(2).max(50).required(),
    nameEn: Joi.string().allow('').max(50).default(''),
    nameOm: Joi.string().allow('').max(50).default(''),
    nameAm: Joi.string().allow('').max(50).default(''),
    parentId: Joi.string().hex().length(24).allow(null).default(null),
    displayOrder: Joi.number().min(0).default(0),
    mealScheduleIds: Joi.array().items(Joi.string().hex().length(24)).default([]),
    isHidden: Joi.boolean().default(false),
  }),
};

const updateCategorySchema = {
  params: Joi.object({
    id: Joi.string().hex().length(24).required(),
  }),
  body: Joi.object({
    name: Joi.string().min(2).max(50),
    nameEn: Joi.string().allow('').max(50),
    nameOm: Joi.string().allow('').max(50),
    nameAm: Joi.string().allow('').max(50),
    parentId: Joi.string().hex().length(24).allow(null),
    displayOrder: Joi.number().min(0),
    isActive: Joi.boolean(),
    isHidden: Joi.boolean(),
    mealScheduleIds: Joi.array().items(Joi.string().hex().length(24)),
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
