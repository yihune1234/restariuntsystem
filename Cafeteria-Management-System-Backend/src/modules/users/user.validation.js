const Joi = require('joi');
const { USER_ROLES } = require('./user.model');

const createUserSchema = {
  params: Joi.object({
    branchId: Joi.string().hex().length(24).required(),
  }),
  body: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().allow(''),
    password: Joi.string().min(6).max(128).required(),
    role: Joi.string()
      .valid(...USER_ROLES.filter((r) => r !== 'OWNER')) // Owner created at org setup
      .required(),
  }),
};

const updateUserSchema = {
  params: Joi.object({
    userId: Joi.string().hex().length(24).required(),
  }),
  body: Joi.object({
    name: Joi.string().min(2).max(100),
    phone: Joi.string().allow(''),
    role: Joi.string().valid(...USER_ROLES),
    isActive: Joi.boolean(),
  }),
};

const userIdParamSchema = {
  params: Joi.object({
    userId: Joi.string().hex().length(24).required(),
  }),
};

module.exports = {
  createUserSchema,
  updateUserSchema,
  userIdParamSchema,
};
