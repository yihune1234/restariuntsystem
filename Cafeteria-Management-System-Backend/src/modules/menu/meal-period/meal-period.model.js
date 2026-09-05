const mongoose = require('mongoose');

const mealPeriodSchema = new mongoose.Schema(
  {
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Meal period name is required (e.g. BREAKFAST, LUNCH, DINNER, ALL_DAY)'],
      trim: true,
      uppercase: true,
    },
    nameEn: { type: String, trim: true, default: '' },
    nameOm: { type: String, trim: true, default: '' },
    nameAm: { type: String, trim: true, default: '' },
    startTime: {
      type: String,
      required: [true, 'Start time in HH:mm format is required'],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Please provide a valid time format (HH:mm)'],
    },
    endTime: {
      type: String,
      required: [true, 'End time in HH:mm format is required'],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Please provide a valid time format (HH:mm)'],
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    deletedAt: {
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

// Uniqueness of meal period name per branch
mealPeriodSchema.index({ branchId: 1, name: 1 }, { unique: true });
mealPeriodSchema.index({ branchId: 1, isActive: 1, deletedAt: 1, displayOrder: 1 });

const MealPeriod = mongoose.model('MealPeriod', mealPeriodSchema);

module.exports = MealPeriod;
