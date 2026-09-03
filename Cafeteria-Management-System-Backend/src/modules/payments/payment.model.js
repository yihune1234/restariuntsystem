const mongoose = require('mongoose');

const PAYMENT_PROVIDERS = ['CHAPA', 'TELEBIRR', 'CASHIER_CASH', 'CASHIER_CARD', 'CASHIER_BANK_TRANSFER'];

const PAYMENT_STATUSES = [
  'PENDING',
  'PAID',
  'FAILED',
  'CANCELLED',
  'REFUNDED',
];

const paymentSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: [true, 'Order reference is required'],
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: [true, 'Branch reference is required'],
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization reference is required'],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [0, 'Amount must be positive'],
    },
    currency: {
      type: String,
      default: 'ETB',
      uppercase: true,
    },
    provider: {
      type: String,
      enum: PAYMENT_PROVIDERS,
      required: [true, 'Payment provider is required'],
      index: true,
    },
    status: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: 'PENDING',
      index: true,
    },
    transactionReference: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    providerReference: {
      type: String,
      default: '',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // Staff who confirmed cashier payment
    },
    paidAt: {
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

// Compound index for querying payments by branch and date
paymentSchema.index({ branchId: 1, createdAt: -1 });
paymentSchema.index({ organizationId: 1, createdAt: -1 });
paymentSchema.index({ branchId: 1, status: 1, provider: 1 });

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = {
  Payment,
  PAYMENT_PROVIDERS,
  PAYMENT_STATUSES,
};
