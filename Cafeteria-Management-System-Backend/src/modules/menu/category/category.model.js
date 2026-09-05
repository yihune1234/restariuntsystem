const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      uppercase: true,
    },
    nameEn: { type: String, trim: true, default: '' },
    nameOm: { type: String, trim: true, default: '' },
    nameAm: { type: String, trim: true, default: '' },
    displayOrder: { type: Number, default: 0 },
    mealPeriodIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MealPeriod',
    }],
    isAllDay: { type: Boolean, default: false, index: true },
    isHidden: { type: Boolean, default: false, index: true },
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

categorySchema.index({ name: 1 }, { unique: true });
categorySchema.index({ isActive: 1, displayOrder: 1 });

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
