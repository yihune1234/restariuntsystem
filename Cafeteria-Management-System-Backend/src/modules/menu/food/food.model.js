const mongoose = require('mongoose');

const VARIANT_OPTION_SCHEMA = new mongoose.Schema({
  name: { type: String, required: true },
  nameEn: { type: String, default: '' },
  nameOm: { type: String, default: '' },
  nameAm: { type: String, default: '' },
  priceModifier: { type: Number, default: 0 },
  isAvailable: { type: Boolean, default: true },
}, { _id: true });

const VARIANT_GROUP_SCHEMA = new mongoose.Schema({
  name: { type: String, required: true },
  nameEn: { type: String, default: '' },
  nameOm: { type: String, default: '' },
  nameAm: { type: String, default: '' },
  required: { type: Boolean, default: false },
  multiSelect: { type: Boolean, default: false },
  maxSelect: { type: Number, default: 1 },
  options: [VARIANT_OPTION_SCHEMA],
}, { _id: true });

const foodItemSchema = new mongoose.Schema(
  {
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category reference is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Food item name is required'],
      trim: true,
    },
    nameEn: { type: String, trim: true, default: '' },
    nameOm: { type: String, trim: true, default: '' },
    nameAm: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    descriptionEn: { type: String, trim: true, default: '' },
    descriptionOm: { type: String, trim: true, default: '' },
    descriptionAm: { type: String, trim: true, default: '' },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price must be a positive number'],
    },
    imageUrl: { type: String, default: '' },
    imagePublicId: { type: String, default: '' },
    isAvailable: { type: Boolean, default: true, index: true },
    isHidden: { type: Boolean, default: false, index: true },
    isFeatured: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: true, index: true },
    mealPeriodIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MealPeriod',
    }],
    preparationTimeMinutes: { type: Number, default: 15, min: 1 },
    displayOrder: { type: Number, default: 0 },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    variantGroups: [VARIANT_GROUP_SCHEMA],
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

foodItemSchema.index({ categoryId: 1, isActive: 1, isAvailable: 1, displayOrder: 1 });
foodItemSchema.index({ name: 1 });

const FoodItem = mongoose.model('FoodItem', foodItemSchema);

module.exports = FoodItem;
