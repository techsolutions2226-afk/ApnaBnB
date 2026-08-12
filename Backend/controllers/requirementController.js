const prisma = require('../db/prisma');
const { enrichMatchesWithAI } = require('../utils/aiMatch');
const {
  calculateMatchScore,
  determineMatchType,
  isMatchCandidate,
  normalizeDemand,
} = require('../utils/matchScore');

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
const generateMatchesForRequirement = async (requirement, userId) => {
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

    const matches = [];
    const aiEntries = [];
    for (const property of properties) {
      if (!isMatchCandidate(property, requirement)) continue;

      // Prefer the acting role stored on each record; fall back to account role.
      const matchType = determineMatchType(
        property.actingRole || property.listedBy?.role,
        requirement.actingRole || requirementOwner.role,
      );
      if (!matchType) continue;

      const existingMatch = await prisma.match.findFirst({
        where: { propertyId: property.id, requirementId: requirement.id },
      });
      if (existingMatch) continue;

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
      matches.push(match);
      aiEntries.push({ matchId: match.id, ruleScore: score });
    }
    // Kick off AI semantic scoring in the background (non-blocking).
    enrichMatchesWithAI(aiEntries);
    return matches;
  } catch (error) {
    console.error('Error generating matches:', error);
    return [];
  }
};

// Create Requirement
const createRequirement = async (req, res) => {
  const { title, location, budget, propertyType, size, bedrooms, bathrooms, notes, urgency } = req.body;

  // Validation
  if (!title?.trim() || !location?.city || !propertyType) {
    return res.status(400).json({ message: 'Title, City and Property Type are required.' });
  }

  try {
    const requirement = await prisma.requirement.create({
      data: {
        requiredById: req.user.id,
        title: title.trim(),
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

    // Generate automatic matches
    await generateMatchesForRequirement(requirement, req.user.id);

    res.status(201).json(requirement);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Requirements (with filters)
const getRequirements = async (req, res) => {
  const { city, propertyType, budget } = req.query;
  const where = {};

  if (city) where.location = { path: ['city'], equals: city };
  if (propertyType) where.propertyType = propertyType;

  try {
    let requirements = await prisma.requirement.findMany({
      where,
      include: { requiredBy: requiredBySelect },
    });

    // Budget filter applied in JS (budget is a JSON column).
    if (budget) {
      const [min, max] = budget.split('-').map(Number);
      requirements = requirements.filter(
        (r) => (r.budget?.min ?? 0) >= min && (r.budget?.max ?? Infinity) <= max,
      );
    }

    res.status(200).json(requirements);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update Requirement
const updateRequirement = async (req, res) => {
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
    res.status(500).json({ message: error.message });
  }
};

// Get Requirement by ID
const getRequirementById = async (req, res) => {
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
    res.status(500).json({ message: error.message });
  }
};

// Get Requirements for a specific user
const getUserRequirements = async (req, res) => {
  const { userId } = req.params;

  try {
    const requirements = await prisma.requirement.findMany({
      where: { requiredById: userId },
      include: { requiredBy: requiredBySelect },
    });
    res.status(200).json(requirements);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete Requirement (matches cascade via FK onDelete)
const deleteRequirement = async (req, res) => {
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
    res.status(500).json({ message: error.message });
  }
};

// Search requirements with filters
const searchRequirements = async (req, res) => {
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
    let requirements = await prisma.requirement.findMany({
      where,
      include: { requiredBy: requiredBySelect },
    });

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

    res.status(200).json(requirements);
  } catch (error) {
    res.status(500).json({ message: error.message });
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
