const mongoose = require('mongoose');
const dailyClosingService = require('./daily-closing.service');
const ApiResponse = require('../../utils/response');
const asyncHandler = require('../../utils/async-handler');

class DailyClosingController {
  getTodayMetrics = asyncHandler(async (req, res) => {
    const { branchId } = req.params;
    const metrics = await dailyClosingService.getTodayMetrics(branchId);
    return ApiResponse.success(res, 200, 'Today metrics retrieved', metrics);
  });

  getOrCreate = asyncHandler(async (req, res) => {
    const { branchId } = req.params;
    const { organizationId } = req.user;
    const closing = await dailyClosingService.getOrCreateClosing(
      new mongoose.Types.ObjectId(branchId),
      new mongoose.Types.ObjectId(organizationId)
    );
    return ApiResponse.success(res, 200, 'Daily closing record', closing);
  });

  openDay = asyncHandler(async (req, res) => {
    const { branchId } = req.params;
    const { organizationId } = req.user;
    const { openingCash = 0 } = req.body;
    
    const closing = await dailyClosingService.openDay(
      new mongoose.Types.ObjectId(branchId),
      new mongoose.Types.ObjectId(organizationId),
      openingCash
    );
    return ApiResponse.success(res, 200, 'Day opened successfully', closing);
  });

  closeDay = asyncHandler(async (req, res) => {
    const { branchId } = req.params;
    const { organizationId, userId } = req.user;
    const { actualCash, differenceReason } = req.body;
    
    const closing = await dailyClosingService.closeDay(
      new mongoose.Types.ObjectId(branchId),
      new mongoose.Types.ObjectId(organizationId),
      actualCash,
      differenceReason,
      new mongoose.Types.ObjectId(userId)
    );
    return ApiResponse.success(res, 200, 'Day closed successfully', closing);
  });

  reconcileDay = asyncHandler(async (req, res) => {
    const { branchId } = req.params;
    const { organizationId, userId } = req.user;
    const { notes } = req.body;
    
    const closing = await dailyClosingService.reconcileDay(
      new mongoose.Types.ObjectId(branchId),
      new mongoose.Types.ObjectId(organizationId),
      new mongoose.Types.ObjectId(userId),
      notes
    );
    return ApiResponse.success(res, 200, 'Day reconciled successfully', closing);
  });

  getClosingHistory = asyncHandler(async (req, res) => {
    const { branchId } = req.params;
    const { limit = 30 } = req.query;
    
    const history = await dailyClosingService.getClosingHistory(
      new mongoose.Types.ObjectId(branchId),
      parseInt(limit)
    );
    return ApiResponse.success(res, 200, 'Closing history retrieved', history);
  });

  getClosingByDate = asyncHandler(async (req, res) => {
    const { branchId, date } = req.params;
    
    const closing = await dailyClosingService.getClosingByDate(
      new mongoose.Types.ObjectId(branchId),
      date
    );
    
    if (!closing) {
      return ApiResponse.success(res, 200, 'No closing record for this date', null);
    }
    
    return ApiResponse.success(res, 200, 'Closing record retrieved', closing);
  });
}

module.exports = new DailyClosingController();