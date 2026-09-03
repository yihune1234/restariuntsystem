const mongoose = require('mongoose');

const TABLE_STATUSES = ['AVAILABLE', 'OCCUPIED', 'RESERVED'];

const tableSchema = new mongoose.Schema(
  {
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: [true, 'Branch reference is required'],
      index: true,
    },
    tableNumber: {
      type: String,
      required: [true, 'Table number or identifier is required'],
      trim: true,
    },
    qrToken: {
      type: String,
      required: [true, 'QR token is required'],
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: TABLE_STATUSES,
      default: 'AVAILABLE',
      index: true,
    },
    /** Number of seats currently in use at this table (<= capacity normally). */
    currentOccupancy: {
      type: Number,
      default: 0,
      min: 0,
    },
    /**
     * Waiter responsible for this table while it is occupied. Only set
     * explicitly by MANAGER/OWNER/WAITER — never auto-changed by sessions or
     * orders.
     */
    assignedWaiterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    /** History of waiter assignments for audit / "keep assignment history". */
    assignmentHistory: [
      {
        waiterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        action: { type: String, enum: ['ASSIGNED', 'UNASSIGNED'], default: 'ASSIGNED' },
        at: { type: Date, default: Date.now },
      },
    ],
    capacity: {
      type: Number,
      default: 4,
      min: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound index to guarantee uniqueness of table numbers within a branch
tableSchema.index({ branchId: 1, tableNumber: 1 }, { unique: true });
tableSchema.index({ branchId: 1, isActive: 1, deletedAt: 1 });
tableSchema.index({ branchId: 1, assignedWaiterId: 1 });

const Table = mongoose.model('Table', tableSchema);

module.exports = {
  Table,
  TABLE_STATUSES,
};
