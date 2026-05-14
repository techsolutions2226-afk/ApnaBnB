const mongoose = require('mongoose');

const PropertySchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    photos: [{ type: String }],
    location: {
      city: { type: String, required: true },
      area: { type: String, required: true },
      coordinates: {
        lat: { type: Number },
        lng: { type: Number },
      },
    },
    price: { type: Number, required: true },
    propertyType: { type: String, enum: ['house', 'apartment', 'plot'], required: true },
    size: { type: Number },
    bedrooms: { type: Number },
    bathrooms: { type: Number },
    amenities: { type: [String], default: [] },
    status: {
      type: String,
      enum: ['active', 'pending', 'sold', 'featured'],
      default: 'pending'
    },
    listedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

const Property = mongoose.model('Property', PropertySchema);
module.exports = Property;