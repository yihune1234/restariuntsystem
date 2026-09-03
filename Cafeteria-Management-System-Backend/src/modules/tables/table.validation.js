const Joi = require('joi');
const { TABLE_STATUSES } = require('./table.model');

const createTableSchema = {
  params: Joi.object({
    branchId: Joi.string().hex().length(24).required(),
  }),
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

/** Assign/unassign responsible waiter: POST /tables/:tableId/assign-waiter */
const assignWaiterSchema = {
  params: Joi.object({
    tableId: Joi.string().hex().length(24).required(),
  }),
  body: Joi.object({
    waiterId: Joi.string().hex().length(24).when('unassign', {
      is: true,
      then: Joi.optional(),
      otherwise: Joi.required(),
    }),
    unassign: Joi.boolean().default(false),
  }),
};

/** Update seat occupancy: POST /tables/:tableId/occupancy */
const occupancySchema = {
  params: Joi.object({
    tableId: Joi.string().hex().length(24).required(),
  }),
  body: Joi.object({
    occupancy: Joi.number().integer().min(0).max(200).required(),
    /** MANAGER/OWNER-only override when exceeding configured capacity. */
    override: Joi.boolean().default(false),
  }),
};

module.exports = {
  createTableSchema,
  updateTableSchema,
  tableIdParamSchema,
  qrTokenParamSchema,
  assignWaiterSchema,
  occupancySchema,
};
