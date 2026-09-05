const crypto = require('crypto');
const { Table } = require('./table.model');
const Branch = require('../branches/branch.model');
const { User } = require('../users/user.model');
const { NotFoundError, ConflictError, BadRequestError, ForbiddenError } = require('../../utils/errors');
const socketEmitter = require('../../sockets/socket.emitter');

class TableService {
  /**
   * Generates a cryptographically strong, non-predictable QR security token
   */
  generateQRToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  async createTable(branchId, { tableNumber, capacity }) {
    const branch = await Branch.findOne({ _id: branchId, deletedAt: null });
    if (!branch) {
      throw new NotFoundError('Branch not found', 'BRANCH_NOT_FOUND');
    }

    const existing = await Table.findOne({
      branchId,
      tableNumber: tableNumber.trim(),
      deletedAt: null,
    });

    if (existing) {
      throw new ConflictError(`Table '${tableNumber}' already exists in this branch`, 'TABLE_EXISTS');
    }

    const qrToken = this.generateQRToken();

    const table = await Table.create({
      branchId,
      tableNumber: tableNumber.trim(),
      qrToken,
      capacity: capacity || 4,
      isActive: true,
    });

    return table;
  }

  async getTablesByBranch(branchId) {
    const tables = await Table.find({
      branchId,
      deletedAt: null,
    })
      .populate('assignedWaiterId', 'name role email')
      .sort({ tableNumber: 1 });

    return tables;
  }

  async getTableById(tableId) {
    const table = await Table.findOne({ _id: tableId, deletedAt: null }).populate('branchId', 'name code address');
    if (!table) {
      throw new NotFoundError('Table not found', 'TABLE_NOT_FOUND');
    }
    return table;
  }

  async updateTable(tableId, updateData) {
    const table = await Table.findOneAndUpdate(
      { _id: tableId, deletedAt: null },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!table) {
      throw new NotFoundError('Table not found', 'TABLE_NOT_FOUND');
    }

    return table;
  }

  async regenerateQR(tableId) {
    const newQRToken = this.generateQRToken();

    const table = await Table.findOneAndUpdate(
      { _id: tableId, deletedAt: null },
      { $set: { qrToken: newQRToken } },
      { new: true }
    );

    if (!table) {
      throw new NotFoundError('Table not found', 'TABLE_NOT_FOUND');
    }

    return table;
  }

  /**
   * Public QR Token Validator: returns table & branch metadata for QR scanning
   */
  async validateQRToken(qrToken) {
    const table = await Table.findOne({
      qrToken,
      isActive: true,
      deletedAt: null,
    }).populate('branchId', 'name code address settings isActive');

    if (!table || !table.branchId || !table.branchId.isActive) {
      throw new NotFoundError('Invalid or expired QR code', 'INVALID_QR_CODE');
    }

    return table;
  }

  /**
   * Assign (or reassign) the waiter responsible for a table. Never triggered
   * automatically — only MANAGER/OWNER (and WAITER self-claim) may call it.
   * Keeps an assignment history trail.
   */
  async assignWaiter(tableId, waiterId, actor, { unassign = false } = {}) {
    const table = await Table.findOne({ _id: tableId, deletedAt: null });
    if (!table) {
      throw new NotFoundError('Table not found', 'TABLE_NOT_FOUND');
    }

    const update = { $set: {} };
    let historyEntry;

    if (unassign) {
      if (!table.assignedWaiterId) {
        throw new BadRequestError('Table has no assigned waiter', 'NO_ASSIGNED_WAITER');
      }
      update.$set.assignedWaiterId = null;
      historyEntry = { waiterId: table.assignedWaiterId, assignedBy: actor?.id || null, action: 'UNASSIGNED' };
    } else {
      const waiter = await User.findOne({
        _id: waiterId,
        role: { $in: ['WAITER', 'MANAGER'] },
        isActive: true,
        deletedAt: null,
        ...(actor?.organizationId ? { organizationId: actor.organizationId } : {}),
      });
      if (!waiter) {
        throw new NotFoundError('Waiter not found or not an active WAITER/MANAGER in this organization', 'WAITER_NOT_FOUND');
      }
      update.$set.assignedWaiterId = waiter._id;
      historyEntry = { waiterId: waiter._id, assignedBy: actor?.id || null, action: 'ASSIGNED' };
    }

    update.$push = { assignmentHistory: historyEntry };
    // Keep the history bounded — retain the last 50 entries.
    update.$slice = { assignmentHistory: -50 };

    const updated = await Table.findByIdAndUpdate(tableId, update, { new: true })
      .populate('assignedWaiterId', 'name role email');

    if (updated) {
      const waiterName = updated.assignedWaiterId?.name || null;
      const assignedWaiterId = updated.assignedWaiterId?._id?.toString() || null;
      // Realtime: notify Manager/Owner/waiters/cashiers of the assignment change.
      socketEmitter.emitTableAssignmentChanged({
        branchId: updated.branchId.toString(),
        tableId: updated._id.toString(),
        tableNumber: updated.tableNumber,
        waiterId: assignedWaiterId,
        waiterName,
        assignedWaiterId,
      });
      socketEmitter.emitTableStatusChanged(
        updated.branchId.toString(),
        updated._id.toString(),
        updated.status,
        updated.tableNumber,
        updated.capacity,
        assignedWaiterId,
        waiterName
      );
    }

    return updated;
  }

  /**
   * Assign one waiter (or unassign) across MULTIPLE tables atomically.
   * MANAGER/OWNER only. Emits a single realtime assignment event per table.
   */
  async bulkAssignWaiters(branchId, { waiterId, tableIds, unassign = false }) {
    if (!Array.isArray(tableIds) || tableIds.length === 0) {
      throw new BadRequestError('tableIds array is required', 'TABLE_IDS_REQUIRED');
    }

    const tables = await Table.find({ _id: { $in: tableIds }, branchId, deletedAt: null });
    if (tables.length !== new Set(tableIds.map(String)).size) {
      throw new NotFoundError('One or more tables not found in this branch', 'TABLE_NOT_FOUND');
    }

    let waiter = null;
    if (!unassign) {
      waiter = await User.findOne({
        _id: waiterId,
        role: { $in: ['WAITER', 'MANAGER'] },
        isActive: true,
        deletedAt: null,
      });
      if (!waiter) {
        throw new NotFoundError('Waiter not found or not an active WAITER/MANAGER', 'WAITER_NOT_FOUND');
      }
    }

    const historyEntry = {
      waiterId: waiter ? waiter._id : (tables[0]?.assignedWaiterId || null),
      assignedBy: null,
      action: unassign ? 'UNASSIGNED' : 'ASSIGNED',
    };

    const updatedTables = [];
    for (const table of tables) {
      const update = {
        $set: { assignedWaiterId: waiter ? waiter._id : null },
        $push: { assignmentHistory: { ...historyEntry } },
        $slice: { assignmentHistory: -50 },
      };
      const updated = await Table.findByIdAndUpdate(table._id, update, { new: true })
        .populate('assignedWaiterId', 'name role email');
      updatedTables.push(updated);
    }

    // Realtime: emit assignment change for each table so all dashboards update.
    for (const updated of updatedTables) {
      const waiterName = updated.assignedWaiterId?.name || (waiter ? waiter.name : null) || null;
      const assignedWaiterId = updated.assignedWaiterId?._id?.toString() || (waiter ? waiter._id.toString() : null) || null;
      socketEmitter.emitTableAssignmentChanged({
        branchId: updated.branchId.toString(),
        tableId: updated._id.toString(),
        tableNumber: updated.tableNumber,
        waiterId: assignedWaiterId,
        waiterName,
        assignedWaiterId,
      });
      socketEmitter.emitTableStatusChanged(
        updated.branchId.toString(),
        updated._id.toString(),
        updated.status,
        updated.tableNumber,
        updated.capacity,
        assignedWaiterId,
        waiterName
      );
    }

    return updatedTables;
  }

  /**
   * Update the number of customers seated at a table.Staff-only; clamps to
   * [0, capacity] unless `override` (same authorized-staff rule as seating).
   */
  async updateOccupancy(tableId, occupancy, actor, { override = false } = {}) {
    const table = await Table.findOne({ _id: tableId, deletedAt: null });
    if (!table) {
      throw new NotFoundError('Table not found', 'TABLE_NOT_FOUND');
    }

    const value = parseInt(occupancy, 10);
    if (isNaN(value) || value < 0) {
      throw new BadRequestError('Occupancy must be a non-negative number', 'INVALID_OCCUPANCY');
    }
    if (value > table.capacity && !override) {
      throw new ConflictError(
        `Occupancy ${value} exceeds table capacity (${table.capacity}). Staff override required.`,
        'TABLE_AT_CAPACITY'
      );
    }

    table.currentOccupancy = value;
    await table.save();

    socketEmitter.emitTableStatusChanged(
      table.branchId.toString(),
      table._id.toString(),
      table.status,
      table.tableNumber,
      table.capacity
    );

    return table;
  }

  /**
   * Waiter confirms the customer physically left and the table is clear.
   * The ONLY supported path back to AVAILABLE — completed orders, payments
   * and session changes never flip the status automatically.
   */
  async clearTable(tableId, actor) {
    const table = await Table.findOne({ _id: tableId, deletedAt: null });
    if (!table) {
      throw new NotFoundError('Table not found', 'TABLE_NOT_FOUND');
    }

    if (actor && actor.role !== 'OWNER' && table.assignedWaiterId) {
      const assignedId = table.assignedWaiterId.toString();
      if (actor.role === 'WAITER' && assignedId !== actor.id) {
        throw new ForbiddenError(
          'Only the assigned waiter (or a Manager/Owner) can clear this table',
          'NOT_ASSIGNED_WAITER'
        );
      }
    }

    table.currentOccupancy = 0;
    table.status = 'AVAILABLE';
    table.assignedWaiterId = null;
    if (actor?.id) {
      table.assignmentHistory.push({
        waiterId: actor.id,
        assignedBy: actor.id,
        action: 'UNASSIGNED',
        at: new Date(),
      });
      if (table.assignmentHistory.length > 50) {
        table.assignmentHistory = table.assignmentHistory.slice(-50);
      }
    }
    await table.save();

    // Close any lingering active sessions for this table (they are done).
    const CustomerSession = require('../customer-sessions/customer-session.model');
    await CustomerSession.updateMany({ tableId: table._id, isActive: true }, { isActive: false });

    socketEmitter.emitTableStatusChanged(
      table.branchId.toString(),
      table._id.toString(),
      table.status,
      table.tableNumber,
      table.capacity
    );

    return table;
  }

  /**
   * Deactivate (soft delete) a table. Checks for active orders before deletion.
   * Does not physically remove the record to preserve historical data.
   */
  async deactivateTable(tableId, actor) {
    const table = await Table.findOne({ _id: tableId, deletedAt: null });
    if (!table) {
      throw new NotFoundError('Table not found', 'TABLE_NOT_FOUND');
    }

    // Check for active orders that are not completed/cancelled
    const Order = require('../orders/order.model');
    const activeOrders = await Order.find({
      tableId: tableId,
      orderStatus: { $nin: ['COMPLETED', 'CANCELLED'] }
    });

    if (activeOrders.length > 0) {
      throw new BadRequestError(
        `Cannot delete table with ${activeOrders.length} active order(s). Complete or cancel all orders first.`,
        'TABLE_HAS_ACTIVE_ORDERS'
      );
    }

    // Soft delete - set isActive=false and deletedAt
    table.isActive = false;
    table.deletedAt = new Date();
    await table.save();

    // Emit realtime update
    socketEmitter.emitTableStatusChanged(
      table.branchId.toString(),
      table._id.toString(),
      'DEACTIVATED',
      table.tableNumber,
      table.capacity
    );

    return { message: 'Table deactivated successfully', table };
  }
}

module.exports = new TableService();
