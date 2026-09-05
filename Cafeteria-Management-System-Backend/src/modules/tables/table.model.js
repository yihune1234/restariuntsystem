const mongoose = require('mongoose');

const tableSchema = new mongoose.Schema(
  {
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
      enum: ['AVAILABLE', 'OCCUPIED'],
      default: 'AVAILABLE',
      index: true,
    },
    currentOccupancy: {
      type: Number,
      default: 0,
      min: 0,
    },
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

tableSchema.index({ tableNumber: 1 }, { unique: true });

const Table = mongoose.model('Table', tableSchema);

const TABLE_STATUSES = ['AVAILABLE', 'OCCUPIED'];

module.exports = {
  Table,
  TABLE_STATUSES,
};
