const tableService = require('./table.service');
const ApiResponse = require('../../utils/response');
const asyncHandler = require('../../utils/async-handler');

class TableController {
  createTable = asyncHandler(async (req, res) => {
    const table = await tableService.createTable(req.body);
    return ApiResponse.created(res, 'Table created successfully', table);
  });

  getTables = asyncHandler(async (req, res) => {
    const tables = await tableService.getTables();
    return ApiResponse.success(res, 200, 'Tables retrieved successfully', tables);
  });

  getTableById = asyncHandler(async (req, res) => {
    const table = await tableService.getTableById(req.params.tableId);
    return ApiResponse.success(res, 200, 'Table retrieved successfully', table);
  });

  updateTable = asyncHandler(async (req, res) => {
    const table = await tableService.updateTable(req.params.tableId, req.body);
    return ApiResponse.success(res, 200, 'Table updated successfully', table);
  });

  regenerateQR = asyncHandler(async (req, res) => {
    const table = await tableService.regenerateQR(req.params.tableId);
    return ApiResponse.success(res, 200, 'Table QR code regenerated successfully', table);
  });

  validateQR = asyncHandler(async (req, res) => {
    const table = await tableService.validateQRToken(req.params.qrToken);
    return ApiResponse.success(res, 200, 'QR code is valid', {
      tableId: table._id,
      tableNumber: table.tableNumber,
      capacity: table.capacity,
      restaurant: {
        name: 'Faarees Kaafee fi Restoorraantii',
        nameAm: 'ፋሪስ ካፌ እና ሪስቶራንት',
      },
    });
  });

  deactivateTable = asyncHandler(async (req, res) => {
    const result = await tableService.deactivateTable(req.params.tableId);
    return ApiResponse.success(res, 200, result.message, result.table);
  });
}

module.exports = new TableController();
