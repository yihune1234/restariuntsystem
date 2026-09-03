const wasteService = require('./waste.service');
const ApiResponse = require('../../utils/response');
const asyncHandler = require('../../utils/async-handler');

class WasteController {
  listWaste = asyncHandler(async (req, res) => {
    const { branchId } = req.params;
    const { status, page, limit } = req.query;
    const result = await wasteService.listWaste(branchId, {
      status,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
    });
    return ApiResponse.success(res, 200, 'Waste records retrieved', result);
  });

  recordWaste = asyncHandler(async (req, res) => {
    const { organizationId, branchId, id: userId } = req.user;
    const waste = await wasteService.recordWaste(organizationId, branchId, userId, req.body);
    return ApiResponse.success(res, 201, 'Waste record created (pending approval)', waste);
  });

  approveWaste = asyncHandler(async (req, res) => {
    const { wasteId } = req.params;
    const { id: userId } = req.user;
    const waste = await wasteService.approveWaste(wasteId, userId);
    return ApiResponse.success(res, 200, 'Waste record approved', waste);
  });

  rejectWaste = asyncHandler(async (req, res) => {
    const { wasteId } = req.params;
    const { id: userId } = req.user;
    const { reason } = req.body;
    const waste = await wasteService.rejectWaste(wasteId, userId, reason);
    return ApiResponse.success(res, 200, 'Waste record rejected', waste);
  });
}

module.exports = new WasteController();