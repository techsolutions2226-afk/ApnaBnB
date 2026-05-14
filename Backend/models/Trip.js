const mongoose = require('mongoose');

const TripSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
    },
    checkIn: { type: String, required: true },   // YYYY-MM-DD
    checkOut: { type: String, required: true },  // YYYY-MM-DD
    nights: { type: Number, required: true, min: 1 },
    guests: {
      adults: { type: Number, default: 1, min: 0 },
      children: { type: Number, default: 0, min: 0 },
      infants: { type: Number, default: 0, min: 0 },
    },
    totalPrice: { type: Number, required: true, min: 0 },
    serviceFee: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['upcoming', 'completed', 'cancelled'],
      default: 'upcoming',
    },
    confirmationCode: { type: String, required: true, unique: true },
    cancelledAt: { type: String, default: null },
    refundAmount: { type: Number, default: null },
  },
  { timestamps: true }
);

TripSchema.index({ user: 1, status: 1 });

const Trip = mongoose.model('Trip', TripSchema);
module.exports = Trip;
