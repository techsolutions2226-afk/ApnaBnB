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

/* ── On-site check-in constants ──
   The owner generates a 6-digit code that expires in 10 minutes. The visitor
   proves they are physically present by entering it (typed or scanned from
   the owner's screen). Only the BUYER who scheduled the trip can verify it. */
const crypto = require('crypto');

const CHECKIN_TTL_MS = 10 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;

const generateCheckInCodeValue = () => String(crypto.randomInt(100000, 1000000));

/* Unique payload embedded in the owner's QR. The final segment is the code the
   visitor submits — a stranger in the room can scan it, but the server still
   rejects anyone who is not the scheduled visitor for this trip. */
const qrPayload = (tripId, code) => `APNABNB:VISIT:${tripId}:${code}`;

/* The agreed visit date, regardless of which side proposed the final slot. */
const agreedDate = (trip) =>
  trip.visitorProposal?.date ||
  trip.ownerProposal?.date ||
  trip.checkIn ||
  null;

/* Successful vs. unsuccessful visit outcome. Computed on read so no cron or
   background job is needed: a confirmed visit whose agreed date has passed
   without a check-in is treated as a no-show. */
const effectiveOutcome = (trip) => {
  if (trip.outcome && trip.outcome !== 'pending') return trip.outcome;
  if (trip.status === 'cancelled') return 'cancelled';
  if (trip.status === 'completed') return 'success';
  const date = agreedDate(trip);
  if (trip.status === 'upcoming' && date) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    if (new Date(`${date}T00:00:00`) < todayStart) return 'no_show';
  }
  return trip.outcome || 'pending';
};

/* Attach the viewer's role + derived outcome to every trip we return. */
const shapeTrip = (trip, userId) => ({
  ...trip,
  role: trip.userId === userId ? 'visitor' : 'owner',
  effectiveOutcome: effectiveOutcome(trip),
});

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

    /* Attach the viewer's role + derived outcome so a single listing feeds both
       the visit page and the success/unsuccessful dashboard counts. */
    const shaped = trips.map((trip) => shapeTrip(trip, req.user.id));
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
    res.status(200).json(shapeTrip(trip, req.user.id));
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

    res.status(200).json(shapeTrip(updated, req.user.id));
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

    res.status(200).json(shapeTrip(updated, req.user.id));
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
        outcome: 'cancelled',
      },
      include: { property: propertySelect },
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

    res.status(200).json(shapeTrip(updated, req.user.id));
  } catch (error) {
    next(error);
  }
};

/* ──────────────────────────────────────────────────────────────────
   On-site check-in code (mutual proof of the visit)
   ────────────────────────────────────────────────────────────────── */

/* OWNER: generate (or regenerate) the 10-minute check-in code. Generating a
   new code always invalidates the previous one. */
const generateCheckInCode = async (req, res, next) => {
  const { id } = req.params;
  try {
    const trip = await prisma.trip.findFirst({
      where: { id },
      include: { property: { select: { id: true, title: true, listedById: true } } },
    });
    if (!trip || !isParticipant(trip, req.user.id)) {
      return res.status(404).json({ message: 'Visit not found.' });
    }
    if (trip.property.listedById !== req.user.id) {
      return res.status(403).json({ message: 'Only the property owner can generate the check-in code.' });
    }
    if (trip.status !== 'upcoming') {
      return res.status(400).json({ message: 'Check-in codes are only available while the visit is upcoming.' });
    }
    if (!trip.visitorConfirmed || !trip.ownerConfirmed) {
      return res.status(400).json({ message: 'Confirm the visit schedule with the visitor first.' });
    }

    const code = generateCheckInCodeValue();
    const expiresAt = new Date(Date.now() + CHECKIN_TTL_MS);

    const updated = await prisma.trip.update({
      where: { id: trip.id },
      data: {
        checkInCode: code,
        checkInCodeExpiresAt: expiresAt,
        checkInCodeUsed: false,
        checkInFailedAttempts: 0,
      },
      include: { property: propertySelect },
    });

    res.status(200).json({
      code,
      qrPayload: qrPayload(trip.id, code),
      expiresAt: expiresAt.toISOString(),
      trip: shapeTrip(updated, req.user.id),
    });
  } catch (error) {
    next(error);
  }
};

/* OWNER: fetch the still-valid code for display (no regeneration). */
const getCheckInCode = async (req, res, next) => {
  const { id } = req.params;
  try {
    const trip = await prisma.trip.findFirst({
      where: { id },
      include: { property: { select: { id: true, listedById: true } } },
    });
    if (!trip || !isParticipant(trip, req.user.id)) {
      return res.status(404).json({ message: 'Visit not found.' });
    }
    if (trip.property.listedById !== req.user.id) {
      return res.status(403).json({ message: 'Only the property owner can view the check-in code.' });
    }

    const valid =
      trip.checkInCode &&
      !trip.checkInCodeUsed &&
      trip.checkInCodeExpiresAt &&
      trip.checkInCodeExpiresAt.getTime() > Date.now();

    if (!valid) {
      return res.status(200).json({ available: false, message: 'No active check-in code. Generate a new one.' });
    }

    res.status(200).json({
      available: true,
      code: trip.checkInCode,
      qrPayload: qrPayload(trip.id, trip.checkInCode),
      expiresAt: trip.checkInCodeExpiresAt.toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

/* VISITOR ONLY: prove they are on site by submitting the code the owner is
   showing. Rejects any account other than the buyer who scheduled the trip —
   a stranger scanning the QR still fails server-side. */
const checkInToVisit = async (req, res, next) => {
  const { id } = req.params;
  const { code } = req.body || {};
  const submitted = typeof code === 'string' ? code.trim() : '';

  if (!submitted) {
    return res.status(400).json({ message: 'Enter the check-in code.' });
  }

  try {
    const trip = await prisma.trip.findFirst({
      where: { id },
      include: { property: propertySelect },
    });
    if (!trip || !isParticipant(trip, req.user.id)) {
      return res.status(404).json({ message: 'Visit not found.' });
    }
    if (trip.userId !== req.user.id) {
      return res
        .status(403)
        .json({ message: 'Only the buyer who scheduled this visit can check in.' });
    }
    if (trip.status === 'cancelled') {
      return res.status(400).json({ message: 'This visit was cancelled.' });
    }
    if (trip.status === 'completed') {
      return res.status(400).json({ message: 'This visit is already completed.' });
    }
    if (trip.status === 'checked_in') {
      return res.status(200).json({
        message: 'You are already checked in.',
        trip: shapeTrip(trip, req.user.id),
      });
    }
    if (!trip.checkInCode || !trip.checkInCodeExpiresAt) {
      return res.status(400).json({ message: 'No active check-in code. Ask the owner to generate one.' });
    }
    if (trip.checkInCodeUsed) {
      return res.status(400).json({ message: 'This code has already been used.' });
    }
    if (trip.checkInCodeExpiresAt.getTime() < Date.now()) {
      return res.status(400).json({ message: 'The check-in code expired. Ask the owner to regenerate it.' });
    }

    if (submitted !== trip.checkInCode) {
      const attempts = trip.checkInFailedAttempts + 1;
      await prisma.trip.update({
        where: { id: trip.id },
        data: { checkInFailedAttempts: attempts },
      });
      if (attempts >= MAX_FAILED_ATTEMPTS) {
        return res.status(400).json({
          message: 'Too many failed attempts. Ask the owner to regenerate the code.',
        });
      }
      return res.status(400).json({
        message: `Incorrect code. Attempt ${attempts} of ${MAX_FAILED_ATTEMPTS}.`,
      });
    }

    const updated = await prisma.trip.update({
      where: { id: trip.id },
      data: {
        status: 'checked_in',
        checkedInAt: new Date(),
        checkInCodeUsed: true,
        checkInFailedAttempts: 0,
      },
      include: { property: propertySelect },
    });

    const ownerName = await actorName(req.user.id);
    notifyUsersInBackground([
      {
        recipientId: trip.property.listedById,
        actorId: req.user.id,
        type: TYPES.VISIT_CHECKED_IN,
        title: 'Visitor arrived',
        body: `${ownerName} checked in at your property for the visit to ${trip.property.title}.`,
        link: VISIT_LINK(trip.id),
        entityType: 'trip',
        entityId: trip.id,
      },
    ]);

    res.status(200).json({ message: 'Checked in — the owner has been notified.', trip: shapeTrip(updated, req.user.id) });
  } catch (error) {
    next(error);
  }
};

/* OWNER: mark the visit completed after a verified check-in. This is what
   records a SUCCESSFUL visit. */
const completeVisit = async (req, res, next) => {
  const { id } = req.params;
  try {
    const trip = await prisma.trip.findFirst({
      where: { id },
      include: { property: { select: { id: true, title: true, listedById: true } } },
    });
    if (!trip || !isParticipant(trip, req.user.id)) {
      return res.status(404).json({ message: 'Visit not found.' });
    }
    if (trip.property.listedById !== req.user.id) {
      return res.status(403).json({ message: 'Only the property owner can mark the visit completed.' });
    }
    if (trip.status === 'cancelled') {
      return res.status(400).json({ message: 'This visit was cancelled.' });
    }
    if (trip.status === 'completed') {
      return res.status(400).json({ message: 'This visit is already completed.' });
    }
    if (trip.status !== 'checked_in') {
      return res.status(400).json({
        message: 'The visitor must check in first before the visit can be completed.',
      });
    }

    const updated = await prisma.trip.update({
      where: { id: trip.id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        completedById: req.user.id,
        outcome: 'success',
      },
      include: { property: propertySelect },
    });

    notifyUsersInBackground([
      {
        recipientId: trip.userId,
        actorId: req.user.id,
        type: TYPES.VISIT_COMPLETED,
        title: 'Visit completed',
        body: `The visit to ${trip.property.title} has been completed successfully. Click to leave a review.`,
        link: VISIT_LINK(trip.id),
        entityType: 'trip',
        entityId: trip.id,
      },
    ]);

    res.status(200).json({ message: 'Visit completed.', trip: shapeTrip(updated, req.user.id) });
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
  generateCheckInCode,
  getCheckInCode,
  checkInToVisit,
  completeVisit,
  cancelTrip,
};