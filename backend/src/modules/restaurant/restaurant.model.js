const mongoose = require('mongoose');

const socialMediaSchema = new mongoose.Schema({
  telegram: { type: String, default: '' },
  facebook: { type: String, default: '' },
  instagram: { type: String, default: '' },
}, { _id: false });

const restaurantSchema = new mongoose.Schema({
  name: {
    type: String,
    default: 'Faarees Kaafee fi Restoorraantii',
  },
  nameEn: {
    type: String,
    default: 'Faarees Kaafee fi Restoorraantii',
  },
  nameOm: {
    type: String,
    default: '',
  },
  nameAm: {
    type: String,
    default: 'ፋሪስ ካፌ እና ሪስቶራንት',
  },
  description: {
    type: String,
    default: '',
  },
  descriptionEn: {
    type: String,
    default: '',
  },
  descriptionOm: {
    type: String,
    default: '',
  },
  descriptionAm: {
    type: String,
    default: '',
  },
  logoUrl: {
    type: String,
    default: '',
  },
  coverUrl: {
    type: String,
    default: '',
  },
  phone: {
    type: String,
    default: '',
  },
  address: {
    type: String,
    default: '',
  },
  socialMedia: {
    type: socialMediaSchema,
    default: () => ({}),
  },
  currency: {
    type: String,
    default: 'ETB',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      delete ret.__v;
      return ret;
    },
  },
});

const Restaurant = mongoose.model('Restaurant', restaurantSchema);

module.exports = Restaurant;
