const branchService = require('./branch.service');
const ApiResponse = require('../../utils/response');
const asyncHandler = require('../../utils/async-handler');

class BranchController {
  /**
   * Public listing of all active branches (no auth required).
   * Powers the customer landing page so anonymous visitors can browse
   * the brand / menu in view-only mode.
   */
  listPublicBranches = asyncHandler(async (req, res) => {
    const branches = await branchService.listPublicBranches();
    return ApiResponse.success(res, 200, 'Public branches retrieved', branches);
  });

  getBranch = asyncHandler(async (req, res) => {
    const branch = await branchService.getBranchById(req.params.branchId);
    return ApiResponse.success(res, 200, 'Branch retrieved successfully', branch);
  });

  updateBranch = asyncHandler(async (req, res) => {
    const branch = await branchService.updateBranch(req.params.branchId, req.body);
    return ApiResponse.success(res, 200, 'Branch updated successfully', branch);
  });

  deleteBranch = asyncHandler(async (req, res) => {
    const result = await branchService.deleteBranch(req.params.branchId);
    return ApiResponse.success(res, 200, result.message);
  });

  generateBranchQr = asyncHandler(async (req, res) => {
    const result = await branchService.generateBranchQr(req.params.branchId);
    return ApiResponse.success(res, 200, 'Branch QR code generated successfully', result);
  });
}

module.exports = new BranchController();
