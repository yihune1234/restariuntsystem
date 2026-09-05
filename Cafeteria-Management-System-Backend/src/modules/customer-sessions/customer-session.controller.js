const customerSessionService = require('./customer-session.service');
const ApiResponse = require('../../utils/response');
const asyncHandler = require('../../utils/async-handler');

class CustomerSessionController {
  createSession = asyncHandler(async (req, res) => {
    const session = await customerSessionService.createSessionByQR(req.body.qrToken);
    return ApiResponse.created(res, 'Customer session initiated successfully', session);
  });

  getCurrentSession = asyncHandler(async (req, res) => {
    const sessionToken = req.headers['x-session-token'] || req.query.sessionToken;
    const session = await customerSessionService.getSessionDetails(sessionToken);
    return ApiResponse.success(res, 200, 'Customer session active', session);
  });

  closeSession = asyncHandler(async (req, res) => {
    const sessionToken = req.headers['x-session-token'] || req.body.sessionToken;
    const result = await customerSessionService.closeSession(sessionToken);
    return ApiResponse.success(res, 200, result.message);
  });
}

module.exports = new CustomerSessionController();
