const prisma = require('../db/prisma');
const { enrichMatchesWithAI } = require('../utils/aiMatch');
const { parsePagination, paginated } = require('../utils/pagination');
const {
  calculateMatchScore,
  determineMatchType,
  isMatchCandidate,
  normalizeDemand,
} = require('../utils/matchScore');
const { sendRequirementCreatedEmail } = require('../utils/mailer');
const {
  notifyRequirementMatches,
  notifyInBackground,
  appUrl,
} = require('../utils/matchNotifier');

const num = (v) =>
  v === undefined || v === null || v === '' ? undefined : Number(v);

// Normalise budget to numeric { min, max } (JSON column). matchScore treats
// null as 0 / Infinity via its `|| 0` / `|| Infinity` guards.
const toBudget = (b) => {
  if (!b || typeof b !== 'object') return undefined;
  return {
    min: b.min !== undefined && b.min !== null && b.min !== '' ? Number(b.min) : null,
    max: b.max !== undefined && b.max !== null && b.max !== '' ? Number(b.max) : null,
  };
};

const requiredBySelect = {
  select: { id: true, name: true, email: true, role: true },
};

// Auto-generate matches for a newly-created requirement.
// Same strict criteria as the property side — see propertyController for notes.
// `notify` is opt-in so bulk callers never blast emails; the real user-facing
// paths (createRequirement, manual regenerate) pass it explicitly.
const generateMatchesForRequirement = async (requirement, userId, { notify = false } = {}) => {
  try {
    const requirementOwner = await prisma.user.findUnique({
      where: { id: requirement.requiredById },
      select: { role: true },
    });
    if (!requirementOwner) return [];

    const pt = requirement.propertyType;
    const properties = await prisma.property.findMany({
      where: {
        location: { path: ['city'], equals: requirement.location.city },
        propertyType: { in: [pt, pt.toLowerCase()] },
        // Exclude only sold properties — pending/active/featured are eligible.
        status: { not: 'sold' },
      },
      include: { listedBy: { select: { id: true, role: true } } },
    });

    const candidates = [];
    for (const property of properties) {
      if (!isMatchCandidate(property, requirement)) continue;

      // Prefer the acting role stored on each record; fall back to account role.
      const matchType = determineMatchType(
        property.actingRole || property.listedBy?.role,
        requirement.actingRole || requirementOwner.role,
      );
      if (!matchType) continue;

      candidates.push({ property, matchType });
    }

    // Dedupe + create each candidate in parallel. Same matchmaking decision
    // (same set, scoring, and order) — the I/O just isn't serialized anymore.
    const matches = [];
    const aiEntries = [];
    const produced = await Promise.all(
      candidates.map(async ({ property, matchType }) => {
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
        return { match, score, property };
      }),
    );
    const pairs = [];
    for (const entry of produced) {
      if (!entry) continue;
      matches.push(entry.match);
      aiEntries.push({ matchId: entry.match.id, ruleScore: entry.score });
      pairs.push({ match: entry.match, property: entry.property });
    }
    // Kick off AI semantic scoring in the background (non-blocking).
    enrichMatchesWithAI(aiEntries);
    // Email both sides about the newly created matches (never blocks).
    if (notify) notifyInBackground(notifyRequirementMatches, requirement, pairs);
    return matches;
  } catch (error) {
    console.error('Error generating matches:', error);
    return [];
  }
};

// Create Requirement
const createRequirement = async (req, res, next) => {
  const { title, location, budget, propertyType, size, bedrooms, bathrooms, notes, urgency, purpose } = req.body;

  // Validation
  if (!title?.trim() || !location?.city || !propertyType) {
    return res.status(400).json({ message: 'Title, City and Property Type are required.' });
  }

  try {
    const requirement = await prisma.requirement.create({
      data: {
        requiredById: req.user.id,
        title: title.trim(),
        // Buy vs rent — clamp so a stray value never breaks the Postgres enum.
        // Matchmaking compares purpose verbatim, so this must line up with the
        // listing's purpose for rent requirements to match rent listings.
        purpose: purpose === 'rent' ? 'rent' : 'sale',
        location,
        budget: toBudget(budget),
        propertyType: propertyType.toLowerCase(), // Normalize to lowercase
        size: size || '',
        bedrooms: num(bedrooms),
        bathrooms: num(bathrooms),
        notes: notes || '',
        urgency: urgency || '',
        status: 'active',
        // Hat the user wore when posting (demand side). Selected role clamped
        // to buyer|dealer; falls back to their account role.
        actingRole: normalizeDemand(req.body.actingRole || req.user.role),
      },
    });

    // Fire-and-forget confirmation email to whoever posted it.
    notifyInBackground(async () => {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { name: true, email: true },
      });
      if (!user?.email) return;
      await sendRequirementCreatedEmail(
        user.email,
        user.name,
        {
          title: requirement.title,
          propertyType: requirement.propertyType,
          city: requirement.location?.city,
          area: requirement.location?.area,
          budget: requirement.budget,
          bedrooms: requirement.bedrooms,
          bathrooms: requirement.bathrooms,
          size: requirement.size,
          urgency: requirement.urgency,
        },
        appUrl(`/requirements/${requirement.id}`),
      );
    });

    // Generate automatic matches (emails both sides about anything new)
    await generateMatchesForRequirement(requirement, req.user.id, { notify: true });

    res.status(201).json(requirement);
  } catch (error) {
    next(error);
  }
};

// Get Requirements (with filters)
const getRequirements = async (req, res, next) => {
  const { city, propertyType, budget } = req.query;
  const where = {};

  if (city) where.location = { path: ['city'], equals: city };
  if (propertyType) where.propertyType = propertyType;

  try {
    // DB-level pagination when `page`/`limit` are passed; otherwise the flat
    // array the UI expects. The post-query budget JS filter below then runs on
    // that result set (legacy callers never combine budget + page).
    const pag = parsePagination(req);
    const args = { where, include: { requiredBy: requiredBySelect } };
    if (pag.enabled) {
      args.skip = pag.skip;
      args.take = pag.take;
    }

    let requirements = await prisma.requirement.findMany(args);

    // Budget filter applied in JS (budget is a JSON column). Skip NaN pieces.
    if (budget) {
      const [rawMin, rawMax] = budget.split('-');
      const min = Number(rawMin);
      const max = rawMax !== undefined ? Number(rawMax) : Infinity;
      requirements = requirements.filter(
        (r) => (!Number.isNaN(min) ? (r.budget?.min ?? 0) >= min : true) &&
               (!Number.isNaN(max) ? (r.budget?.max ?? Infinity) <= max : true),
      );
    }

    if (pag.enabled) {
      const total = await prisma.requirement.count({ where });
      return res.status(200).json(paginated(requirements, total, pag.page, pag.limit));
    }

    res.status(200).json(requirements);
  } catch (error) {
    next(error);
  }
};

// Update Requirement
const updateRequirement = async (req, res, next) => {
  const { id } = req.params;

  try {
    const b = req.body;
    const data = {};
    if ('title' in b) data.title = b.title;
    if ('location' in b) data.location = b.location;
    if ('budget' in b) data.budget = toBudget(b.budget);
    if ('purpose' in b) data.purpose = b.purpose;
    if ('propertyType' in b) data.propertyType = String(b.propertyType).toLowerCase();
    if ('size' in b) data.size = b.size || '';
    if ('bedrooms' in b) data.bedrooms = num(b.bedrooms) ?? null;
    if ('bathrooms' in b) data.bathrooms = num(b.bathrooms) ?? null;
    if ('notes' in b) data.notes = b.notes || '';
    if ('urgency' in b) data.urgency = b.urgency || '';
    if ('status' in b) data.status = b.status;

    const result = await prisma.requirement.updateMany({
      where: { id, requiredById: req.user.id },
      data,
    });
    if (result.count === 0) {
      return res.status(404).json({ message: 'Requirement not found or unauthorized.' });
    }

    const requirement = await prisma.requirement.findUnique({ where: { id } });
    res.status(200).json(requirement);
  } catch (error) {
    next(error);
  }
};

// Get Requirement by ID
const getRequirementById = async (req, res, next) => {
  const { id } = req.params;

  try {
    const requirement = await prisma.requirement.findUnique({
      where: { id },
      include: { requiredBy: requiredBySelect },
    });
    if (!requirement) {
      return res.status(404).json({ message: 'Requirement not found.' });
    }
    res.status(200).json(requirement);
  } catch (error) {
    next(error);
  }
};

// Get Requirements for a specific user. Optional ?viewRole= scopes results to
// the role the requirement was posted under (actingRole) so e.g. a buyer
// acting as dealer never sees requirements they posted as a buyer.
const getUserRequirements = async (req, res, next) => {
  const { userId } = req.params;
  const { viewRole } = req.query;

  try {
    const where = { requiredById: userId };
    if (viewRole) where.actingRole = viewRole;

    const requirements = await prisma.requirement.findMany({
      where,
      include: { requiredBy: requiredBySelect },
    });
    res.status(200).json(requirements);
  } catch (error) {
    next(error);
  }
};

// Delete Requirement (matches cascade via FK onDelete)
const deleteRequirement = async (req, res, next) => {
  const { id } = req.params;

  try {
    const result = await prisma.requirement.deleteMany({
      where: { id, requiredById: req.user.id },
    });
    if (result.count === 0) {
      return res.status(404).json({ message: 'Requirement not found or unauthorized.' });
    }

    res.status(200).json({ message: 'Requirement deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

// Search requirements with filters
const searchRequirements = async (req, res, next) => {
  const { q, city, area, minBudget, maxBudget, propertyType, bedrooms, bathrooms } = req.query;
  const where = {};

  if (q) {
    where.OR = [
      { location: { path: ['city'], string_contains: q } },
      { location: { path: ['area'], string_contains: q } },
    ];
  }

  const locationFilters = [];
  if (city) locationFilters.push({ location: { path: ['city'], equals: city } });
  if (area) locationFilters.push({ location: { path: ['area'], equals: area } });
  if (locationFilters.length) where.AND = locationFilters;

  if (propertyType) where.propertyType = propertyType;
  if (bedrooms) where.bedrooms = { gte: Number(bedrooms) };
  if (bathrooms) where.bathrooms = { gte: Number(bathrooms) };

  try {
    const pag = parsePagination(req);
    const args = { where, include: { requiredBy: requiredBySelect } };
    if (pag.enabled) {
      args.skip = pag.skip;
      args.take = pag.take;
    }

    let requirements = await prisma.requirement.findMany(args);

    // Budget overlap filter applied in JS (budget is JSON).
    if (minBudget || maxBudget) {
      const lo = minBudget ? Number(minBudget) : 0;
      const hi = maxBudget ? Number(maxBudget) : Infinity;
      requirements = requirements.filter((r) => {
        const bMax = r.budget?.max ?? Infinity;
        const bMin = r.budget?.min ?? 0;
        return bMax >= lo && bMin <= hi;
      });
    }

    if (pag.enabled) {
      const total = await prisma.requirement.count({ where });
      return res.status(200).json(paginated(requirements, total, pag.page, pag.limit));
    }

    res.status(200).json(requirements);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRequirement,
  getRequirements,
  getRequirementById,
  getUserRequirements,
  searchRequirements,
  updateRequirement,
  deleteRequirement,
  generateMatchesForRequirement,
};
