const Joi = require('joi');
const { SHIFT_STATUSES } = require('./shift.model');

const startShiftSchema = {
  body: Joi.object({
    startingCash: Joi.number().min(0).default(0),
    notes: Joi.string().allow('').max(300),
  }),
};

const endShiftSchema = {
  body: Joi.object({
    closingCash: Joi.number().min(0),
    notes: Joi.string().allow('').max(300),
  }),
};

const getBranchShiftsSchema = {
  params: Joi.object({
    branchId: Joi.string().hex().length(24).required(),
  }),
  query: Joi.object({
    status: Joi.string().valid(...SHIFT_STATUSES),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
};

module.exports = {
  startShiftSchema,
  endShiftSchema,
  getBranchShiftsSchema,
};
