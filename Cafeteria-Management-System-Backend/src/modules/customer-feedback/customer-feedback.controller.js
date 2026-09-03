const customerFeedbackService = require('./customer-feedback.service');
const ApiResponse = require('../../utils/response');
const asyncHandler = require('../../utils/async-handler');

class CustomerFeedbackController {
  submitFeedback = asyncHandler(async (req, res) => {
    const { orderId, ...feedbackData } = req.body;
    const feedback = await customerFeedbackService.createFeedback({
      ...feedbackData,
      orderId,
    });
    return ApiResponse.success(res, 201, 'Feedback submitted successfully', feedback);
  });

  resolveFeedback = asyncHandler(async (req, res) => {
    const { feedbackId } = req.params;
    const { userId } = req.user;
    const { resolutionNotes } = req.body;
    
    const feedback = await customerFeedbackService.resolveFeedback(
      feedbackId,
      userId,
      resolutionNotes
    );
    return ApiResponse.success(res, 200, 'Feedback resolved successfully', feedback);
  });

  updateFeedbackStatus = asyncHandler(async (req, res) => {
    const { feedbackId } = req.params;
    const { userId } = req.user;
    const { status } = req.body;
    const feedback = await customerFeedbackService.updateFeedbackStatus(feedbackId, userId, { status });
    return ApiResponse.success(res, 200, 'Feedback status updated', feedback);
  });

  getBranchFeedback = asyncHandler(async (req, res) => {
    const { branchId } = req.params;
    const { page, limit, includeResolved } = req.query;
    
    const result = await customerFeedbackService.getBranchFeedback(branchId, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      includeResolved: includeResolved === 'true',
    });
    return ApiResponse.success(res, 200, 'Branch feedback retrieved', result);
  });

  getOrganizationFeedback = asyncHandler(async (req, res) => {
    const { organizationId } = req.params;
    const { page, limit, branchId } = req.query;
    
    const result = await customerFeedbackService.getOrganizationFeedback(organizationId, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      branchId,
    });
    return ApiResponse.success(res, 200, 'Organization feedback retrieved', result);
  });

  getFeedbackStats = asyncHandler(async (req, res) => {
    const { branchId } = req.params;
    const { days } = req.query;

    const stats = await customerFeedbackService.getFeedbackStats(
      branchId,
      parseInt(days) || 30
    );
    return ApiResponse.success(res, 200, 'Feedback statistics retrieved', stats);
  });

  /** OWNER: complete feedback analytics across the organization. */
  getOrganizationAnalytics = asyncHandler(async (req, res) => {
    const { organizationId } = req.params;
    const { days, branchId } = req.query;

    const analytics = await customerFeedbackService.getOrganizationAnalytics(
      organizationId,
      {
        days: parseInt(days) || 30,
        branchId: branchId || null,
      }
    );
    return ApiResponse.success(res, 200, 'Feedback analytics retrieved', analytics);
  });
}

module.exports = new CustomerFeedbackController();