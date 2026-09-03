const mongoose = require('mongoose');

const SHIFT_STATUSES = ['OPEN', 'CLOSED'];

const shiftSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: SHIFT_STATUSES,
      default: 'OPEN',
      index: true,
    },
    startingCash: {
      type: Number,
      default: 0,
      min: 0,
    },
    closingCash: {
      type: Number,
      default: null,
    },
    notes: {
      type: String,
      default: '',
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

shiftSchema.index({ branchId: 1, userId: 1, status: 1 });
shiftSchema.index({ branchId: 1, createdAt: -1 });

const Shift = mongoose.model('Shift', shiftSchema);

module.exports = {
  Shift,
  SHIFT_STATUSES,
};
