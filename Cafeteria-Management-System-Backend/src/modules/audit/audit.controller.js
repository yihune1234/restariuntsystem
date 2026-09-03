const auditService = require('./audit.service');
const ApiResponse = require('../../utils/response');
const asyncHandler = require('../../utils/async-handler');

class AuditController {
  getBranchAuditLogs = asyncHandler(async (req, res) => {
    const result = await auditService.getBranchAuditLogs(req.params.branchId, req.query);
    return ApiResponse.success(res, 200, 'Audit logs retrieved successfully', result.logs, {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    });
  });
}

module.exports = new AuditController();
