const mongoose = require('mongoose');

const FEEDBACK_SOURCES = ['QR_CODE', 'EMAIL_LINK', 'MANUAL'];

const customerFeedbackSchema = new mongoose.Schema(
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
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      // Optional: general ideas/suggestions may not relate to a specific order
      // ("Optional order-related feedback"); rating/complaint flows attach one.
      required: false,
      default: null,
      index: true,
    },
    customerSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CustomerSession',
      default: null,
    },
    tableId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Table',
      default: null,
    },
    overallRating: {
      type: Number,
      // Optional: pure ideas/suggestions ("more vegan options") may skip stars.
      required: false,
      min: 1,
      max: 5,
      default: null,
    },
    foodRating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    serviceRating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    cleanlinessRating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    waitTimeRating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    feedbackText: {
      type: String,
      default: '',
      maxlength: 1000,
    },
    /** Free-form customer suggestion / idea for the restaurant. */
    suggestionText: {
      type: String,
      default: '',
      maxlength: 1000,
    },
    /**
     * Feedback kind: RATING (stars + text), IDEA (suggestion/idea), or
     * COMPLAINT (issue needing resolution). Derived on submit but stored
     * explicitly so Owner/Manager lists can filter without re-deriving.
     */
    type: {
      type: String,
      enum: ['RATING', 'IDEA', 'COMPLAINT'],
      default: 'RATING',
      index: true,
    },
    isComplaint: {
      type: Boolean,
      default: false,
    },
    /**
     * Lifecycle status used by Manager/Owner resolution workflows:
     *   OPEN -> INVESTIGATING -> RESOLVED -> CLOSED
     * `isResolved` is kept as a derived convenience for simple queries.
     */
    status: {
      type: String,
      enum: ['OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED'],
      default: 'OPEN',
      index: true,
    },
    isResolved: {
      type: Boolean,
      default: false,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    resolutionNotes: {
      type: String,
      default: '',
    },
    source: {
      type: String,
      enum: FEEDBACK_SOURCES,
      default: 'QR_CODE',
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

customerFeedbackSchema.index({ branchId: 1, createdAt: -1 });
customerFeedbackSchema.index({ organizationId: 1, createdAt: -1 });
customerFeedbackSchema.index({ isComplaint: 1, isResolved: 1 });
customerFeedbackSchema.index({ organizationId: 1, type: 1, createdAt: -1 });

const CustomerFeedback = mongoose.model('CustomerFeedback', customerFeedbackSchema);

module.exports = {
  CustomerFeedback,
  FEEDBACK_SOURCES,
};