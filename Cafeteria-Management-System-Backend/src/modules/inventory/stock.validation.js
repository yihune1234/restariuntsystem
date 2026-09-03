const Joi = require('joi');

const setStockSchema = {
  params: Joi.object({
    branchId: Joi.string().hex().length(24).required(),
  }),
  body: Joi.object({
    foodItemId: Joi.string().hex().length(24).required(),
    preparedQuantity: Joi.number().min(0).required(),
    lowStockThreshold: Joi.number().min(0).default(5),
    businessDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/),
  }),
};

const bulkSetStockSchema = {
  params: Joi.object({
    branchId: Joi.string().hex().length(24).required(),
  }),
  body: Joi.object({
    businessDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/),
    items: Joi.array()
      .items(
        Joi.object({
          foodItemId: Joi.string().hex().length(24).required(),
          preparedQuantity: Joi.number().min(0).required(),
          lowStockThreshold: Joi.number().min(0).default(5),
        })
      )
      .min(1)
      .required(),
  }),
};

const updateStockSchema = {
  params: Joi.object({
    stockId: Joi.string().hex().length(24).required(),
  }),
  body: Joi.object({
    preparedQuantity: Joi.number().min(0),
    lowStockThreshold: Joi.number().min(0),
  }),
};

const branchStockTodaySchema = {
  params: Joi.object({
    branchId: Joi.string().hex().length(24).required(),
  }),
  query: Joi.object({
    businessDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/),
  }),
};

module.exports = {
  setStockSchema,
  bulkSetStockSchema,
  updateStockSchema,
  branchStockTodaySchema,
};
