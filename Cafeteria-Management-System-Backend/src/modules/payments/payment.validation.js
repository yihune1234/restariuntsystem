const Joi = require('joi');

const initiateChapaSchema = {
  params: Joi.object({
    orderId: Joi.string().hex().length(24).required(),
  }),
  body: Joi.object({
    email: Joi.string().email().default('customer@restaurant.local'),
    firstName: Joi.string().default('Customer'),
  }),
};

const verifyChapaSchema = {
  body: Joi.object({
    transactionReference: Joi.string().required().messages({
      'any.required': 'Transaction reference is required',
    }),
  }),
};

const confirmCashierPaymentSchema = {
  params: Joi.object({
    orderId: Joi.string().hex().length(24).required(),
  }),
  body: Joi.object({
    paymentMethod: Joi.string().valid('CASH', 'CARD', 'CHAPA', 'TELEBIRR', 'BANK_TRANSFER').default('CASH'),
  }),
};

const orderIdParamSchema = {
  params: Joi.object({
    orderId: Joi.string().hex().length(24).required(),
  }),
};

module.exports = {
  initiateChapaSchema,
  verifyChapaSchema,
  confirmCashierPaymentSchema,
  orderIdParamSchema,
};
