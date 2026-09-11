const Joi = require('joi');

const VARIANT_OPTION_SCHEMA = Joi.object({
  name: Joi.string().required(),
  nameEn: Joi.string().allow('').default(''),
  nameOm: Joi.string().allow('').default(''),
  nameAm: Joi.string().allow('').default(''),
  priceModifier: Joi.number().default(0),
  isAvailable: Joi.boolean().default(true),
});

const VARIANT_GROUP_SCHEMA = Joi.object({
  name: Joi.string().required(),
  nameEn: Joi.string().allow('').default(''),
  nameOm: Joi.string().allow('').default(''),
  nameAm: Joi.string().allow('').default(''),
  required: Joi.boolean().default(false),
  multiSelect: Joi.boolean().default(false),
  maxSelect: Joi.number().default(1),
  options: Joi.array().items(VARIANT_OPTION_SCHEMA).default([]),
});



const createFoodSchema = {
  body: Joi.object({
    categoryIds: Joi.array().items(Joi.string().hex().length(24)).min(1).required(),
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
    mealScheduleIds: Joi.array().items(Joi.string().hex().length(24)).default([]),
    tags: Joi.array().items(Joi.string().max(50)).default([]),
    variantGroups: Joi.array().items(VARIANT_GROUP_SCHEMA).default([]),
    imageUrl: Joi.string().allow('').max(2048).default(''),

  }),
};

const updateFoodSchema = {
  params: Joi.object({
    foodId: Joi.string().hex().length(24).required(),
  }),
  body: Joi.object({
    categoryIds: Joi.array().items(Joi.string().hex().length(24)),
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
    mealScheduleIds: Joi.array().items(Joi.string().hex().length(24)),
    tags: Joi.array().items(Joi.string().max(50)),
    variantGroups: Joi.array().items(VARIANT_GROUP_SCHEMA),
    imageUrl: Joi.string().allow('').max(2048),

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
