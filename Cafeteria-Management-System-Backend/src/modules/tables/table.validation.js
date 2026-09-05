const Joi = require('joi');
const { TABLE_STATUSES } = require('./table.model');

const createTableSchema = {
  body: Joi.object({
    tableNumber: Joi.string().min(1).max(50).required(),
    capacity: Joi.number().min(1).max(100).default(4),
  }),
};

const updateTableSchema = {
  params: Joi.object({
    tableId: Joi.string().hex().length(24).required(),
  }),
  body: Joi.object({
    tableNumber: Joi.string().min(1).max(50),
    capacity: Joi.number().min(1).max(100),
    status: Joi.string().valid(...TABLE_STATUSES),
    isActive: Joi.boolean(),
  }),
};

const tableIdParamSchema = {
  params: Joi.object({
    tableId: Joi.string().hex().length(24).required(),
  }),
};

const qrTokenParamSchema = {
  params: Joi.object({
    qrToken: Joi.string().required(),
  }),
};

module.exports = {
  createTableSchema,
  updateTableSchema,
  tableIdParamSchema,
  qrTokenParamSchema,
};
