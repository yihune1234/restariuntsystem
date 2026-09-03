const {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
} = require('../../src/utils/errors');

describe('AppError Hierarchy Tests', () => {
  test('AppError sets default status code and code', () => {
    const error = new AppError('General server error');
    expect(error.statusCode).toBe(500);
    expect(error.code).toBe('INTERNAL_SERVER_ERROR');
    expect(error.isOperational).toBe(true);
  });

  test('BadRequestError has status 400', () => {
    const error = new BadRequestError('Invalid food parameters', 'INVALID_PARAMS');
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('INVALID_PARAMS');
  });

  test('UnauthorizedError has status 401', () => {
    const error = new UnauthorizedError('Token missing');
    expect(error.statusCode).toBe(401);
    expect(error.code).toBe('UNAUTHORIZED');
  });

  test('ForbiddenError has status 403', () => {
    const error = new ForbiddenError('Branch isolation violation');
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe('FORBIDDEN');
  });

  test('NotFoundError has status 404', () => {
    const error = new NotFoundError('Table not found');
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe('NOT_FOUND');
  });
});
