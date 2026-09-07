const mongoose = require('mongoose');

const mealPeriodSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Meal period name is required'],
      trim: true,
      uppercase: true,
    },
    nameEn: { type: String, trim: true, default: '' },
    nameOm: { type: String, trim: true, default: '' },
    nameAm: { type: String, trim: true, default: '' },
    startTime: {
      type: String,
      required: [true, 'Start time is required'],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Start time must be in HH:mm format'],
    },
    endTime: {
      type: String,
      required: [true, 'End time is required'],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'End time must be in HH:mm format'],
    },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
    deletedAt: { type: Date, default: null },
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

mealPeriodSchema.index({ name: 1 }, { unique: true });
mealPeriodSchema.index({ isActive: 1, displayOrder: 1 });

const MealPeriod = mongoose.model('MealPeriod', mealPeriodSchema);

module.exports = MealPeriod;
