const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: [true, 'Branch reference is required'],
      index: true,
    },
    mealPeriodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MealPeriod',
      required: [true, 'Meal period reference is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Category name is required (e.g. HOT BEVERAGES, BURGERS, EGGS)'],
      trim: true,
      uppercase: true,
    },
    nameEn: { type: String, trim: true, default: '' },
    nameOm: { type: String, trim: true, default: '' },
    nameAm: { type: String, trim: true, default: '' },
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

// Unique category name per meal period in a branch
categorySchema.index({ branchId: 1, mealPeriodId: 1, name: 1 }, { unique: true });
categorySchema.index({ branchId: 1, mealPeriodId: 1, isActive: 1, deletedAt: 1, displayOrder: 1 });

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
