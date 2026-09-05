const reportService = require('./report.service');
const ApiResponse = require('../../utils/response');
const asyncHandler = require('../../utils/async-handler');

class ReportController {
  getSalesReport = asyncHandler(async (req, res) => {
    const report = await reportService.getSalesReport(req.query);
    return ApiResponse.success(res, 200, 'Sales report generated', report);
  });

  getOrdersReport = asyncHandler(async (req, res) => {
    const report = await reportService.getOrdersReport(req.query);
    return ApiResponse.success(res, 200, 'Orders report generated', report);
  });

  getPaymentsReport = asyncHandler(async (req, res) => {
    const report = await reportService.getPaymentsReport(req.query);
    return ApiResponse.success(res, 200, 'Payments report generated', report);
  });

  getFoodReport = asyncHandler(async (req, res) => {
    const report = await reportService.getFoodReport(req.query);
    return ApiResponse.success(res, 200, 'Food report generated', report);
  });

  getDashboardKPIs = asyncHandler(async (req, res) => {
    const report = await reportService.getDashboardKPIs();
    return ApiResponse.success(res, 200, 'Dashboard KPIs retrieved', report);
  });

  getHourlySalesAnalysis = asyncHandler(async (req, res) => {
    const report = await reportService.getHourlySalesAnalysis();
    return ApiResponse.success(res, 200, 'Hourly sales analysis retrieved', report);
  });
}

module.exports = new ReportController();
