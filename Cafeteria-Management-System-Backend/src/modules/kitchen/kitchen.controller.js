const kitchenService = require('./kitchen.service');
const ApiResponse = require('../../utils/response');
const asyncHandler = require('../../utils/async-handler');

class KitchenController {
  getKitchenQueue = asyncHandler(async (req, res) => {
    const branchId = req.user.branchId || req.query.branchId;
    const queue = await kitchenService.getKitchenQueue(branchId);
    return ApiResponse.success(res, 200, 'Kitchen queue retrieved successfully', queue);
  });

  startPreparation = asyncHandler(async (req, res) => {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || '';

    const order = await kitchenService.startPreparation(
      req.params.orderId,
      req.user,
      ipAddress,
      userAgent
    );

    return ApiResponse.success(res, 200, 'Order moved to PREPARING', order);
  });

  markReady = asyncHandler(async (req, res) => {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || '';

    const order = await kitchenService.markReady(
      req.params.orderId,
      req.user,
      ipAddress,
      userAgent
    );

    return ApiResponse.success(res, 200, 'Order marked READY for waiter pickup', order);
  });
}

module.exports = new KitchenController();
