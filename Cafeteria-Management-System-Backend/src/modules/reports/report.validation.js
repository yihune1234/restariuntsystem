const Joi = require('joi');

const branchReportSchema = {
  params: Joi.object({
    branchId: Joi.string().hex().length(24).required(),
  }),
  query: Joi.object({
    startDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/),
    endDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/),
  }),
};

const orgReportSchema = {
  params: Joi.object({
    organizationId: Joi.string().hex().length(24).required(),
  }),
};

module.exports = {
  branchReportSchema,
  orgReportSchema,
};
