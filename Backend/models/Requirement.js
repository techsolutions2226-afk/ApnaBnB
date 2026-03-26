const mongoose = require('mongoose');

const RequirementSchema = new mongoose.Schema(
  {
    requiredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    location: {
      city: { type: String, required: true },
      area: { type: String },
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
      min: { type: Number },
      max: { type: Number },
    },
    bedrooms: { type: Number },
    bathrooms: { type: Number },
  },
  { timestamps: true }
);

const Requirement = mongoose.model('Requirement', RequirementSchema);
module.exports = Requirement;