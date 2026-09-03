const Joi = require('joi');

const updateOrgSchema = {
  params: Joi.object({
    organizationId: Joi.string().hex().length(24).required(),
  }),
  body: Joi.object({
    name: Joi.string().min(2).max(150),
    ownerName: Joi.string().min(2).max(100),
    ownerEmail: Joi.string().email(),
    ownerPhone: Joi.string().allow(''),
    settings: Joi.object({
      currency: Joi.string().length(3).uppercase(),
      defaultTaxRate: Joi.number().min(0).max(1),
      defaultServiceChargeRate: Joi.number().min(0).max(1),
      timezone: Joi.string(),
    }),
    isActive: Joi.boolean(),
  }),
};

const createBranchUnderOrgSchema = {
  params: Joi.object({
    organizationId: Joi.string().hex().length(24).required(),
  }),
  body: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    code: Joi.string().min(2).max(10).uppercase().required(),
    address: Joi.object({
      city: Joi.string().required(),
      subcity: Joi.string().allow(''),
      street: Joi.string().allow(''),
    }).required(),
    phone: Joi.string().required(),
    settings: Joi.object({
      taxRate: Joi.number().min(0).max(1),
      serviceChargeRate: Joi.number().min(0).max(1),
      currency: Joi.string().length(3).uppercase(),
      openTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/),
      closeTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/),
      autoAcceptCashierOrders: Joi.boolean(),
    }),
  }),
};

module.exports = {
  updateOrgSchema,
  createBranchUnderOrgSchema,
};
