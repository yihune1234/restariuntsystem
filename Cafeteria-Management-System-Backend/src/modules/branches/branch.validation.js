const Joi = require('joi');

const branchIdParamSchema = {
  params: Joi.object({
    branchId: Joi.string().hex().length(24).required(),
  }),
};

const updateBranchSchema = {
  params: Joi.object({
    branchId: Joi.string().hex().length(24).required(),
  }),
  body: Joi.object({
    name: Joi.string().min(2).max(100),
    phone: Joi.string(),
    address: Joi.object({
      city: Joi.string(),
      subcity: Joi.string().allow(''),
      street: Joi.string().allow(''),
    }),
    settings: Joi.object({
      taxRate: Joi.number().min(0).max(1),
      serviceChargeRate: Joi.number().min(0).max(1),
      currency: Joi.string().length(3).uppercase(),
      openTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/),
      closeTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/),
      autoAcceptCashierOrders: Joi.boolean(),
    }),
    isActive: Joi.boolean(),
  }),
};

module.exports = {
  branchIdParamSchema,
  updateBranchSchema,
};
