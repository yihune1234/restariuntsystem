const fraudDetectionService = require('./fraud-detection.service');
const ApiResponse = require('../../utils/response');
const asyncHandler = require('../../utils/async-handler');

class FraudDetectionController {
  getFraudSummary = asyncHandler(async (req, res) => {
    const { branchId } = req.params;
    const { organizationId } = req.user;
    const { days = 7 } = req.query;
    
    const summary = await fraudDetectionService.getFraudSummary(
      branchId,
      organizationId,
      parseInt(days)
    );
    return ApiResponse.success(res, 200, 'Fraud summary retrieved', summary);
  });

  getDetailedWarnings = asyncHandler(async (req, res) => {
    const { branchId } = req.params;
    const { organizationId } = req.user;
    const { startDate, endDate } = req.query;
    
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const warnings = await fraudDetectionService.detectSuspiciousActivities(
      branchId,
      organizationId,
      start,
      end
    );
    return ApiResponse.success(res, 200, 'Detailed warnings retrieved', warnings);
  });
}

module.exports = new FraudDetectionController();