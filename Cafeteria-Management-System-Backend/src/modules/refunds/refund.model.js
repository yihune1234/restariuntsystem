const mongoose = require('mongoose');

const REFUND_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'PROCESSED'];
const REFUND_METHODS = ['CASH', 'ORIGINAL_PAYMENT_METHOD', 'STORE_CREDIT', 'BANK_TRANSFER'];
const REFUND_REASONS = [
  'CUSTOMER_REQUEST',
  'ORDER_ERROR',
  'FOOD_QUALITY',
  'LATE_DELIVERY',
  'OVERCHARGE',
  'DUPLICATE_CHARGE',
  'SERVICE_ISSUE',
  'OTHER',
];

const refundSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },
    /** The original payment this refund is linked to (never deleted). */
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      required: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    /** Amount to refund (can be partial or full). */
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    /** Currency of the refund. */
    currency: {
      type: String,
      default: 'ETB',
    },
    status: {
      type: String,
      enum: REFUND_STATUSES,
      default: 'PENDING',
      index: true,
    },
    reason: {
      type: String,
      enum: REFUND_REASONS,
      required: true,
    },
    /** Detailed reason description (required for OTHER). */
    reasonDetails: {
      type: String,
      maxlength: 1000,
      default: '',
    },
    /** How the refund will be returned to the customer. */
    refundMethod: {
      type: String,
      enum: REFUND_METHODS,
      default: 'ORIGINAL_PAYMENT_METHOD',
    },
    /** Who requested the refund. */
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    /** Who approved the refund (Manager/Owner). */
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    /** Rejection details. */
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      maxlength: 500,
      default: '',
    },
    /** When the refund was actually processed (money returned). */
    processedAt: {
      type: Date,
      default: null,
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    /** Source of the refund request. */
    source: {
      type: String,
      enum: ['NORMAL', 'OFFLINE_MANUAL'],
      default: 'NORMAL',
    },
    /** Reference number for tracking. */
    referenceNumber: {
      type: String,
      unique: true,
      sparse: true,
    },
    notes: {
      type: String,
      maxlength: 1000,
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

refundSchema.index({ organizationId: 1, status: 1, createdAt: -1 });
refundSchema.index({ branchId: 1, status: 1 });
refundSchema.index({ orderId: 1 });

const Refund = mongoose.model('Refund', refundSchema);

module.exports = {
  Refund,
  REFUND_STATUSES,
  REFUND_METHODS,
  REFUND_REASONS,
};
