const mongoose = require('mongoose');

const ListingSchema = new mongoose.Schema(
  {
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    views: { type: Number, default: 0 },
    inquiries: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['active', 'pending', 'sold', 'featured'],
      default: 'active',
    },
  },
  { timestamps: true }
);

const Listing = mongoose.model('Listing', ListingSchema);
module.exports = Listing;