const prisma = require('../db/prisma');
const { geocodeAddress } = require('../utils/geocode');
const { enrichMatchesWithAI } = require('../utils/aiMatch');
const { parsePagination, paginated } = require('../utils/pagination');
const {
  calculateMatchScore,
  determineMatchType,
  isMatchCandidate,
  normalizeSupply,
} = require('../utils/matchScore');
const { sendPropertyCreatedEmail } = require('../utils/mailer');
const { hasContactAccess } = require('../utils/subscription');
const { notifyUserInBackground, notifyUsersInBackground, TYPES } = require('../utils/notifier');
const {
  notifyPropertyMatches,
  notifyInBackground,
  appUrl,
} = require('../utils/matchNotifier');
const { buildPropertyData, validatePropertyData } = require('../utils/propertyData');
const { isAllowedViewRole, viewRoleDeniedMessage } = require('../utils/roles');

// Deliberately NO email/phone here: contact details are a paid reveal and are
// served only by getPropertyContact below. Returning them on every property
// fetch would make that gate cosmetic — the data would already be in the
// browser's Network tab.
const listedBySelect = {
  select: { id: true, name: true, role: true, avatar: true },
};

// Auto-generate matches for a newly-created property.
// Pre-filters requirements by city + propertyType (+ active), then refines with
// isMatchCandidate (area/price/purpose) and derives match type from roles.
// `notify` is opt-in so bulk callers (demo-seed) never blast emails; the real
// user-facing paths (createProperty, manual regenerate) pass it explicitly.
const generateMatchesForProperty = async (property, userId, { notify = false } = {}) => {
  try {
    const propertyOwner = await prisma.user.findUnique({
      where: { id: property.listedById },
      select: { role: true },
    });
    if (!propertyOwner) return [];

    const pt = property.propertyType;
    const requirements = await prisma.requirement.findMany({
      where: {
        location: { path: ['city'], equals: property.location.city },
        propertyType: { in: [pt, pt.toLowerCase()] },
        status: 'active',
      },
      include: { requiredBy: { select: { id: true, role: true } } },
    });

    const candidates = [];
    for (const requirement of requirements) {
      if (!isMatchCandidate(property, requirement)) continue;

      // Prefer the role each party was ACTING AS when they created the record;
      // fall back to their account role for pre-migration rows.
      const matchType = determineMatchType(
        property.actingRole || propertyOwner.role,
        requirement.actingRole || requirement.requiredBy?.role,
      );
      if (!matchType) continue;

      candidates.push({ requirement, matchType });
    }

    // Dedupe + create each candidate in parallel. Same matchmaking decision
    // (same set, scoring, and order) — the I/O just isn't serialized anymore.
    const matches = [];
    const aiEntries = [];
    const produced = await Promise.all(
      candidates.map(async ({ requirement, matchType }) => {
        const existingMatch = await prisma.match.findFirst({
          where: { propertyId: property.id, requirementId: requirement.id },
        });
        if (existingMatch) return null;

        const score = calculateMatchScore(property, requirement);
        const match = await prisma.match.create({
          data: {
            propertyId: property.id,
            requirementId: requirement.id,
            initiatorId: userId,
            score,
            type: matchType,
            status: 'pending',
          },
        });
        return { match, score, requirement };
      }),
    );
    const pairs = [];
    for (const entry of produced) {
      if (!entry) continue;
      matches.push(entry.match);
      aiEntries.push({ matchId: entry.match.id, ruleScore: entry.score });
      pairs.push({ match: entry.match, requirement: entry.requirement });
    }
    // Kick off AI semantic scoring in the background (non-blocking).
    enrichMatchesWithAI(aiEntries);
    // Email both sides about the newly created matches (never blocks).
    if (notify) notifyInBackground(notifyPropertyMatches, property, pairs);
    /* Bell notifications for the same event. Gated on the same `notify` flag so
       seeders never write thousands of rows. The owner gets one line per match;
       each requirement poster gets their own. Self-matches are suppressed by
       notifyUsers. */
    if (notify && pairs.length) {
      notifyUsersInBackground([
        {
          recipientId: userId,
          type: TYPES.MATCH_CREATED,
          title: `${pairs.length} new match${pairs.length === 1 ? '' : 'es'}`,
          body: `${property.title} matched ${pairs.length} buyer requirement${pairs.length === 1 ? '' : 's'}.`,
          link: '/matches',
          entityType: 'match',
          entityId: property.id,
        },
        ...pairs.map(({ match, requirement }) => ({
          recipientId: requirement.requiredById,
          actorId: userId,
          type: TYPES.MATCH_CREATED,
          title: 'New match found',
          body: `${property.title} matches what you're looking for.`,
          link: '/matches',
          entityType: 'match',
          entityId: match.id,
        })),
      ]);
    }
    return matches;
  } catch (error) {
    console.error('Error generating matches:', error);
    return [];
  }
};

// Create a new property
const createProperty = async (req, res, next) => {
  const { title, location, price, propertyType } = req.body;

  // Validation
  if (!title || !location || !price || !propertyType) {
    return res.status(400).json({ message: 'Please provide all required fields.' });
  }

  try {
    // If the client didn't drop a pin, fall back to forward-geocoding the
    // human-readable address so map views always have a coordinate to render.
    let resolvedLocation = location;
    const hasCoords =
      location?.coordinates &&
      typeof location.coordinates.lat === 'number' &&
      typeof location.coordinates.lng === 'number';
    if (!hasCoords) {
      const addressParts = [
        location?.landmark,
        location?.street,
        location?.block,
        location?.locality,
        location?.area,
        location?.city,
        'Pakistan',
      ].filter(Boolean);
      const coords = await geocodeAddress(addressParts.join(', '));
      if (coords) {
        resolvedLocation = { ...location, coordinates: coords };
      }
    }

    const data = buildPropertyData({ ...req.body, location: resolvedLocation });
    data.location = resolvedLocation;
    data.purpose = data.purpose || 'sale';
    data.category = data.category || 'home';
    data.sizeUnit = data.sizeUnit || 'Marla';
    data.furnished = data.furnished || 'unfurnished';
    data.securityDeposit = data.securityDeposit ?? 0;
    data.leaseTerm = data.leaseTerm || 12;
    data.photos = Array.isArray(data.photos) ? data.photos : [];
    data.amenities = Array.isArray(data.amenities) ? data.amenities : [];
    data.listedById = req.user.id;
    // Record the hat the user wore when listing (supply side). Must be a hat
    // this account is allowed to wear, then clamped to seller|dealer.
    const supplyHat = req.body.actingRole || req.user.viewRole || req.user.role;
    if (!isAllowedViewRole(req.user.role, supplyHat)) {
      return res.status(400).json({ message: viewRoleDeniedMessage(req.user.role) });
    }
    data.actingRole = normalizeSupply(supplyHat);

    const validationError = validatePropertyData(data);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const property = await prisma.property.create({ data });

    // Bell confirmation that the listing went live.
    notifyUserInBackground({
      recipientId: req.user.id,
      type: TYPES.PROPERTY_CREATED,
      title: 'Property posted',
      body: `${property.title} is now live. We'll tell you as soon as it matches a buyer.`,
      link: '/my-listings',
      entityType: 'property',
      entityId: property.id,
      allowSelf: true,
    });

    // Fire-and-forget confirmation email to whoever listed it.
    notifyInBackground(async () => {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { name: true, email: true },
      });
      if (!user?.email) return;
      await sendPropertyCreatedEmail(
        user.email,
        user.name,
        {
          title: property.title,
          propertyType: property.propertyType,
          city: property.location?.city,
          area: property.location?.area,
          price: property.price,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          size: property.size,
          sizeUnit: property.sizeUnit,
        },
        appUrl(`/property/${property.id}`),
      );
    });

    // Generate automatic matches (emails both sides about anything new)
    await generateMatchesForProperty(property, req.user.id, { notify: true });

    res.status(201).json(property);
  } catch (error) {
    next(error);
  }
};

// Get all properties (with filters)
const getProperties = async (req, res, next) => {
  const { city, price, propertyType, status } = req.query;
  const where = {};

  // Only published statuses show up by default. An explicit `status` query
  // still overrides (used internally/for debugging); without one, admin
  // pending/rejected listings must never appear in public results.
  where.status = status || { notIn: ['pending', 'rejected'] };

  if (city) where.location = { path: ['city'], equals: city };
  if (price) {
    // Accepts "1000", "1000-5000", or "-5000". Invalid/empty segments are
    // skipped instead of producing a NaN range that matches nothing.
    const [rawMin, rawMax] = String(price).split('-');
    const min = Number(rawMin);
    const max = rawMax !== undefined ? Number(rawMax) : undefined;
    if (!Number.isNaN(min)) where.price = { ...where.price, gte: min };
    if (!Number.isNaN(max)) where.price = { ...where.price, lte: max };
  }
  if (propertyType) where.propertyType = propertyType;

  try {
    const pag = parsePagination(req);
    const args = { where, include: { listedBy: listedBySelect } };
    if (pag.enabled) {
      args.skip = pag.skip;
      args.take = pag.take;
    }

    const properties = await prisma.property.findMany(args);

    if (pag.enabled) {
      const total = await prisma.property.count({ where });
      return res.status(200).json(paginated(properties, total, pag.page, pag.limit));
    }

    res.status(200).json(properties);
  } catch (error) {
    next(error);
  }
};

// Update a property
const updateProperty = async (req, res, next) => {
  const { id } = req.params;

  try {
    const data = buildPropertyData(req.body, { partial: true });
    const validationError = validatePropertyData(data, { partial: true });
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    // Ownership-scoped update.
    const result = await prisma.property.updateMany({
      where: { id, listedById: req.user.id },
      data,
    });
    if (result.count === 0) {
      return res.status(404).json({ message: 'Property not found or unauthorized.' });
    }

    const property = await prisma.property.findUnique({ where: { id } });
    res.status(200).json(property);
  } catch (error) {
    next(error);
  }
};

// Delete a property (listings/matches/trips cascade via FK onDelete)
const deleteProperty = async (req, res, next) => {
  const { id } = req.params;

  try {
    const result = await prisma.property.deleteMany({
      where: { id, listedById: req.user.id },
    });
    if (result.count === 0) {
      return res.status(404).json({ message: 'Property not found or unauthorized.' });
    }

    res.status(200).json({ message: 'Property and listing deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

// Get single property by ID
const getPropertyById = async (req, res, next) => {
  const { id } = req.params;

  try {
    const property = await prisma.property.findUnique({
      where: { id },
      include: { listedBy: listedBySelect },
    });
    if (!property) {
      return res.status(404).json({ message: 'Property not found.' });
    }
    res.status(200).json(property);
  } catch (error) {
    next(error);
  }
};

// Search properties with text search
const searchProperties = async (req, res, next) => {
  const { q, city, area, minPrice, maxPrice, propertyType, bedrooms, bathrooms } = req.query;
  const where = {};

  // Text search across title and description
  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
    ];
  }

  // Location filters — both are paths into the same JSON column, so combine
  // them with AND rather than overwriting a single `location` key.
  const locationFilters = [];
  if (city) locationFilters.push({ location: { path: ['city'], equals: city } });
  if (area) locationFilters.push({ location: { path: ['area'], equals: area } });
  if (locationFilters.length) where.AND = locationFilters;

  // Price range
  if (minPrice || maxPrice) {
    where.price = {};
    if (minPrice) where.price.gte = Number(minPrice);
    if (maxPrice) where.price.lte = Number(maxPrice);
  }

  // Property details
  if (propertyType) where.propertyType = propertyType;
  if (bedrooms) where.bedrooms = { gte: Number(bedrooms) };
  if (bathrooms) where.bathrooms = { gte: Number(bathrooms) };

  try {
    const pag = parsePagination(req);
    const args = { where, include: { listedBy: listedBySelect } };
    if (pag.enabled) {
      args.skip = pag.skip;
      args.take = pag.take;
    }

    const properties = await prisma.property.findMany(args);

    if (pag.enabled) {
      const total = await prisma.property.count({ where });
      return res.status(200).json(paginated(properties, total, pag.page, pag.limit));
    }

    res.status(200).json(properties);
  } catch (error) {
    next(error);
  }
};

// GET /api/properties/:id/contact — the paid reveal.
// Returns the lister's phone/email only to the owner themselves or to a user
// holding an approved plan. Everyone else gets 402 so the client can route
// them to /plans. This is the real gate: the contact details are on no other
// endpoint, so hiding the button alone would not be enough.
const getPropertyContact = async (req, res, next) => {
  try {
    const property = await prisma.property.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        listedById: true,
        listedBy: {
          select: { id: true, name: true, role: true, phone: true, email: true },
        },
      },
    });

    if (!property || !property.listedBy) {
      return res.status(404).json({ message: 'Property not found.' });
    }

    const isOwner = property.listedById === req.user.id;
    const unlocked = isOwner || (await hasContactAccess(req.user.id));

    if (!unlocked) {
      return res.status(402).json({
        code: 'PLAN_REQUIRED',
        message: "Choose a plan to see the owner's contact details.",
      });
    }

    const { name, role, phone, email } = property.listedBy;
    res.status(200).json({ name, role, phone: phone || '', email: email || '' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProperty,
  getProperties,
  getPropertyById,
  searchProperties,
  updateProperty,
  deleteProperty,
  getPropertyContact,
  generateMatchesForProperty,
};
