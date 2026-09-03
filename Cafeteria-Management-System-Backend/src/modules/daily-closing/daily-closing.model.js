const mongoose = require('mongoose');

const CLOSING_STATUSES = ['OPEN', 'CLOSED', 'RECONCILED'];

const dailyClosingSchema = new mongoose.Schema(
  {
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    businessDate: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: CLOSING_STATUSES,
      default: 'OPEN',
      index: true,
    },
    openingCash: {
      type: Number,
      default: 0,
      min: 0,
    },
    expectedCash: {
      type: Number,
      default: 0,
      min: 0,
    },
    actualCash: {
      type: Number,
      default: null,
    },
    cashDifference: {
      type: Number,
      default: 0,
    },
    differenceReason: {
      type: String,
      default: null,
    },
    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    closedAt: {
      type: Date,
      default: null,
    },
    reconciledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reconciledAt: {
      type: Date,
      default: null,
    },
    summary: {
      totalOrders: { type: Number, default: 0 },
      totalRevenue: { type: Number, default: 0 },
      totalSubtotal: { type: Number, default: 0 },
      totalTax: { type: Number, default: 0 },
      totalServiceCharge: { type: Number, default: 0 },
      totalDiscount: { type: Number, default: 0 },
      totalRefunds: { type: Number, default: 0 },
      cashSales: { type: Number, default: 0 },
      cardSales: { type: Number, default: 0 },
      digitalSales: { type: Number, default: 0 },
      unpaidAmount: { type: Number, default: 0 },
      writtenOffAmount: { type: Number, default: 0 },
      manualTransactions: { type: Number, default: 0 },
      cancelledOrders: { type: Number, default: 0 },
    },
    paymentBreakdown: {
      CASHIER_CASH: { type: Number, default: 0 },
      CASHIER_CARD: { type: Number, default: 0 },
      CASHIER_BANK_TRANSFER: { type: Number, default: 0 },
      CHAPA: { type: Number, default: 0 },
      TELEBIRR: { type: Number, default: 0 },
    },
    orderSourceBreakdown: {
      CUSTOMER_QR: { type: Number, default: 0 },
      CUSTOMER_ONLINE: { type: Number, default: 0 },
      WAITER: { type: Number, default: 0 },
      CASHIER: { type: Number, default: 0 },
      KIOSK: { type: Number, default: 0 },
      MANUAL: { type: Number, default: 0 },
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

dailyClosingSchema.index({ branchId: 1, businessDate: 1 }, { unique: true });
dailyClosingSchema.index({ organizationId: 1, businessDate: 1 });

const DailyClosing = mongoose.model('DailyClosing', dailyClosingSchema);

module.exports = {
  DailyClosing,
  CLOSING_STATUSES,
};