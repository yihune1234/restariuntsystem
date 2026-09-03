const organizationSettingsService = require('./organization-settings.service');
const ApiResponse = require('../../utils/response');
const asyncHandler = require('../../utils/async-handler');

class OrganizationSettingsController {
  getSettings = asyncHandler(async (req, res) => {
    const { organizationId } = req.params;
    const settings = await organizationSettingsService.getSettings(organizationId);
    return ApiResponse.success(res, 200, 'Settings retrieved', settings);
  });

  updateSettings = asyncHandler(async (req, res) => {
    const { organizationId } = req.params;
    const { userId } = req.user;
    const settings = await organizationSettingsService.updateSettings(
      organizationId,
      req.body,
      userId
    );
    return ApiResponse.success(res, 200, 'Settings updated', settings);
  });

  resetSettings = asyncHandler(async (req, res) => {
    const { organizationId } = req.params;
    const { userId } = req.user;
    const settings = await organizationSettingsService.resetToDefaults(organizationId, userId);
    return ApiResponse.success(res, 200, 'Settings reset to defaults', settings);
  });

  validateDiscount = asyncHandler(async (req, res) => {
    const { organizationId } = req.params;
    const { discountPercent, userRole } = req.query;
    const result = await organizationSettingsService.validateDiscount(
      organizationId,
      parseFloat(discountPercent),
      userRole
    );
    return ApiResponse.success(res, 200, 'Discount validation result', result);
  });

  validateRefund = asyncHandler(async (req, res) => {
    const { organizationId } = req.params;
    const { amount } = req.query;
    const result = await organizationSettingsService.validateRefund(
      organizationId,
      parseFloat(amount)
    );
    return ApiResponse.success(res, 200, 'Refund validation result', result);
  });

  validateCancellation = asyncHandler(async (req, res) => {
    const { organizationId } = req.params;
    const { orderStatus } = req.query;
    const result = await organizationSettingsService.validateCancellation(organizationId, orderStatus);
    return ApiResponse.success(res, 200, 'Cancellation validation result', result);
  });

  getPaymentMethods = asyncHandler(async (req, res) => {
    const { organizationId } = req.params;
    const methods = await organizationSettingsService.getPaymentMethods(organizationId);
    return ApiResponse.success(res, 200, 'Payment methods retrieved', methods);
  });
}

module.exports = new OrganizationSettingsController();