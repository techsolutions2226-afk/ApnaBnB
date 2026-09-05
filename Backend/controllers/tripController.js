const prisma = require('../db/prisma');
const { notifyUsersInBackground, TYPES } = require('../utils/notifier');

/* A trip is now a two-way mutual-visit booking:
   - the visitor proposes a preferred date + time,
   - the property owner either confirms it or proposes their own schedule,
   - contact details are revealed to BOTH sides only once BOTH confirm.
   The "owner" view (incoming requests on the user's listings) is served from
   the same /trips endpoint so one page handles both perspectives. */

const propertySelect = {
  select: {
    id: true,
    title: true,
    photos: true,
    location: true,
    price: true,
    listedById: true,
    listedBy: { select: { id: true, name: true, role: true, avatar: true } },
  },
};

const generateConfirmationCode = () =>
  Math.random().toString(36).substring(2, 10).toUpperCase();

/* Is this user a participant (visitor OR property owner) of the trip? */
const isParticipant = (trip, userId) =>
  trip?.userId === userId || trip?.property?.listedById === userId;

/* Confirmation code shared by both sides. */
const VISIT_LINK = (tripId) => `/visits/${tripId}`;

/* authMiddleware only loads id/role/viewRole — resolve a display name here. */
const actorName = async (userId) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    return user?.name || 'A user';
  } catch {
    return 'A user';
  }
};

// Create a trip — the visitor proposes a preferred schedule.
const createTrip = async (req, res, next) => {
  const {
    propertyId,
    checkIn,
    checkOut,
    nights,
    guests,
    totalPrice,
    serviceFee,
    visitorProposal,
  } = req.body;

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

    if (property.listedById === req.user.id) {
      return res
        .status(400)
        .json({ message: 'You cannot book a visit on your own property.' });
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
        visitorProposal:
          visitorProposal && visitorProposal.date
            ? visitorProposal
            : { date: checkIn, time: '12:00' },
        confirmationCode: generateConfirmationCode(),
      },
      include: { property: propertySelect },
    });

    /* The owner must schedule the visit; the visitor wants the code for records. */
    const actorDisplay = await actorName(req.user.id);
    notifyUsersInBackground([
      {
        recipientId: property.listedById,
        actorId: req.user.id,
        type: TYPES.VISIT_PROPOSED,
        title: 'Visit proposed',
        body: `${actorDisplay} proposed a visit to ${property.title} on ${trip.visitorProposal.date} at ${trip.visitorProposal.time}. Confirm the time or propose another.`,
        link: VISIT_LINK(trip.id),
        entityType: 'trip',
        entityId: trip.id,
      },
      {
        recipientId: req.user.id,
        type: TYPES.VISIT_BOOKED,
        title: 'Visit requested',
        body: `Your visit to ${property.title} is requested. Code ${trip.confirmationCode}. Waiting for the owner to confirm the schedule.`,
        link: VISIT_LINK(trip.id),
        entityType: 'trip',
        entityId: trip.id,
        allowSelf: true,
      },
    ]);

    res.status(201).json(trip);
  } catch (error) {
    next(error);
  }
};

// List trips: visits I proposed + visits requested on my own listings.
const getMyTrips = async (req, res, next) => {
  const { status } = req.query;
  const where = {
    OR: [{ userId: req.user.id }, { property: { listedById: req.user.id } }],
  };
  if (status && ['upcoming', 'completed', 'cancelled'].includes(status)) {
    where.status = status;
  }

  try {
    const trips = await prisma.trip.findMany({
      where,
      include: { property: propertySelect },
      orderBy: { createdAt: 'desc' },
    });

    /* Attach the viewer's role in the trip so the UI can pick the right actions. */
    const shaped = trips.map((trip) => ({
      ...trip,
      role: trip.userId === req.user.id ? 'visitor' : 'owner',
    }));
    res.status(200).json(shaped);
  } catch (error) {
    next(error);
  }
};

// Get a single trip by id (visitor or owner only).
const getTripById = async (req, res, next) => {
  const { id } = req.params;
  try {
    const trip = await prisma.trip.findFirst({
      where: { id },
      include: { property: propertySelect },
    });
    if (!trip || !isParticipant(trip, req.user.id)) {
      return res.status(404).json({ message: 'Visit not found.' });
    }
    res.status(200).json({ ...trip, role: trip.userId === req.user.id ? 'visitor' : 'owner' });
  } catch (error) {
    next(error);
  }
};

/* Validate a { date: 'YYYY-MM-DD', time: 'HH:mm' } proposal. */
const isProposal = (p) =>
  p &&
  typeof p.date === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(p.date) &&
  typeof p.time === 'string' &&
  /^([01]\d|2[0-3]):[0-5]\d$/.test(p.time);

/* Owner (or visitor) proposes a schedule. Whichever side proposes, both
   confirmations reset so the other side must explicitly agree again. */
const proposeSchedule = async (req, res, next) => {
  const { id } = req.params;
  const { date, time } = req.body;

  if (!isProposal({ date, time })) {
    return res.status(400).json({ message: 'A valid date and time are required.' });
  }

  try {
    const trip = await prisma.trip.findFirst({
      where: { id },
      include: { property: { select: { id: true, title: true, listedById: true } } },
    });

    if (!trip || !isParticipant(trip, req.user.id)) {
      return res.status(404).json({ message: 'Visit not found.' });
    }
    if (trip.status === 'cancelled') {
      return res.status(400).json({ message: 'Visit is already cancelled.' });
    }

    const isOwner = trip.property.listedById === req.user.id;
    const proposal = { date, time };

    const updated = await prisma.trip.update({
      where: { id: trip.id },
      data: {
        [isOwner ? 'ownerProposal' : 'visitorProposal']: proposal,
        visitorConfirmed: false,
        ownerConfirmed: false,
        confirmedAt: null,
        scheduleState: 'reschedule',
      },
      include: { property: propertySelect },
    });

    const otherSide = isOwner ? trip.userId : trip.property.listedById;
    const actorDisplay = await actorName(req.user.id);
    notifyUsersInBackground([
      {
        recipientId: otherSide,
        actorId: req.user.id,
        type: TYPES.VISIT_SCHEDULE_REQUESTED,
        title: 'New visit schedule proposed',
        body: `${actorDisplay} proposed ${date} at ${time} for the visit to ${trip.property.title}. Confirm or propose another time.`,
        link: VISIT_LINK(trip.id),
        entityType: 'trip',
        entityId: trip.id,
      },
    ]);

    res.status(200).json({ ...updated, role: isOwner ? 'owner' : 'visitor' });
  } catch (error) {
    next(error);
  }
};

/* Either side confirms the current schedule. Only when BOTH have confirmed is
   the visit final and are the contact details revealed to both parties. */
const confirmVisit = async (req, res, next) => {
  const { id } = req.params;
  try {
    const trip = await prisma.trip.findFirst({
      where: { id },
      include: { property: { select: { id: true, title: true, listedById: true } } },
    });

    if (!trip || !isParticipant(trip, req.user.id)) {
      return res.status(404).json({ message: 'Visit not found.' });
    }
    if (trip.status === 'cancelled') {
      return res.status(400).json({ message: 'Visit is already cancelled.' });
    }

    const isOwner = trip.property.listedById === req.user.id;
    const field = isOwner ? 'ownerConfirmed' : 'visitorConfirmed';

    const nextVisitorConfirmed = isOwner
      ? trip.visitorConfirmed
      : true;
    const nextOwnerConfirmed = isOwner ? true : trip.ownerConfirmed;
    const bothConfirmed = nextVisitorConfirmed && nextOwnerConfirmed;

    const updated = await prisma.trip.update({
      where: { id: trip.id },
      data: {
        [field]: true,
        confirmedAt: bothConfirmed ? new Date().toISOString() : trip.confirmedAt,
        scheduleState: bothConfirmed ? 'agreed' : trip.scheduleState,
      },
      include: { property: propertySelect },
    });

    const actorDisplay = await actorName(req.user.id);
    notifyUsersInBackground([
      {
        recipientId: isOwner ? trip.userId : trip.property.listedById,
        actorId: req.user.id,
        type: TYPES.VISIT_CONFIRMED,
        title: bothConfirmed ? 'Visit confirmed — contact details revealed' : 'Visit schedule confirmed',
        body: bothConfirmed
          ? `The visit to ${trip.property.title} is confirmed. You can now see the other side's contact details.`
          : `${actorDisplay} confirmed the visit to ${trip.property.title}. Confirm the schedule to unlock contact details.`,
        link: VISIT_LINK(trip.id),
        entityType: 'trip',
        entityId: trip.id,
      },
    ]);

    res.status(200).json({ ...updated, role: isOwner ? 'owner' : 'visitor' });
  } catch (error) {
    next(error);
  }
};

/* Contact details are revealed ONLY after both sides confirm the visit. */
const getTripContact = async (req, res, next) => {
  const { id } = req.params;
  try {
    const trip = await prisma.trip.findFirst({
      where: { id },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            listedById: true,
            listedBy: {
              select: { id: true, name: true, phone: true, email: true, role: true },
            },
          },
        },
        user: { select: { id: true, name: true, phone: true, email: true, role: true } },
      },
    });

    if (!trip || !isParticipant(trip, req.user.id)) {
      return res.status(404).json({ message: 'Visit not found.' });
    }

    if (!trip.visitorConfirmed || !trip.ownerConfirmed) {
      return res.status(403).json({
        code: 'VISIT_NOT_CONFIRMED',
        message: 'Contact details are revealed once both sides confirm the visit.',
      });
    }

    const owner = trip.property.listedBy;
    const visitor = trip.user;
    res.status(200).json({
      confirmedAt: trip.confirmedAt,
      property: trip.property.title,
      visitor: { id: visitor.id, name: visitor.name, phone: visitor.phone || '', email: visitor.email || '' },
      owner: { id: owner.id, name: owner.name, phone: owner.phone || '', email: owner.email || '' },
    });
  } catch (error) {
    next(error);
  }
};

// Cancel a visit — either side may cancel.
const cancelTrip = async (req, res, next) => {
  const { id } = req.params;
  try {
    const trip = await prisma.trip.findFirst({
      where: { id },
      include: { property: { select: { id: true, title: true, listedById: true } } },
    });
    if (!trip || !isParticipant(trip, req.user.id)) {
      return res.status(404).json({ message: 'Visit not found.' });
    }
    if (trip.status === 'cancelled') {
      return res.status(400).json({ message: 'Visit is already cancelled.' });
    }

    const updated = await prisma.trip.update({
      where: { id: trip.id },
      data: {
        status: 'cancelled',
        cancelledAt: new Date().toISOString().split('T')[0],
        refundAmount: Math.max(0, trip.totalPrice - (trip.serviceFee || 0)),
      },
    });

    const otherSide =
      trip.userId === req.user.id
        ? trip.property.listedById
        : trip.userId;
    notifyUsersInBackground([
      {
        recipientId: otherSide,
        actorId: req.user.id,
        type: TYPES.VISIT_CANCELLED,
        title: 'Visit cancelled',
        body: `The visit to ${trip.property.title} was cancelled.`,
        link: '/visits',
        entityType: 'trip',
        entityId: trip.id,
      },
    ]);

    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTrip,
  getMyTrips,
  getTripById,
  proposeSchedule,
  confirmVisit,
  getTripContact,
  cancelTrip,
};