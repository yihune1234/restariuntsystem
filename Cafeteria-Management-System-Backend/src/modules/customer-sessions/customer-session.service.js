const crypto = require('crypto');
const CustomerSession = require('./customer-session.model');
const { Table } = require('../tables/table.model');
const Branch = require('../branches/branch.model');
const config = require('../../config/env');
const socketEmitter = require('../../sockets/socket.emitter');
const { NotFoundError, UnauthorizedError, BadRequestError, ConflictError } = require('../../utils/errors');

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

  /**
   * Create a customer session from a scanned QR code
   * Automatically detects if it's a table QR or general branch QR
   *
   * @param {string} qrToken
   * @param {object} [opts]
   * @param {boolean} [opts.staffOverride] - allow seating on a full table when
   *   an authorized staff member explicitly approves the override
   */
  async createSessionByQR(qrToken, { staffOverride = false } = {}) {
    if (!qrToken) {
      throw new BadRequestError('QR Token is required to initialize session', 'MISSING_QR_TOKEN');
    }

    const table = await Table.findOne({
      qrToken,
      isActive: true,
      deletedAt: null,
    }).populate('branchId', 'name code address settings isActive');

    if (table && table.branchId && table.branchId.isActive) {
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
            currentOccupancy: table.currentOccupancy,
          },
          branchId: table.branchId._id.toString(),
          branch: {
            id: table.branchId._id,
            name: table.branchId.name,
            code: table.branchId.code,
            address: table.branchId.address,
            currency: table.branchId.settings?.currency || 'ETB',
            taxRate: table.branchId.settings?.taxRate || 0.15,
          },
          isExistingSession: true,
        };
      }

      /**
       * Capacity guard: a new table session consumes at least one seat.
       * Full tables are refused unless an authorized staff member explicitly
       * overrides (seated by host, walk-in at a reserved table, etc.).
       */
      const currentOccupancy = table.currentOccupancy || 0;
      if (currentOccupancy >= table.capacity && !staffOverride) {
        throw new ConflictError(
          `Table ${table.tableNumber} is full (${table.capacity}/${table.capacity} seats). ` +
            'Please ask a staff member to override or use another table.',
          'TABLE_AT_CAPACITY'
        );
      }

      const sessionToken = this.generateSessionToken();
      const expiresAt = this.getSessionExpiry();

      const session = await CustomerSession.create({
        branchId: table.branchId._id,
        tableId: table._id,
        sessionToken,
        expiresAt,
        isActive: true,
        customerCount: 1,
      });

      /**
       * A new seating at the table marks it OCCUPIED (moving it out of the
       * AVAILABLE pool) and increments the seat count. The table only returns
       * to AVAILABLE once every active session ends and occupancy reaches
       * zero — it is NOT freed while any customer/order remains.
       */
      const updatedTable = await Table.findByIdAndUpdate(
        table._id,
        [
          {
            $set: {
              // Mark the table OCCUPIED only when transitioning from an empty table.
              status: { $cond: [{ $eq: [{ $ifNull: ['$currentOccupancy', 0] }, 0] }, 'OCCUPIED', '$status'] },
              // Pipelines cannot use $inc — use $add on the (null-safe) field.
              currentOccupancy: { $add: [{ $ifNull: ['$currentOccupancy', 0] }, 1] },
            },
          },
        ],
        { new: true }
      );
      socketEmitter.emitTableStatusChanged(
        table._id.toString(),
        table._id.toString(),
        updatedTable.status,
        updatedTable.tableNumber,
        updatedTable.capacity
      );

      return {
        sessionToken: session.sessionToken,
        expiresAt: session.expiresAt,
        tableId: table._id.toString(),
        customerCount: session.customerCount,
        table: {
          id: updatedTable._id,
          tableNumber: updatedTable.tableNumber,
          capacity: updatedTable.capacity,
          currentOccupancy: updatedTable.currentOccupancy,
          assignedWaiterId: updatedTable.assignedWaiterId,
        },
        branchId: table.branchId._id.toString(),
        branch: {
          id: table.branchId._id,
          name: table.branchId.name,
          code: table.branchId.code,
          address: table.branchId.address,
          currency: table.branchId.settings?.currency || 'ETB',
          taxRate: table.branchId.settings?.taxRate || 0.15,
        },
        isExistingSession: false,
      };
    }

    const branch = await Branch.findOne({
      branchQrToken: qrToken,
      isActive: true,
      deletedAt: null,
    });

    if (!branch) {
      throw new NotFoundError('Invalid QR code - not a valid table or restaurant QR', 'INVALID_QR_TOKEN');
    }

    const sessionToken = this.generateSessionToken();
    const expiresAt = this.getSessionExpiry();

    const session = await CustomerSession.create({
      branchId: branch._id,
      tableId: null,
      sessionToken,
      expiresAt,
      isActive: true,
    });

    return {
      sessionToken: session.sessionToken,
      expiresAt: session.expiresAt,
      tableId: null,
      table: null,
      branchId: branch._id.toString(),
      branch: {
        id: branch._id,
        name: branch.name,
        code: branch.code,
        address: branch.address,
        currency: branch.settings?.currency || 'ETB',
        taxRate: branch.settings?.taxRate || 0.15,
      },
    };
  }

  /**
   * Validate and retrieve customer session details
   */
  async getSessionDetails(sessionToken) {
    const session = await CustomerSession.findOne({
      sessionToken,
      isActive: true,
    })
      .populate('tableId', 'tableNumber capacity status currentOccupancy assignedWaiterId')
      .populate('branchId', 'name code address settings isActive');

    if (!session) {
      throw new UnauthorizedError('Session not found or expired. Please scan QR again.', 'INVALID_SESSION');
    }

    if (new Date() > session.expiresAt) {
      session.isActive = false;
      await session.save();
      throw new UnauthorizedError('Session has expired. Please scan QR again.', 'SESSION_EXPIRED');
    }

    return session;
  }

  /**
   * Terminate active customer session. Frees the seat taken by this session
   * (occupancy decremented). Once the last seat is freed (occupancy reaches 0)
   * the table returns to AVAILABLE. If other customers/sessions remain, the
   * table stays OCCUPIED — it is not freed while anyone is still seated.
   */
  async closeSession(sessionToken) {
    const session = await CustomerSession.findOne({ sessionToken, isActive: true });
    if (session) {
      session.isActive = false;
      await session.save();
      if (session.tableId) {
        const updated = await Table.findByIdAndUpdate(
          session.tableId,
          [
            {
              $set: {
                currentOccupancy: { $max: [0, { $subtract: ['$currentOccupancy', 1] }] },
              },
            },
            {
              $set: {
                status: { $cond: [{ $gt: ['$currentOccupancy', 1] }, 'OCCUPIED', 'AVAILABLE'] },
              },
            },
          ],
          { new: true }
        );
        if (updated) {
          socketEmitter.emitTableStatusChanged(
            updated._id.toString(),
            updated._id.toString(),
            updated.status,
            updated.tableNumber,
            updated.capacity
          );
        }
      }
    }
    return { success: true, message: 'Session closed successfully' };
  }
}

module.exports = new CustomerSessionService();
