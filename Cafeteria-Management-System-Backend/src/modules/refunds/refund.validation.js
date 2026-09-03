const Joi = require('joi');
const { REFUND_STATUSES, REFUND_METHODS, REFUND_REASONS } = require('./refund.model');

const requestRefundSchema = {
  body: Joi.object({
    paymentId: Joi.string().hex().length(24).required(),
    orderId: Joi.string().hex().length(24).required(),
    amount: Joi.number().positive().precision(2).required(),
    reason: Joi.string().valid(...REFUND_REASONS).required(),
    reasonDetails: Joi.string().max(1000).allow('').default(''),
    refundMethod: Joi.string().valid(...REFUND_METHODS).default('ORIGINAL_PAYMENT_METHOD'),
    notes: Joi.string().max(1000).allow('').default(''),
    source: Joi.string().valid('NORMAL', 'OFFLINE_MANUAL').default('NORMAL'),
    skipApproval: Joi.boolean().default(false),
  }),
};

const refundIdParamSchema = {
  params: Joi.object({
    refundId: Joi.string().hex().length(24).required(),
  }),
};

const rejectRefundSchema = {
  params: Joi.object({
    refundId: Joi.string().hex().length(24).required(),
  }),
  body: Joi.object({
    reason: Joi.string().min(3).max(500).required(),
  }),
};

const listRefundsSchema = {
  query: Joi.object({
    organizationId: Joi.string().hex().length(24),
    branchId: Joi.string().hex().length(24),
    status: Joi.string().valid(...REFUND_STATUSES),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
};

module.exports = {
  requestRefundSchema,
  refundIdParamSchema,
  rejectRefundSchema,
  listRefundsSchema,
};
