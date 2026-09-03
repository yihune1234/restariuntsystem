/**
 * Standardized API Response Helper
 */

class ApiResponse {
  /**
   * Send a successful response
   * @param {import('express').Response} res - Express response object
   * @param {number} statusCode - HTTP status code (default: 200)
   * @param {string} message - Human-readable success message
   * @param {any} data - Response payload
   * @param {object} meta - Optional pagination or query metadata
   */
  static success(res, statusCode = 200, message = 'Success', data = null, meta = undefined) {
    const responseBody = {
      success: true,
      message,
    };

    if (data !== null && data !== undefined) {
      responseBody.data = data;
    }

    if (meta !== undefined) {
      responseBody.meta = meta;
    }

    return res.status(statusCode).json(responseBody);
  }

  /**
   * Send a created resource response (201)
   */
  static created(res, message = 'Resource created successfully', data = null, meta = undefined) {
    return ApiResponse.success(res, 201, message, data, meta);
  }

  /**
   * Send an error response
   * @param {import('express').Response} res - Express response object
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Error description
   * @param {string} code - Machine-readable error code
   * @param {any} errors - Detailed validation errors or debugging info
   */
  static error(res, statusCode = 500, message = 'Internal Server Error', code = 'INTERNAL_SERVER_ERROR', errors = null) {
    const responseBody = {
      success: false,
      message,
      code,
    };

    if (errors !== null && errors !== undefined) {
      responseBody.errors = errors;
    }

    return res.status(statusCode).json(responseBody);
  }
}

module.exports = ApiResponse;
