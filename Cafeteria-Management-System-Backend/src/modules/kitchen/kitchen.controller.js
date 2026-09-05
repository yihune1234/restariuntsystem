const kitchenService = require('./kitchen.service');
const ApiResponse = require('../../utils/response');
const asyncHandler = require('../../utils/async-handler');

class KitchenController {
  getKitchenQueue = asyncHandler(async (req, res) => {
    const queue = await kitchenService.getKitchenQueue();
    return ApiResponse.success(res, 200, 'Kitchen queue retrieved successfully', queue);
  });

  startPreparation = asyncHandler(async (req, res) => {
    const order = await kitchenService.startPreparation(
      req.params.orderId,
      req.user
    );
    return ApiResponse.success(res, 200, 'Order moved to PREPARING', order);
  });

  markReady = asyncHandler(async (req, res) => {
    const order = await kitchenService.markReady(
      req.params.orderId,
      req.user
    );
    return ApiResponse.success(res, 200, 'Order marked READY', order);
  });
}

module.exports = new KitchenController();
