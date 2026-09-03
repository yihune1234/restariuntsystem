const waiterService = require('./waiter.service');
const ApiResponse = require('../../utils/response');
const asyncHandler = require('../../utils/async-handler');

class WaiterController {
  getReadyOrders = asyncHandler(async (req, res) => {
    const branchId = req.user.branchId || req.query.branchId;
    const orders = await waiterService.getReadyOrders(branchId);
    return ApiResponse.success(res, 200, 'Ready orders retrieved successfully', orders);
  });

  takeOrder = asyncHandler(async (req, res) => {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || '';

    const order = await waiterService.takeOrder(
      req.params.orderId,
      req.user,
      ipAddress,
      userAgent
    );

    return ApiResponse.success(res, 200, 'Order claimed and marked TAKEN_BY_WAITER', order);
  });

  deliverOrder = asyncHandler(async (req, res) => {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || '';

    const order = await waiterService.deliverOrder(
      req.params.orderId,
      req.user,
      ipAddress,
      userAgent
    );

    return ApiResponse.success(res, 200, 'Order marked DELIVERED and COMPLETED', order);
  });
}

module.exports = new WaiterController();
