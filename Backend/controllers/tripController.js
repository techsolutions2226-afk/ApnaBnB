const Trip = require('../models/Trip');
const Property = require('../models/Property');

const generateConfirmationCode = () =>
  Math.random().toString(36).substring(2, 10).toUpperCase();

// Create a trip (reservation) for the authenticated user
const createTrip = async (req, res) => {
  const {
    propertyId,
    checkIn,
    checkOut,
    nights,
    guests,
    totalPrice,
    serviceFee,
  } = req.body;

  if (!propertyId || !checkIn || !checkOut || !nights || totalPrice == null) {
    return res.status(400).json({
      message: 'propertyId, checkIn, checkOut, nights, and totalPrice are required.',
    });
  }

  try {
    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ message: 'Property not found.' });
    }

    const trip = await Trip.create({
      user: req.user.id,
      property: propertyId,
      checkIn,
      checkOut,
      nights,
      guests: guests || { adults: 1, children: 0, infants: 0 },
      totalPrice,
      serviceFee: serviceFee || 0,
      confirmationCode: generateConfirmationCode(),
    });

    res.status(201).json(trip);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// List trips for the authenticated user (optionally filtered by status)
const getMyTrips = async (req, res) => {
  const { status } = req.query;
  const filter = { user: req.user.id };
  if (status && ['upcoming', 'completed', 'cancelled'].includes(status)) {
    filter.status = status;
  }

  try {
    const trips = await Trip.find(filter)
      .populate('property', 'title photos location price')
      .sort({ createdAt: -1 });
    res.status(200).json(trips);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get a single trip by id (only if owned by the caller)
const getTripById = async (req, res) => {
  const { id } = req.params;
  try {
    const trip = await Trip.findOne({ _id: id, user: req.user.id }).populate(
      'property',
      'title photos location price'
    );
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found.' });
    }
    res.status(200).json(trip);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Cancel a trip (refund = totalPrice - serviceFee)
const cancelTrip = async (req, res) => {
  const { id } = req.params;
  try {
    const trip = await Trip.findOne({ _id: id, user: req.user.id });
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found.' });
    }
    if (trip.status === 'cancelled') {
      return res.status(400).json({ message: 'Trip is already cancelled.' });
    }

    trip.status = 'cancelled';
    trip.cancelledAt = new Date().toISOString().split('T')[0];
    trip.refundAmount = Math.max(0, trip.totalPrice - (trip.serviceFee || 0));
    await trip.save();

    res.status(200).json(trip);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createTrip, getMyTrips, getTripById, cancelTrip };
