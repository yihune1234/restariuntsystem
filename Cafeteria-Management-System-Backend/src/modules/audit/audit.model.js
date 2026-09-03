const mongoose = require('mongoose');

const AUDIT_ACTIONS = [
  'LOGIN',
  'LOGOUT',
  'CREATE_ORDER',
  'CONFIRM_PAYMENT',
  'CREATE_FOOD',
  'UPDATE_FOOD',
  'CHANGE_PRICE',
  'CHANGE_STOCK',
  'CANCEL_ORDER',
  'START_ORDER',
  'MARK_READY',
  'TAKE_ORDER',
  'DELIVER_ORDER',
  'REFUND_PAYMENT',
  'CREATE_USER',
  'UPDATE_USER',
  // Menu Management Actions
  'CREATE_MEAL_PERIOD',
  'UPDATE_MEAL_PERIOD',
  'DELETE_MEAL_PERIOD',
  'ACTIVATE_MEAL_PERIOD',
  'DEACTIVATE_MEAL_PERIOD',
  'CREATE_CATEGORY',
  'UPDATE_CATEGORY',
  'DELETE_CATEGORY',
  'ACTIVATE_CATEGORY',
  'DEACTIVATE_CATEGORY',
  'CREATE_FOOD_ITEM',
  'UPDATE_FOOD_ITEM',
  'DELETE_FOOD_ITEM',
  'CHANGE_FOOD_AVAILABILITY',
  'ACTIVATE_FOOD_ITEM',
  'DEACTIVATE_FOOD_ITEM',
  'CHANGE_CATEGORY_ASSIGNMENT',
  'CHANGE_MEAL_PERIOD_ASSIGNMENT',
  // Daily Closing Actions
  'DAY_OPENED',
  'DAY_CLOSED',
  'DAY_RECONCILED',
  // Table Management
  'CREATE_TABLE',
  'UPDATE_TABLE',
  'REGENERATE_QR',
  'DISABLE_QR',
  'ASSIGN_TABLE',
  // Cash Management
  'CASH_WITHDRAWAL',
  'CASH_DEPOSIT',
  'CASH_SHORTAGE',
  'CASH_OVERAGE',
  // Complaints & Problems
  'COMPLAINT_LOGGED',
  'COMPLAINT_RESOLVED',
  'REFUND_APPROVED',
  'DISCOUNT_APPROVED',
  'WRITE_OFF',
  'FEEDBACK_SUBMITTED',
  // Fraud & Security
  'SUSPICIOUS_ACTIVITY',
  'LOGIN_FAILED',
  'PERMISSION_DENIED',
  // Branch Management
  'CREATE_BRANCH',
  'UPDATE_BRANCH',
  'DELETE_BRANCH',
  // Organization
  'UPDATE_ORGANIZATION',
  'UPDATE_ORGANIZATION_SETTINGS',
  'RESET_ORGANIZATION_SETTINGS',
  // Offline Transactions
  'MANUAL_TRANSACTION_CREATED',
  'MANUAL_TRANSACTION_SUBMITTED',
  'MANUAL_TRANSACTION_APPROVED',
  'MANUAL_TRANSACTION_APPLIED',
  'MANUAL_TRANSACTION_REJECTED',
  'TRANSACTION_RECONCILED',
  'TRANSACTION_IGNORED',
  // Offline sync
  'OFFLINE_STOCK_SYNCED',
  'OFFLINE_ORDER_SYNCED',
  'OFFLINE_PAYMENT_SYNCED',
  'CONFLICT_RESOLVED',
];

const auditLogSchema = new mongoose.Schema(
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
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // null for public/customer actions
      index: true,
    },
    action: {
      type: String,
      enum: AUDIT_ACTIONS,
      required: true,
      index: true,
    },
    entityType: {
      type: String,
      required: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    oldValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    newValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    ipAddress: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
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

auditLogSchema.index({ branchId: 1, createdAt: -1 });
auditLogSchema.index({ organizationId: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = {
  AuditLog,
  AUDIT_ACTIONS,
};
