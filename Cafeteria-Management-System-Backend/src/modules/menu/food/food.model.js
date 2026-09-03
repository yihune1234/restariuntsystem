const mongoose = require('mongoose');

const foodItemSchema = new mongoose.Schema(
  {
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: [true, 'Branch reference is required'],
      index: true,
    },
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
    description: {
      type: String,
      trim: true,
      default: '',
    },
    descriptionEn: { type: String, trim: true, default: '' },
    descriptionOm: { type: String, trim: true, default: '' },
    descriptionAm: { type: String, trim: true, default: '' },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price must be a positive number'],
    },
    imageUrl: {
      type: String,
      default: '',
    },
    imagePublicId: {
      type: String,
      default: '',
    },
    isAvailable: {
      type: Boolean,
      default: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    preparationTimeMinutes: {
      type: Number,
      default: 15,
      min: 1,
    },
    displayOrder: {
      type: Number,
      default: 0,
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

// Indexes for high performance menu queries
foodItemSchema.index({ branchId: 1, categoryId: 1, isActive: 1, isAvailable: 1, deletedAt: 1, displayOrder: 1 });
foodItemSchema.index({ branchId: 1, name: 1 });

const FoodItem = mongoose.model('FoodItem', foodItemSchema);

module.exports = FoodItem;
