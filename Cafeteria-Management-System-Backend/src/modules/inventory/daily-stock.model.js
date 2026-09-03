const mongoose = require('mongoose');

const STOCK_STATUSES = ['AVAILABLE', 'LOW_STOCK', 'SOLD_OUT'];

const dailyStockSchema = new mongoose.Schema(
  {
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: [true, 'Branch reference is required'],
      index: true,
    },
    foodItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoodItem',
      required: [true, 'Food item reference is required'],
      index: true,
    },
    businessDate: {
      type: String, // Format: YYYY-MM-DD
      required: [true, 'Business date (YYYY-MM-DD) is required'],
      index: true,
    },
    preparedQuantity: {
      type: Number,
      required: [true, 'Prepared quantity is required'],
      min: [0, 'Prepared quantity cannot be negative'],
    },
    soldQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Sold quantity cannot be negative'],
    },
    remainingQuantity: {
      type: Number,
      required: true,
      min: [0, 'Remaining quantity cannot be negative'],
    },
    lowStockThreshold: {
      type: Number,
      default: 5,
      min: 0,
    },
    status: {
      type: String,
      enum: STOCK_STATUSES,
      default: 'AVAILABLE',
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

// Compound unique index: One stock record per food item per branch per business day
dailyStockSchema.index({ branchId: 1, foodItemId: 1, businessDate: 1 }, { unique: true });
dailyStockSchema.index({ branchId: 1, businessDate: 1, status: 1 });

// Helper to determine status based on remaining quantity
dailyStockSchema.methods.updateStatus = function () {
  if (this.remainingQuantity <= 0) {
    this.status = 'SOLD_OUT';
    this.remainingQuantity = 0;
  } else if (this.remainingQuantity <= this.lowStockThreshold) {
    this.status = 'LOW_STOCK';
  } else {
    this.status = 'AVAILABLE';
  }
};

const DailyStock = mongoose.model('DailyStock', dailyStockSchema);

module.exports = DailyStock;
