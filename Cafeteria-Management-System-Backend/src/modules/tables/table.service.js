const crypto = require('crypto');
const { Table } = require('./table.model');
const { NotFoundError, ConflictError, BadRequestError } = require('../../utils/errors');

class TableService {
  generateQRToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  async createTable({ tableNumber, capacity }) {
    const existing = await Table.findOne({
      tableNumber: tableNumber.trim(),
      deletedAt: null,
    });

    if (existing) {
      throw new ConflictError(`Table '${tableNumber}' already exists`, 'TABLE_EXISTS');
    }

    const qrToken = this.generateQRToken();

    const table = await Table.create({
      tableNumber: tableNumber.trim(),
      qrToken,
      capacity: capacity || 4,
      isActive: true,
    });

    return table;
  }

  async getTables() {
    const tables = await Table.find({
      deletedAt: null,
    }).sort({ tableNumber: 1 });

    return tables;
  }

  async getTableById(tableId) {
    const table = await Table.findOne({ _id: tableId, deletedAt: null });
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

  async validateQRToken(qrToken) {
    const table = await Table.findOne({
      qrToken,
      isActive: true,
      deletedAt: null,
    });

    if (!table) {
      throw new NotFoundError('Invalid or expired QR code', 'INVALID_QR_CODE');
    }

    return table;
  }

  async deactivateTable(tableId) {
    const table = await Table.findOne({ _id: tableId, deletedAt: null });
    if (!table) {
      throw new NotFoundError('Table not found', 'TABLE_NOT_FOUND');
    }

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

    table.isActive = false;
    table.deletedAt = new Date();
    await table.save();

    return { message: 'Table deactivated successfully', table };
  }
}

module.exports = new TableService();
