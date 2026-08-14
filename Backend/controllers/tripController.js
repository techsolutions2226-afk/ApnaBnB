const prisma = require('../db/prisma');

const propertySelect = {
  select: { id: true, title: true, photos: true, location: true, price: true },
};

const generateConfirmationCode = () =>
  Math.random().toString(36).substring(2, 10).toUpperCase();

// Create a trip (reservation) for the authenticated user
const createTrip = async (req, res, next) => {
  const { propertyId, checkIn, checkOut, nights, guests, totalPrice, serviceFee } = req.body;

  if (!propertyId || !checkIn || !checkOut || !nights || totalPrice == null) {
    return res.status(400).json({
      message: 'propertyId, checkIn, checkOut, nights, and totalPrice are required.',
    });
  }

  try {
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) {
      return res.status(404).json({ message: 'Property not found.' });
    }

    const trip = await prisma.trip.create({
      data: {
        userId: req.user.id,
        propertyId,
        checkIn,
        checkOut,
        nights: Number(nights),
        guests: guests || { adults: 1, children: 0, infants: 0 },
        totalPrice: Number(totalPrice),
        serviceFee: Number(serviceFee) || 0,
        confirmationCode: generateConfirmationCode(),
      },
    });

    res.status(201).json(trip);
  } catch (error) {
    next(error);
  }
};

// List trips for the authenticated user (optionally filtered by status)
const getMyTrips = async (req, res, next) => {
  const { status } = req.query;
  const where = { userId: req.user.id };
  if (status && ['upcoming', 'completed', 'cancelled'].includes(status)) {
    where.status = status;
  }

  try {
    const trips = await prisma.trip.findMany({
      where,
      include: { property: propertySelect },
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json(trips);
  } catch (error) {
    next(error);
  }
};

// Get a single trip by id (only if owned by the caller)
const getTripById = async (req, res, next) => {
  const { id } = req.params;
  try {
    const trip = await prisma.trip.findFirst({
      where: { id, userId: req.user.id },
      include: { property: propertySelect },
    });
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found.' });
    }
    res.status(200).json(trip);
  } catch (error) {
    next(error);
  }
};

// Cancel a trip (refund = totalPrice - serviceFee)
const cancelTrip = async (req, res, next) => {
  const { id } = req.params;
  try {
    const trip = await prisma.trip.findFirst({ where: { id, userId: req.user.id } });
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found.' });
    }
    if (trip.status === 'cancelled') {
      return res.status(400).json({ message: 'Trip is already cancelled.' });
    }

    const updated = await prisma.trip.update({
      where: { id: trip.id },
      data: {
        status: 'cancelled',
        cancelledAt: new Date().toISOString().split('T')[0],
        refundAmount: Math.max(0, trip.totalPrice - (trip.serviceFee || 0)),
      },
    });

    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};

module.exports = { createTrip, getMyTrips, getTripById, cancelTrip };
