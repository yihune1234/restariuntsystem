const mongoose = require('mongoose');

const ORDER_SOURCES = ['CUSTOMER_QR', 'CASHIER', 'KIOSK', 'ONLINE', 'MANUAL'];

const PAYMENT_METHODS = ['CHAPA', 'TELEBIRR', 'CASH', 'CARD', 'BANK_TRANSFER', 'UNSET'];

const PAYMENT_STATUSES = ['UNPAID', 'PENDING', 'PAID', 'FAILED', 'CANCELLED', 'EXPIRED', 'REFUNDED'];

const ORDER_STATUSES = ['PENDING', 'WAITING_FOR_PAYMENT', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'];

const orderItemSchema = new mongoose.Schema(
  {
    foodItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoodItem',
      required: true,
    },
    foodNameSnapshot: {
      type: String,
      required: true,
    },
    categorySnapshot: {
      type: String,
      required: true,
    },
    unitPriceSnapshot: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { _id: true }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      index: true,
    },
    tableId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Table',
      required: false,
      default: null,
      index: true,
    },
    customerName: {
      type: String,
      trim: true,
      default: null,
    },
    securityCode: {
      type: String,
      required: true,
    },
    source: {
      type: String,
      enum: ORDER_SOURCES,
      default: 'CUSTOMER_QR',
      index: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: [(val) => val.length > 0, 'Order must contain at least one item'],
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    tax: {
      type: Number,
      required: true,
      min: 0,
    },
    serviceCharge: {
      type: Number,
      default: 0,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS,
      default: 'UNSET',
    },
    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: 'UNPAID',
      index: true,
    },
    orderStatus: {
      type: String,
      enum: ORDER_STATUSES,
      default: 'PENDING',
      index: true,
    },
    customerNote: {
      type: String,
      trim: true,
      default: '',
      maxlength: 500,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    confirmedAt: { type: Date, default: null },
    preparedAt: { type: Date, default: null },
    readyAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    cancelReason: { type: String, default: null },
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

orderSchema.index({ orderStatus: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1, createdAt: -1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ tableId: 1, orderStatus: 1 });

const Order = mongoose.model('Order', orderSchema);

module.exports = {
  Order,
  ORDER_SOURCES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  ORDER_STATUSES,
};
