const mongoose = require('mongoose');

const organizationSettingsSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      unique: true,
      index: true,
    },
    currency: {
      type: String,
      default: 'ETB',
      uppercase: true,
    },
    timezone: {
      type: String,
      default: 'Africa/Addis_Ababa',
    },
    businessDays: {
      type: [Number],
      default: [0, 1, 2, 3, 4, 5, 6],
    },
    operatingHours: {
      open: { type: String, default: '07:00' },
      close: { type: String, default: '22:00' },
    },
    defaultTaxRate: {
      type: Number,
      default: 0.15,
      min: 0,
      max: 1,
    },
    defaultServiceChargeRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 1,
    },
    enabledPaymentMethods: {
      cash: { type: Boolean, default: true },
      card: { type: Boolean, default: true },
      Chapa: { type: Boolean, default: true },
      Telebirr: { type: Boolean, default: true },
      bankTransfer: { type: Boolean, default: true },
    },
    discountSettings: {
      maxDiscountPercent: { type: Number, default: 0.3, min: 0, max: 1 },
      managerMaxDiscountPercent: { type: Number, default: 0.2, min: 0, max: 1 },
      requiresApprovalAbovePercent: { type: Number, default: 0.15, min: 0, max: 1 },
      allowEmployeeDiscounts: { type: Boolean, default: true },
    },
    refundSettings: {
      allowPartialRefunds: { type: Boolean, default: true },
      maxRefundPercent: { type: Number, default: 1, min: 0, max: 1 },
      requiresManagerApprovalAbove: { type: Number, default: 50000, min: 0 },
      requiresOwnerApprovalAbove: { type: Number, default: 200000, min: 0 },
    },
    cancellationSettings: {
      allowCancellationAfterPrep: { type: Boolean, default: false },
      requireReasonForCancellation: { type: Boolean, default: true },
      allowCancellationAfterDelivery: { type: Boolean, default: false },
    },
    writeOffSettings: {
      allowWriteOff: { type: Boolean, default: true },
      requiresOwnerApproval: { type: Boolean, default: true },
      maxWriteOffAmount: { type: Number, default: 10000, min: 0 },
    },
    cashManagement: {
      requireOpeningCash: { type: Boolean, default: true },
      requireClosingCash: { type: Boolean, default: true },
      allowNegativeDifference: { type: Boolean, default: false },
      maxCashDifference: { type: Number, default: 500, min: 0 },
    },
    orderSettings: {
      allowWaiterOrderEdit: { type: Boolean, default: true },
      allowCustomerOrderEdit: { type: Boolean, default: false },
      maxOrderEditTimeMinutes: { type: Number, default: 5, min: 0 },
      autoConfirmOrders: { type: Boolean, default: false },
    },
    qrSettings: {
      requireCustomerLogin: { type: Boolean, default: false },
      allowMultipleSessionsPerTable: { type: Boolean, default: true },
      sessionDurationHours: { type: Number, default: 6, min: 1, max: 24 },
      requireSecurityCode: { type: Boolean, default: true },
    },
    notificationSettings: {
      emailOnHighValueOrder: { type: Boolean, default: true },
      emailOnLargeCancellation: { type: Boolean, default: true },
      notifyManagerOnComplaint: { type: Boolean, default: true },
      notifyOwnerOnFraudAlert: { type: Boolean, default: true },
    },
    fraudDetection: {
      enableAutomaticDetection: { type: Boolean, default: true },
      excessiveCancellationThreshold: { type: Number, default: 5, min: 1 },
      highDiscountThreshold: { type: Number, default: 0.3, min: 0, max: 1 },
      excessiveRefundThreshold: { type: Number, default: 3, min: 1 },
    },
    isActive: {
      type: Boolean,
      default: true,
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

const OrganizationSettings = mongoose.model('OrganizationSettings', organizationSettingsSchema);

module.exports = OrganizationSettings;