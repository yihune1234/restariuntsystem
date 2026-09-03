const customerSessionService = require('./customer-session.service');
const ApiResponse = require('../../utils/response');
const asyncHandler = require('../../utils/async-handler');

class CustomerSessionController {
  createSession = asyncHandler(async (req, res) => {
    /**
     * Staff-only capacity override: a MANAGER/OWNER/WAITER/CASHIER bearer
     * token lets an authorized staff member seat a party on a full table
     * (host-seated walk-ins, reserved-table walkups, etc.).
     */
    const staffOverride =
      req.user &&
      ['OWNER', 'MANAGER', 'WAITER', 'CASHIER'].includes(req.user.role) &&
      req.body.staffOverride === true;

    const session = await customerSessionService.createSessionByQR(req.body.qrToken, {
      staffOverride,
    });
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
