const shiftService = require('./shift.service');
const ApiResponse = require('../../utils/response');
const asyncHandler = require('../../utils/async-handler');

class ShiftController {
  startShift = asyncHandler(async (req, res) => {
    const shift = await shiftService.startShift(req.user.id, req.user.branchId, req.body);
    return ApiResponse.created(res, 'Shift started successfully', shift);
  });

  endShift = asyncHandler(async (req, res) => {
    const shift = await shiftService.endShift(req.user.id, req.user.branchId, req.body);
    return ApiResponse.success(res, 200, 'Shift closed successfully', shift);
  });

  getActiveShift = asyncHandler(async (req, res) => {
    const shift = await shiftService.getActiveShift(req.user.id, req.user.branchId);
    if (!shift) {
      return ApiResponse.success(res, 200, 'No active shift found', null);
    }
    return ApiResponse.success(res, 200, 'Active shift status retrieved', shift);
  });

  getBranchShifts = asyncHandler(async (req, res) => {
    const result = await shiftService.getBranchShifts(req.params.branchId, req.query);
    return ApiResponse.success(res, 200, 'Branch shifts retrieved successfully', result.shifts, {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    });
  });
}

module.exports = new ShiftController();
