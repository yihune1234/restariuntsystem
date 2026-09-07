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
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
    displayOrder: { type: Number, default: 0 },
    mealScheduleIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MealPeriod',
    }],
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
categorySchema.index({ parentId: 1 });

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
