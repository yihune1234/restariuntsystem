const Joi = require('joi');

const loginSchema = {
  body: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'A valid email address is required',
      'any.required': 'Email is required',
    }),
    password: Joi.string().required().messages({
      'any.required': 'Password is required',
    }),
  }),
};

const refreshSchema = {
  body: Joi.object({
    refreshToken: Joi.string().required().messages({
      'any.required': 'Refresh token is required',
    }),
  }),
};

const changePasswordSchema = {
  body: Joi.object({
    currentPassword: Joi.string().required().messages({
      'any.required': 'Current password is required',
    }),
    newPassword: Joi.string().min(6).max(128).required().messages({
      'string.min': 'New password must be at least 6 characters long',
      'any.required': 'New password is required',
    }),
  }),
};

const updateProfileSchema = {
  body: Joi.object({
    name: Joi.string().min(2).max(100).messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name must be at most 100 characters long',
    }),
    email: Joi.string().email().messages({
      'string.email': 'A valid email address is required',
    }),
    phone: Joi.string().allow('', null).messages({
      'string.base': 'Phone must be a string',
    }),
  }),
};

const adminResetPasswordSchema = {
  body: Joi.object({
    targetUserId: Joi.string().hex().length(24).required().messages({
      'string.hex': 'Invalid user ID format',
      'string.length': 'Invalid user ID format',
      'any.required': 'Target user ID is required',
    }),
    newPassword: Joi.string().min(6).max(128).required().messages({
      'string.min': 'New password must be at least 6 characters long',
      'any.required': 'New password is required',
    }),
  }),
};

module.exports = {
  loginSchema,
  refreshSchema,
  changePasswordSchema,
  updateProfileSchema,
  adminResetPasswordSchema,
};
