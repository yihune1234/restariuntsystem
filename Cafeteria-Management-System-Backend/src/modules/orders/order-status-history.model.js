const mongoose = require('mongoose');

const orderStatusHistorySchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    fromStatus: {
      type: String,
      required: true,
    },
    toStatus: {
      type: String,
      required: true,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // null if changed by system/webhook or customer action
    },
    changedByRole: {
      type: String,
      default: 'SYSTEM',
    },
    reason: {
      type: String,
      default: '',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Immutable record
    toJSON: {
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

orderStatusHistorySchema.index({ orderId: 1, createdAt: 1 });

const OrderStatusHistory = mongoose.model('OrderStatusHistory', orderStatusHistorySchema);

module.exports = OrderStatusHistory;
