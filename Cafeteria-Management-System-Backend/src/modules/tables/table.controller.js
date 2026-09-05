const tableService = require('./table.service');
const ApiResponse = require('../../utils/response');
const asyncHandler = require('../../utils/async-handler');
const { ForbiddenError } = require('../../utils/errors');

class TableController {
  createTable = asyncHandler(async (req, res) => {
    const table = await tableService.createTable(req.params.branchId, req.body);
    return ApiResponse.created(res, 'Table created successfully', table);
  });

  getTablesByBranch = asyncHandler(async (req, res) => {
    const tables = await tableService.getTablesByBranch(req.params.branchId);
    return ApiResponse.success(res, 200, 'Branch tables retrieved successfully', tables);
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
      branch: {
        id: table.branchId._id,
        name: table.branchId.name,
        code: table.branchId.code,
        address: table.branchId.address,
        currency: table.branchId.settings?.currency || 'ETB',
      },
    });
  });

  /**
   * Assign or reassign the responsible waiter (MANAGER/OWNER; WAITER may
   * self-claim). Pass { unassign: true } to clear the assignment.
   */
  assignWaiter = asyncHandler(async (req, res) => {
    const { waiterId, unassign } = req.body;

    // WAITER may only claim for themselves; MANAGER/OWNER may assign anyone.
    if (req.user.role === 'WAITER' && !unassign) {
      if (waiterId !== req.user.id) {
        throw new ForbiddenError('A waiter can only claim a table for themselves', 'WAITER_SELF_CLAIM_ONLY');
      }
    }

    const table = await tableService.assignWaiter(req.params.tableId, waiterId, req.user, {
      unassign: unassign === true,
    });
    return ApiResponse.success(res, 200, 'Table waiter assignment updated', table);
  });

  /** Assign/unassign one waiter across MANY tables at once (MANAGER/OWNER). */
  bulkAssignWaiters = asyncHandler(async (req, res) => {
    const { branchId } = req.params;
    const { waiterId, tableIds, unassign } = req.body;

    if (req.user.role === 'WAITER') {
      throw new ForbiddenError('Only a Manager or Owner can bulk-assign tables', 'NOT_AUTHORIZED');
    }

    const tables = await tableService.bulkAssignWaiters(branchId, {
      waiterId,
      tableIds: Array.isArray(tableIds) ? tableIds : [tableIds],
      unassign: unassign === true,
    });
    return ApiResponse.success(res, 200, `Assignment updated on ${tables.length} table(s)`, tables);
  });

  /** Update the seated-customer count (staff-only, capacity-guarded). */
  updateOccupancy = asyncHandler(async (req, res) => {
    const override =
      req.user && ['OWNER', 'MANAGER'].includes(req.user.role) && req.body.override === true;
    const table = await tableService.updateOccupancy(
      req.params.tableId,
      req.body.occupancy,
      req.user,
      { override }
    );
    return ApiResponse.success(res, 200, 'Table occupancy updated', table);
  });

  /**
   * Waiter/Manager/Owner confirms the customer physically left. The ONLY
   * path that returns a table to AVAILABLE — completed orders, payments and
   * session changes never flip the status automatically.
   */
  clearTable = asyncHandler(async (req, res) => {
    const table = await tableService.clearTable(req.params.tableId, req.user);
    return ApiResponse.success(res, 200, 'Table cleared and available', table);
  });

  /**
   * Deactivate (soft delete) a table. Checks for active orders before deletion.
   */
  deactivateTable = asyncHandler(async (req, res) => {
    const result = await tableService.deactivateTable(req.params.tableId, req.user);
    return ApiResponse.success(res, 200, result.message, result.table);
  });
}

module.exports = new TableController();
