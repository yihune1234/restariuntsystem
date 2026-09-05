const Joi = require('joi');
const { ORDER_SOURCES, PAYMENT_STATUSES, ORDER_STATUSES } = require('./order.model');

const createOrderSchema = {
  body: Joi.object({
    tableId: Joi.string().hex().length(24).allow(null).default(null),
    customerSessionId: Joi.string().hex().length(24),
    customerName: Joi.string().trim().max(100).allow(null, ''),
    customerNote: Joi.string().trim().max(500).allow('').default(''),
    source: Joi.string().valid(...ORDER_SOURCES).default('CUSTOMER_QR'),
    items: Joi.array()
      .items(
        Joi.object({
          foodItemId: Joi.string().hex().length(24).required(),
          quantity: Joi.number().integer().min(1).required(),
          notes: Joi.string().allow('').max(200),
        })
      )
      .min(1)
      .required(),
  }),
};

const getOrdersSchema = {
  query: Joi.object({
    status: Joi.string().valid(...ORDER_STATUSES),
    paymentStatus: Joi.string().valid(...PAYMENT_STATUSES),
    date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/),
    tableId: Joi.string().hex().length(24),
    source: Joi.string().valid(...ORDER_SOURCES),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
};

const orderIdParamSchema = {
  params: Joi.object({
    orderId: Joi.string().hex().length(24).required(),
  }),
};

const cancelOrderSchema = {
  params: Joi.object({
    orderId: Joi.string().hex().length(24).required(),
  }),
  body: Joi.object({
    reason: Joi.string().max(300).allow(''),
  }),
};

const securityCodeParamSchema = {
  params: Joi.object({
    code: Joi.string().pattern(/^\d{4}$/).required(),
  }),
};

module.exports = {
  createOrderSchema,
  getOrdersSchema,
  orderIdParamSchema,
  cancelOrderSchema,
  securityCodeParamSchema,
};
