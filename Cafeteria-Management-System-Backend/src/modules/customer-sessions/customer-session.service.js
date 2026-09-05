const crypto = require('crypto');
const CustomerSession = require('./customer-session.model');
const { Table } = require('../tables/table.model');
const config = require('../../config/env');
const { NotFoundError, BadRequestError, ConflictError } = require('../../utils/errors');

class CustomerSessionService {
  generateSessionToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  getSessionExpiry() {
    const hours = config.customerSession?.expiresInHours || 6;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + hours);
    return expiresAt;
  }

  async createSessionByQR(qrToken) {
    if (!qrToken) {
      throw new BadRequestError('QR Token is required to initialize session', 'MISSING_QR_TOKEN');
    }

    const table = await Table.findOne({
      qrToken,
      isActive: true,
      deletedAt: null,
    });

    if (!table) {
      throw new NotFoundError('Invalid QR code', 'INVALID_QR_CODE');
    }

    const existingSession = await CustomerSession.findOne({
      tableId: table._id,
      isActive: true,
      expiresAt: { $gt: new Date() },
    });

    if (existingSession) {
      return {
        sessionToken: existingSession.sessionToken,
        expiresAt: existingSession.expiresAt,
        tableId: table._id.toString(),
        table: {
          id: table._id,
          tableNumber: table.tableNumber,
          capacity: table.capacity,
        },
        restaurant: {
          name: 'Faarees Kaafee fi Restoorraantii',
          nameAm: 'ፋሪስ ካፌ እና ሪስቶራንት',
        },
        isExistingSession: true,
      };
    }

    const currentOccupancy = table.currentOccupancy || 0;
    if (currentOccupancy >= table.capacity) {
      throw new ConflictError(
        `Table ${table.tableNumber} is full. Please use another table.`,
        'TABLE_AT_CAPACITY'
      );
    }

    const sessionToken = this.generateSessionToken();
    const expiresAt = this.getSessionExpiry();

    const session = await CustomerSession.create({
      tableId: table._id,
      sessionToken,
      expiresAt,
      isActive: true,
      customerCount: 1,
    });

    await Table.findByIdAndUpdate(table._id, {
      $inc: { currentOccupancy: 1 },
      status: 'OCCUPIED',
    });

    return {
      sessionToken: session.sessionToken,
      expiresAt: session.expiresAt,
      tableId: table._id.toString(),
      customerCount: session.customerCount,
      table: {
        id: table._id,
        tableNumber: table.tableNumber,
        capacity: table.capacity,
        currentOccupancy: currentOccupancy + 1,
      },
      restaurant: {
        name: 'Faarees Kaafee fi Restoorraantii',
        nameAm: 'ፋሪስ ካፌ እና ሪስቶራንት',
      },
      isExistingSession: false,
    };
  }

  async getSessionDetails(sessionToken) {
    const session = await CustomerSession.findOne({
      sessionToken,
      isActive: true,
    }).populate('tableId', 'tableNumber capacity status');

    if (!session) {
      throw new NotFoundError('Session not found or expired. Please scan QR again.', 'INVALID_SESSION');
    }

    if (new Date() > session.expiresAt) {
      session.isActive = false;
      await session.save();
      throw new NotFoundError('Session has expired. Please scan QR again.', 'SESSION_EXPIRED');
    }

    return session;
  }

  async closeSession(sessionToken) {
    const session = await CustomerSession.findOne({ sessionToken, isActive: true });
    if (session && session.tableId) {
      await Table.findByIdAndUpdate(session.tableId, {
        $inc: { currentOccupancy: -1 },
        status: 'AVAILABLE',
      });
      session.isActive = false;
      await session.save();
    }
    return { success: true, message: 'Session closed successfully' };
  }
}

module.exports = new CustomerSessionService();
