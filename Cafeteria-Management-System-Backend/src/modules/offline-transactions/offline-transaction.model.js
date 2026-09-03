const mongoose = require('mongoose');

const OFFLINE_SOURCES = ['MANUAL', 'KIOSK', 'OFFLINE_ENTERED'];
// Status lifecycle: DRAFT (unfinished) -> PENDING (awaiting approval) ->
// APPROVED (approved, processing) -> APPLIED (processed into real system),
// or PENDING -> REJECTED / CANCELLED.
const OFFLINE_STATUSES = ['DRAFT', 'PENDING', 'APPROVED', 'APPLIED', 'REJECTED', 'CANCELLED'];
const RECONCILIATION_STATUSES = ['PENDING', 'RECONCILED', 'IGNORED'];
const SYNC_STATUSES = ['PENDING_SYNC', 'SYNCING', 'SYNCED', 'FAILED', 'CONFLICT'];
const OPERATION_TYPES = ['ORDER', 'PAYMENT', 'STOCK', 'WASTE', 'EXPENSE', 'TABLE', 'OTHER'];

const offlineTransactionSchema = new mongoose.Schema(
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
    clientRefId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    operationType: {
      type: String,
      enum: OPERATION_TYPES,
      required: true,
      default: 'ORDER',
      index: true,
    },
    syncStatus: {
      type: String,
      enum: SYNC_STATUSES,
      default: 'PENDING_SYNC',
      index: true,
    },
    syncedAt: {
      type: Date,
      default: null,
    },
    syncError: {
      type: String,
      default: null,
    },
    conflictData: {
      type: {
        existingValue: { type: mongoose.Schema.Types.Mixed },
        offlineValue: { type: mongoose.Schema.Types.Mixed },
        reason: { type: String },
      },
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    stockData: {
      type: {
        foodItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodItem' },
        foodNameSnapshot: { type: String },
        operationType: { type: String, enum: ['RECEIVED', 'USED', 'WASTE', 'ADJUSTMENT'] },
        previousQuantity: { type: Number },
        changeQuantity: { type: Number },
        newQuantity: { type: Number },
        unit: { type: String, default: 'pcs' },
      },
      default: null,
    },
    orderData: {
      type: {
        items: [{
          foodItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodItem' },
          foodNameSnapshot: { type: String },
          unitPriceSnapshot: { type: Number },
          quantity: { type: Number },
          subtotal: { type: Number },
          notes: { type: String, default: '' },
        }],
        tableId: { type: mongoose.Schema.Types.ObjectId, ref: 'Table' },
        customerCount: { type: Number, default: 1 },
        source: { type: String, default: 'MANUAL' },
      },
      default: null,
    },
    paymentData: {
      type: {
        orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
        amount: { type: Number },
        paymentMethod: { type: String },
        transactionReference: { type: String },
      },
      default: null,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    originalTransactionTime: {
      type: Date,
      required: true,
    },
    enteredAt: {
      type: Date,
      default: Date.now,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    source: {
      type: String,
      enum: OFFLINE_SOURCES,
      required: true,
    },
    status: {
      type: String,
      enum: OFFLINE_STATUSES,
      default: 'DRAFT',
      index: true,
    },
    // Set to APPLIED after approval + processing into the real system.
    appliedAt: {
      type: Date,
      default: null,
    },
    // Human + machine readable result of applying the manual entry to the real
    // system, e.g. "Created Order #1048 -> Inventory Transaction #INV-8821".
    applicationResult: {
      type: {
        orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
        orderNumber: { type: String, default: null },
        paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
        stockIds: [{ type: mongoose.Schema.Types.ObjectId }],
        appliedText: { type: String, default: null },
      },
      default: null,
    },
    reconciliationStatus: {
      type: String,
      enum: RECONCILIATION_STATUSES,
      default: 'PENDING',
    },
    reason: {
      type: String,
      required: true,
      maxlength: 500,
    },
    outageType: {
      type: String,
      enum: ['INTERNET', 'QR_SYSTEM', 'PAYMENT_PROVIDER', 'POS_DEVICE', 'KITCHEN_DISPLAY', 'OTHER'],
      default: 'OTHER',
    },
    items: [{
      foodItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodItem' },
      foodNameSnapshot: { type: String, required: true },
      unitPriceSnapshot: { type: Number, required: true },
      quantity: { type: Number, required: true, min: 1 },
      subtotal: { type: Number, required: true },
      notes: { type: String, default: '' },
    }],
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    tax: { type: Number, required: true },
    serviceCharge: { type: Number, default: 0 },
    total: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: ['CASH', 'CARD', 'CHAPA', 'TELEBIRR', 'UNSET'],
      default: 'UNSET',
    },
    tableId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Table',
      default: null,
    },
    customerCount: {
      type: Number,
      default: 1,
      min: 1,
    },
    notes: {
      type: String,
      default: '',
      maxlength: 1000,
    },
    enteredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: null,
    },
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
    reconciledAt: {
      type: Date,
      default: null,
    },
    reconciledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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

offlineTransactionSchema.index({ branchId: 1, status: 1, createdAt: -1 });
offlineTransactionSchema.index({ branchId: 1, reconciliationStatus: 1 });
offlineTransactionSchema.index({ organizationId: 1, createdAt: -1 });
offlineTransactionSchema.index({ branchId: 1, syncStatus: 1 });
offlineTransactionSchema.index({ branchId: 1, operationType: 1, syncStatus: 1 });

const OfflineTransaction = mongoose.model('OfflineTransaction', offlineTransactionSchema);

module.exports = {
  OfflineTransaction,
  OFFLINE_SOURCES,
  OFFLINE_STATUSES,
  RECONCILIATION_STATUSES,
  SYNC_STATUSES,
  OPERATION_TYPES,
};