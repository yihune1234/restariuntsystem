const mongoose = require('mongoose');

const WASTE_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'];
const WASTE_REASONS = [
  'Burned during preparation',
  'Dropped',
  'Customer returned',
  'Expired',
  'Damaged packaging',
  'Wrong order prepared',
  'Quality issue',
  'Other',
];

const wasteSchema = new mongoose.Schema(
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
    foodItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoodItem',
      default: null,
    },
    itemName: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
      maxlength: 200,
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
    },
    reason: {
      type: String,
      enum: WASTE_REASONS,
      required: [true, 'Reason is required'],
    },
    notes: {
      type: String,
      default: '',
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: WASTE_STATUSES,
      default: 'PENDING',
      index: true,
    },
    estimatedCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    recordedBy: {
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
    rejectedReason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

// Populate the person who recorded/approved the waste for easy display.
wasteSchema.virtual('recordedByUser', {
  ref: 'User',
  localField: 'recordedBy',
  foreignField: '_id',
  justOne: true,
});
wasteSchema.virtual('approvedByUser', {
  ref: 'User',
  localField: 'approvedBy',
  foreignField: '_id',
  justOne: true,
});

wasteSchema.index({ branchId: 1, status: 1, createdAt: -1 });
wasteSchema.index({ organizationId: 1, createdAt: -1 });

const Waste = mongoose.model('Waste', wasteSchema);

module.exports = {
  Waste,
  WASTE_STATUSES,
  WASTE_REASONS,
};