const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: false,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Branch name is required'],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    code: {
      type: String,
      required: [true, 'Branch code identifier is required (e.g., BR-01)'],
      trim: true,
      uppercase: true,
    },
    address: {
      city: { type: String, required: true, trim: true },
      subcity: { type: String, trim: true, default: '' },
      street: { type: String, trim: true, default: '' },
    },
    phone: {
      type: String,
      required: [true, 'Branch phone number is required'],
      trim: true,
    },
    settings: {
      taxRate: {
        type: Number,
        default: 0.15,
        min: 0,
        max: 1,
      },
      serviceChargeRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 1,
      },
      currency: {
        type: String,
        default: 'ETB',
      },
      openTime: {
        type: String,
        default: '07:00',
      },
      closeTime: {
        type: String,
        default: '22:00',
      },
      autoAcceptCashierOrders: {
        type: Boolean,
        default: true,
      },
    },
    branchQrToken: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
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

// Compound index for uniqueness of branch name/code within an organization
branchSchema.index({ organizationId: 1, code: 1 }, { unique: true, sparse: true });
branchSchema.index({ organizationId: 1, isActive: 1, deletedAt: 1 });

const Branch = mongoose.model('Branch', branchSchema);

module.exports = Branch;
