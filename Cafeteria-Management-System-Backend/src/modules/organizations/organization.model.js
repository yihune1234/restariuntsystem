const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true,
      minlength: 2,
      maxlength: 150,
      unique: true,
    },
    ownerName: {
      type: String,
      required: [true, 'Owner name is required'],
      trim: true,
    },
    ownerEmail: {
      type: String,
      required: [true, 'Owner email is required'],
      trim: true,
      lowercase: true,
    },
    ownerPhone: {
      type: String,
      trim: true,
      default: '',
    },
    settings: {
      currency: {
        type: String,
        default: 'ETB',
        uppercase: true,
      },
      defaultTaxRate: {
        type: Number,
        default: 0.15, // 15% VAT default
        min: 0,
        max: 1,
      },
      defaultServiceChargeRate: {
        type: Number,
        default: 0, // optional service charge
        min: 0,
        max: 1,
      },
      timezone: {
        type: String,
        default: 'Africa/Addis_Ababa',
      },
    },
    isActive: {
      type: Boolean,
      default: true,
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

const Organization = mongoose.model('Organization', organizationSchema);

module.exports = Organization;
