const organizationService = require('./organization.service');
const ApiResponse = require('../../utils/response');
const asyncHandler = require('../../utils/async-handler');

class OrganizationController {
  getOrganization = asyncHandler(async (req, res) => {
    const org = await organizationService.getOrganizationById(req.params.organizationId);
    return ApiResponse.success(res, 200, 'Organization retrieved successfully', org);
  });

  updateOrganization = asyncHandler(async (req, res) => {
    const org = await organizationService.updateOrganization(req.params.organizationId, req.body);
    return ApiResponse.success(res, 200, 'Organization updated successfully', org);
  });

  getBranches = asyncHandler(async (req, res) => {
    const branches = await organizationService.getBranchesByOrganization(req.params.organizationId);
    return ApiResponse.success(res, 200, 'Branches retrieved successfully', branches);
  });

  createBranch = asyncHandler(async (req, res) => {
    const branch = await organizationService.createBranch(req.params.organizationId, req.body);
    return ApiResponse.created(res, 'Branch created successfully', branch);
  });
}

module.exports = new OrganizationController();
