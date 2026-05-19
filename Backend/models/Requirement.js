const mongoose = require('mongoose');

const RequirementSchema = new mongoose.Schema(
  {
    requiredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    location: {
      city: { type: String, required: true },
      area: { type: String },
      coordinates: {
        lat: { type: Number },
        lng: { type: Number },
      },
    },
    budget: {
      min: { type: Number },
      max: { type: Number },
    },
    propertyType: {
      type: String,
      enum: ['house', 'apartment', 'plot'],
      required: true,
    },
    size: {
      type: String,
      default: ''
    },
    bedrooms: { type: Number },
    bathrooms: { type: Number },
    notes: { type: String, default: '' },
    status: {
      type: String,
      enum: ['active', 'fulfilled', 'closed'],
      default: 'active'
    },
    urgency: { type: String, default: '' },
  },
  { timestamps: true }
);

const Requirement = mongoose.model('Requirement', RequirementSchema);
module.exports = Requirement;