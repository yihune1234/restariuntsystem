const { AppError } = require('../utils/errors');
const ApiResponse = require('../utils/response');
const logger = require('../config/logger');
const config = require('../config/env');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.stack = err.stack;

  // Log error with context
  logger.error(`${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`, {
    stack: err.stack,
    body: req.body,
    params: req.params,
    query: req.query,
    validationErrors: err.errors || null,
  });

  // Handle Mongoose Bad ObjectId (CastError)
  if (err.name === 'CastError') {
    const message = `Invalid format for resource identifier: ${err.value}`;
    error = new AppError(message, 400, 'INVALID_RESOURCE_ID');
  }

  // Handle Mongoose Duplicate Key Error (E11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const value = err.keyValue ? err.keyValue[field] : '';
    const message = `Duplicate value '${value}' entered for ${field}. Please use another value.`;
    error = new AppError(message, 409, 'DUPLICATE_RESOURCE_KEY', { field, value });
  }

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((el) => ({
      field: el.path,
      message: el.message,
    }));
    error = new AppError('Database validation error', 400, 'VALIDATION_ERROR', errors);
  }

  // Handle Joi Validation Errors (if forwarded directly)
  if (err.isJoi) {
    const errors = err.details.map((detail) => ({
      field: detail.path.join('.'),
      message: detail.message.replace(/"/g, ''),
    }));
    error = new AppError('Validation failed', 400, 'VALIDATION_ERROR', errors);
  }

  // Handle JWT Errors
  if (err.name === 'JsonWebTokenError') {
    error = new AppError('Invalid authentication token', 401, 'INVALID_TOKEN');
  }

  if (err.name === 'TokenExpiredError') {
    error = new AppError('Authentication token has expired', 401, 'TOKEN_EXPIRED');
  }

  // Handle Multer File Size or Upload Errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      error = new AppError('File size exceeds the allowed limit (max 5MB)', 400, 'FILE_TOO_LARGE');
    } else {
      error = new AppError(`File upload error: ${err.message}`, 400, 'UPLOAD_ERROR');
    }
  }

  // Handle malformed multipart bodies surfaced by busboy through multer
  // (e.g. "Unexpected end of form") — these are client errors, not 500s.
  const isMultipartRequest = /^multipart\//i.test(req.headers['content-type'] || '');
  if (isMultipartRequest && /unexpected end of form|aborted|Multipart: Boundary not found/i.test(err.message || '')) {
    error = new AppError('Malformed image upload request', 400, 'MALFORMED_UPLOAD');
  }

  // Default to 500 server error if not an AppError
  const statusCode = error.statusCode || 500;
  const message = error.isOperational || config.isDevelopment ? error.message : 'Internal Server Error';
  const errorCode = error.code || 'INTERNAL_SERVER_ERROR';
  const errors = error.errors || (config.isDevelopment && !error.isOperational ? error.stack : null);

  return ApiResponse.error(res, statusCode, message, errorCode, errors);
};

module.exports = errorHandler;
