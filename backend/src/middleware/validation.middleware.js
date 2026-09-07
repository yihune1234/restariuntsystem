const { ValidationError } = require('../utils/errors');
const logger = require('../config/logger');

/**
 * Higher-order middleware function to validate incoming request data using Joi schemas
 * @param {object} schema - Schema object with optional body, query, params Joi objects
 */
const validate = (schema) => (req, res, next) => {
  const validationTargets = ['params', 'query', 'body'];
  const errors = [];

  for (const target of validationTargets) {
    if (schema[target]) {
      const { error, value } = schema[target].validate(req[target], {
        abortEarly: false,
        stripUnknown: true,
        errors: { wrap: { label: false } },
      });

      if (error) {
        error.details.forEach((detail) => {
          errors.push({
            location: target,
            field: detail.path.join('.'),
            message: detail.message,
          });
        });
      } else {
        req[target] = value; // Replace with stripped/sanitized validated values
      }
    }
  }

  if (errors.length > 0) {
    logger.error(`Validation errors for ${req.originalUrl}: ${JSON.stringify(errors)}`, { body: req.body });
    return next(new ValidationError('Request validation failed', 'VALIDATION_ERROR', errors));
  }

  next();
};

module.exports = validate;
