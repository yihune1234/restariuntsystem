const stockService = require('./stock.service');
const ApiResponse = require('../../utils/response');
const asyncHandler = require('../../utils/async-handler');

class StockController {
  setStock = asyncHandler(async (req, res) => {
    const stock = await stockService.setDailyStock(req.params.branchId, req.body);
    return ApiResponse.success(res, 200, 'Daily stock updated successfully', stock);
  });

  bulkSetStock = asyncHandler(async (req, res) => {
    const { items, businessDate } = req.body;
    const stocks = await stockService.bulkSetDailyStock(req.params.branchId, items, businessDate);
    return ApiResponse.success(res, 200, 'Bulk daily stock updated successfully', stocks);
  });

  getTodayStock = asyncHandler(async (req, res) => {
    const { businessDate } = req.query;
    const stocks = await stockService.getTodayStock(req.params.branchId, businessDate);
    return ApiResponse.success(res, 200, "Today's stock overview retrieved successfully", stocks);
  });

  updateStock = asyncHandler(async (req, res) => {
    const stock = await stockService.updateStock(req.params.stockId, req.body);
    return ApiResponse.success(res, 200, 'Stock record updated successfully', stock);
  });
}

module.exports = new StockController();
