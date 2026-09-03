const reportService = require('./report.service');
const ApiResponse = require('../../utils/response');
const asyncHandler = require('../../utils/async-handler');

class ReportController {
  getSalesReport = asyncHandler(async (req, res) => {
    const report = await reportService.getBranchSalesReport(req.params.branchId, req.query);
    return ApiResponse.success(res, 200, 'Branch sales report generated', report);
  });

  getOrdersReport = asyncHandler(async (req, res) => {
    const report = await reportService.getBranchOrdersReport(req.params.branchId, req.query);
    return ApiResponse.success(res, 200, 'Branch orders report generated', report);
  });

  getPaymentsReport = asyncHandler(async (req, res) => {
    const report = await reportService.getBranchPaymentsReport(req.params.branchId, req.query);
    return ApiResponse.success(res, 200, 'Branch payments report generated', report);
  });

  getFoodReport = asyncHandler(async (req, res) => {
    const report = await reportService.getBranchFoodReport(req.params.branchId, req.query);
    return ApiResponse.success(res, 200, 'Branch food report generated', report);
  });

  getOperationsReport = asyncHandler(async (req, res) => {
    const report = await reportService.getBranchOperationsReport(req.params.branchId, req.query);
    return ApiResponse.success(res, 200, 'Branch operations velocity report generated', report);
  });

  getOrgOverview = asyncHandler(async (req, res) => {
    const report = await reportService.getOrganizationOverview(req.params.organizationId);
    return ApiResponse.success(res, 200, 'Organization overview report generated', report);
  });

  getOwnerDashboardKPIs = asyncHandler(async (req, res) => {
    const { organizationId } = req.params;
    const { branchId } = req.query;
    const report = await reportService.getOwnerDashboardKPIs(organizationId, branchId);
    return ApiResponse.success(res, 200, 'Owner dashboard KPIs retrieved', report);
  });

  getHourlySalesAnalysis = asyncHandler(async (req, res) => {
    const { branchId } = req.params;
    const report = await reportService.getHourlySalesAnalysis(branchId);
    return ApiResponse.success(res, 200, 'Hourly sales analysis retrieved', report);
  });

  getBranchInventoryReport = asyncHandler(async (req, res) => {
    const report = await reportService.getBranchInventoryReport(req.params.branchId, req.query);
    return ApiResponse.success(res, 200, 'Branch inventory report generated', report);
  });

  getOrgInventoryOverview = asyncHandler(async (req, res) => {
    const report = await reportService.getOrganizationInventoryOverview(req.params.organizationId);
    return ApiResponse.success(res, 200, 'Organization inventory overview generated', report);
  });

  getBranchComparisonReport = asyncHandler(async (req, res) => {
    const report = await reportService.getBranchComparisonReport(req.params.organizationId);
    return ApiResponse.success(res, 200, 'Cross-branch comparison report generated', report);
  });
}

module.exports = new ReportController();
