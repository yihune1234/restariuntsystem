/**
 * Custom Application Error Classes
 */

class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_SERVER_ERROR', errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

class BadRequestError extends AppError {
  constructor(message = 'Bad Request', code = 'BAD_REQUEST', errors = null) {
    super(message, 400, code, errors);
  }
}

class ValidationError extends AppError {
  constructor(message = 'Request validation failed', code = 'VALIDATION_ERROR', errors = null) {
    super(message, 400, code, errors);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access', code = 'UNAUTHORIZED', errors = null) {
    super(message, 401, code, errors);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden resource access', code = 'FORBIDDEN', errors = null) {
    super(message, 403, code, errors);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found', code = 'NOT_FOUND', errors = null) {
    super(message, 404, code, errors);
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict', code = 'CONFLICT', errors = null) {
    super(message, 409, code, errors);
  }
}

class UnprocessableEntityError extends AppError {
  constructor(message = 'Unprocessable entity', code = 'UNPROCESSABLE_ENTITY', errors = null) {
    super(message, 422, code, errors);
  }
}

class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests, please try again later', code = 'TOO_MANY_REQUESTS', errors = null) {
    super(message, 429, code, errors);
  }
}

module.exports = {
  AppError,
  BadRequestError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  UnprocessableEntityError,
  TooManyRequestsError,
};
