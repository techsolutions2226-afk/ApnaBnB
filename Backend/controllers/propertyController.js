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
const {
  notifyPropertyMatches,
  notifyInBackground,
  appUrl,
} = require('../utils/matchNotifier');

// ── Helpers ──────────────────────────────────────────────────────────────
const num = (v) =>
  v === undefined || v === null || v === '' ? undefined : Number(v);

// Whitelist + coerce the writable Property fields. Prisma rejects unknown keys
// (so raw req.body would throw on stray `_id`/`listedBy`), and it won't coerce
// string→number the way Mongoose did — so we normalise here. `partial` keeps
// only the keys present in the body (for updates).
const buildPropertyData = (body, { partial = false } = {}) => {
  const data = {};
  const set = (key, val) => {
    if (val !== undefined) data[key] = val;
  };

  if (!partial || 'title' in body) set('title', body.title);
  if (!partial || 'description' in body) set('description', body.description);
  if (!partial || 'photos' in body)
    set('photos', Array.isArray(body.photos) ? body.photos : undefined);
  if (!partial || 'location' in body) set('location', body.location);
  if (!partial || 'price' in body) set('price', num(body.price));
  if (!partial || 'purpose' in body) set('purpose', body.purpose);
  if (!partial || 'category' in body) set('category', body.category);
  if (!partial || 'propertyType' in body) set('propertyType', body.propertyType);
  if (!partial || 'size' in body) set('size', num(body.size));
  if (!partial || 'sizeUnit' in body) set('sizeUnit', body.sizeUnit);
  if (!partial || 'bedrooms' in body) set('bedrooms', num(body.bedrooms));
  if (!partial || 'bathrooms' in body) set('bathrooms', num(body.bathrooms));
  if (!partial || 'amenities' in body)
    set('amenities', Array.isArray(body.amenities) ? body.amenities : undefined);
  if (!partial || 'securityDeposit' in body)
    set('securityDeposit', num(body.securityDeposit));
  if (!partial || 'leaseTerm' in body) set('leaseTerm', num(body.leaseTerm));
  if (!partial || 'furnished' in body) set('furnished', body.furnished);
  if ('availableFrom' in body)
    set('availableFrom', body.availableFrom ? new Date(body.availableFrom) : null);
  if (!partial || 'contactName' in body) set('contactName', body.contactName);
  if (!partial || 'contactEmail' in body) set('contactEmail', body.contactEmail);
  if (!partial || 'contactPhone' in body) set('contactPhone', body.contactPhone);
  if ('status' in body) set('status', body.status);

  return data;
};

const listedBySelect = {
  select: { id: true, name: true, email: true, role: true, avatar: true },
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
      const addressParts = [location?.area, location?.city, 'Pakistan'].filter(Boolean);
      const coords = await geocodeAddress(addressParts.join(', '));
      if (coords) {
        resolvedLocation = { ...location, coordinates: coords };
      }
    }

    const data = buildPropertyData(req.body);
    data.location = resolvedLocation;
    data.purpose = req.body.purpose || 'sale';
    data.category = req.body.category || 'home';
    data.sizeUnit = req.body.sizeUnit || 'Marla';
    data.furnished = req.body.furnished || 'unfurnished';
    data.securityDeposit = num(req.body.securityDeposit) || 0;
    data.leaseTerm = num(req.body.leaseTerm) || 12;
    data.photos = Array.isArray(req.body.photos) ? req.body.photos : [];
    data.amenities = Array.isArray(req.body.amenities) ? req.body.amenities : [];
    data.listedById = req.user.id;
    // Record the hat the user wore when listing (supply side). Uses the role
    // they selected in the dashboard, clamped to seller|dealer; falls back to
    // their account role.
    data.actingRole = normalizeSupply(req.body.actingRole || req.user.role);

    const property = await prisma.property.create({ data });

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

module.exports = {
  createProperty,
  getProperties,
  getPropertyById,
  searchProperties,
  updateProperty,
  deleteProperty,
  generateMatchesForProperty,
};
