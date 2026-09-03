const Joi = require('joi');
const { AUDIT_ACTIONS } = require('./audit.model');

const getAuditLogsSchema = {
  params: Joi.object({
    branchId: Joi.string().hex().length(24).required(),
  }),
  query: Joi.object({
    action: Joi.string().valid(...AUDIT_ACTIONS),
    entityType: Joi.string(),
    userId: Joi.string().hex().length(24),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(50),
  }),
};

module.exports = {
  getAuditLogsSchema,
};
