const prisma = require('../db/prisma');
const { parsePagination, paginated } = require('../utils/pagination');

// Seed rows matching the former hardcoded client catalog
// (client/src/config/subscriptions.js). Runs once: only inserts when the
// table is empty, so admin edits are never overwritten.
const SEED_PLANS = [
  /* ── Dealer ── */
  {
    name: 'Basic',
    slug: 'basic',
    role: 'dealer',
    monthlyPrice: 0,
    yearlyPrice: 0,
    popular: false,
    sortOrder: 1,
    description: 'Try the dealer tools before you commit.',
    features: [
      { text: 'Up to 3 active listings', included: true },
      { text: 'Requirements board access', included: true },
      { text: 'Basic matchmaking', included: true },
      { text: 'Owner contact details', included: false },
      { text: 'Priority in search results', included: false },
      { text: 'Co-brokering access', included: false },
    ],
    limits: { maxListings: 3, maxRequirements: 3, contactReveal: false, coBrokering: false, analytics: false, featuredListings: 0 },
  },
  {
    name: 'Pro',
    slug: 'pro',
    role: 'dealer',
    monthlyPrice: 4000,
    yearlyPrice: 40000,
    popular: true,
    sortOrder: 2,
    description: 'Work both sides of the market with full contact access.',
    features: [
      { text: 'Up to 25 active listings', included: true },
      { text: 'Owner contact details', included: true },
      { text: 'Advanced matchmaking', included: true },
      { text: 'Priority in search results', included: true },
      { text: 'Co-brokering access', included: true },
      { text: 'Dedicated account manager', included: false },
    ],
    limits: { maxListings: 25, maxRequirements: 25, contactReveal: true, coBrokering: true, analytics: true, featuredListings: 3 },
  },
  {
    name: 'Premium',
    slug: 'premium',
    role: 'dealer',
    monthlyPrice: 9000,
    yearlyPrice: 90000,
    popular: false,
    sortOrder: 3,
    description: 'For agencies running high listing volume.',
    features: [
      { text: 'Unlimited active listings', included: true },
      { text: 'Owner contact details', included: true },
      { text: 'Priority matchmaking', included: true },
      { text: 'Top priority in search results', included: true },
      { text: 'Co-brokering access', included: true },
      { text: 'Dedicated account manager', included: true },
    ],
    limits: { maxListings: -1, maxRequirements: -1, contactReveal: true, coBrokering: true, analytics: true, featuredListings: 10 },
  },

  /* ── Seller ── */
  {
    name: 'Starter',
    slug: 'starter',
    role: 'seller',
    monthlyPrice: 0,
    yearlyPrice: 0,
    popular: false,
    sortOrder: 1,
    description: 'List your first property at no cost.',
    features: [
      { text: 'Up to 2 active listings', included: true },
      { text: 'Appear in buyer matches', included: true },
      { text: 'Buyer contact details', included: false },
      { text: 'Featured placement', included: false },
      { text: 'Listing analytics', included: false },
    ],
    limits: { maxListings: 2, maxRequirements: 0, contactReveal: false, analytics: false, featuredListings: 0 },
  },
  {
    name: 'Pro',
    slug: 'pro',
    role: 'seller',
    monthlyPrice: 2500,
    yearlyPrice: 25000,
    popular: true,
    sortOrder: 2,
    description: 'For owners selling or renting more than one property.',
    features: [
      { text: 'Up to 15 active listings', included: true },
      { text: 'Buyer contact details', included: true },
      { text: 'Appear in buyer matches', included: true },
      { text: 'Featured placement', included: true },
      { text: 'Listing analytics', included: true },
    ],
    limits: { maxListings: 15, maxRequirements: 0, contactReveal: true, analytics: true, featuredListings: 2 },
  },
  {
    name: 'Premium',
    slug: 'premium',
    role: 'seller',
    monthlyPrice: 5000,
    yearlyPrice: 50000,
    popular: false,
    sortOrder: 3,
    description: 'Unlimited listings with the strongest visibility.',
    features: [
      { text: 'Unlimited active listings', included: true },
      { text: 'Buyer contact details', included: true },
      { text: 'Top priority in search results', included: true },
      { text: 'Featured placement', included: true },
      { text: 'Listing analytics', included: true },
    ],
    limits: { maxListings: -1, maxRequirements: 0, contactReveal: true, analytics: true, featuredListings: 6 },
  },

  /* ── Buyer ── */
  {
    name: 'Free',
    slug: 'free',
    role: 'buyer',
    monthlyPrice: 0,
    yearlyPrice: 0,
    popular: false,
    sortOrder: 1,
    description: 'Browse listings and post what you are looking for.',
    features: [
      { text: 'Browse every listing', included: true },
      { text: 'Save properties to wishlists', included: true },
      { text: 'Post up to 3 requirements', included: true },
      { text: 'Owner contact details', included: false },
      { text: 'Priority matchmaking', included: false },
    ],
    limits: { maxListings: 0, maxRequirements: 3, contactReveal: false, analytics: false, featuredListings: 0 },
  },
  {
    name: 'Plus',
    slug: 'plus',
    role: 'buyer',
    monthlyPrice: 1500,
    yearlyPrice: 15000,
    popular: true,
    sortOrder: 2,
    description: 'Reach owners directly instead of waiting to be found.',
    features: [
      { text: 'Owner contact details', included: true },
      { text: 'Post up to 15 requirements', included: true },
      { text: 'Priority matchmaking', included: true },
      { text: 'Save properties to wishlists', included: true },
      { text: 'Early access to new listings', included: false },
    ],
    limits: { maxListings: 0, maxRequirements: 15, contactReveal: true, analytics: false, featuredListings: 0 },
  },
  {
    name: 'Pro',
    slug: 'pro',
    role: 'buyer',
    monthlyPrice: 3000,
    yearlyPrice: 30000,
    popular: false,
    sortOrder: 3,
    description: 'For serious buyers and investors searching at scale.',
    features: [
      { text: 'Owner contact details', included: true },
      { text: 'Unlimited requirements', included: true },
      { text: 'Priority matchmaking', included: true },
      { text: 'Early access to new listings', included: true },
      { text: 'Save properties to wishlists', included: true },
    ],
    limits: { maxListings: 0, maxRequirements: -1, contactReveal: true, analytics: true, featuredListings: 0 },
  },
];

// Idempotent bootstrap so the legacy dealer tiers exist exactly once.
let seedPromise = null;
const ensureSeeded = async () => {
  if (!seedPromise) {
    seedPromise = (async () => {
      const count = await prisma.plan.count();
      if (count === 0) {
        await prisma.plan.createMany({ data: SEED_PLANS });
      }
    })().catch((err) => {
      seedPromise = null; // retry on next request after a transient failure
      throw err;
    });
  }
  return seedPromise;
};

// GET /api/plans?role=dealer — public catalog (active plans only)
const getPublicPlans = async (req, res, next) => {
  try {
    await ensureSeeded();
    const where = { active: true };
    if (req.query.role && ['seller', 'buyer', 'dealer'].includes(req.query.role)) {
      where.role = req.query.role;
    }
    const plans = await prisma.plan.findMany({
      where,
      orderBy: [{ role: 'asc' }, { sortOrder: 'asc' }, { monthlyPrice: 'asc' }],
    });
    res.status(200).json(plans);
  } catch (error) {
    next(error);
  }
};

// GET /api/plans/all — admin list including inactive plans
const getAllPlans = async (req, res, next) => {
  try {
    await ensureSeeded();
    const { enabled, page, limit, skip, take } = parsePagination(req);
    const where = {};
    if (req.query.role && ['seller', 'buyer', 'dealer'].includes(req.query.role)) {
      where.role = req.query.role;
    }
    const [rows, total] = await Promise.all([
      prisma.plan.findMany({
        where,
        orderBy: [{ role: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
        skip,
        take,
      }),
      prisma.plan.count({ where }),
    ]);
    res.status(200).json(enabled ? paginated(rows, total, page, limit) : rows);
  } catch (error) {
    next(error);
  }
};

const PLAN_FIELDS = [
  'name',
  'slug',
  'role',
  'monthlyPrice',
  'yearlyPrice',
  'currency',
  'description',
  'popular',
  'active',
  'features',
  'limits',
  'sortOrder',
];

// Shared validation for create/update. Returns { data } or { error }.
const validatePlanInput = (body, { partial = false } = {}) => {
  const data = {};

  if (body.name !== undefined || !partial) {
    if (!body.name || !String(body.name).trim()) return { error: 'Plan name is required.' };
    data.name = String(body.name).trim();
  }
  if (body.slug !== undefined || !partial) {
    const slug = String(body.slug ?? body.name ?? '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    if (!slug) return { error: 'Plan slug is required.' };
    data.slug = slug;
  }
  if (body.role !== undefined || !partial) {
    if (!['seller', 'buyer', 'dealer'].includes(body.role)) {
      return { error: 'Role must be seller, buyer or dealer.' };
    }
    data.role = body.role;
  }
  for (const field of ['monthlyPrice', 'yearlyPrice']) {
    if (body[field] !== undefined || !partial) {
      const n = Number(body[field]);
      if (!Number.isFinite(n) || n < 0) {
        return { error: `${field} must be a non-negative number.` };
      }
      data[field] = n;
    }
  }
  if (body.currency !== undefined) {
    data.currency = String(body.currency).trim().toUpperCase() || 'PKR';
  }
  if (body.description !== undefined) {
    data.description = body.description ? String(body.description).trim() : null;
  }
  for (const flag of ['popular', 'active']) {
    if (body[flag] !== undefined) data[flag] = !!body[flag];
  }
  if (body.features !== undefined) {
    if (!Array.isArray(body.features)) return { error: 'Features must be an array.' };
    data.features = body.features.map((f) => ({
      text: String(f?.text ?? '').trim(),
      included: f?.included !== false,
    }));
  }
  if (body.limits !== undefined) {
    if (typeof body.limits !== 'object' || body.limits === null || Array.isArray(body.limits)) {
      return { error: 'Limits must be an object.' };
    }
    data.limits = body.limits;
  }
  if (body.sortOrder !== undefined) {
    const n = parseInt(body.sortOrder, 10);
    if (!Number.isFinite(n)) return { error: 'sortOrder must be an integer.' };
    data.sortOrder = n;
  }

  return { data };
};

// POST /api/plans — admin create
const createPlan = async (req, res, next) => {
  const { data, error } = validatePlanInput(req.body);
  if (error) return res.status(400).json({ message: error });

  try {
    // Slug is unique per ROLE: "basic" may exist for dealer AND seller as
    // separate plans, but never twice within one role.
    const exists = await prisma.plan.findUnique({
      where: { role_slug: { role: data.role, slug: data.slug } },
    });
    if (exists) {
      return res.status(409).json({
        message: `A "${data.slug}" plan already exists for this role.`,
      });
    }
    const plan = await prisma.plan.create({ data });
    res.status(201).json(plan);
  } catch (err) {
    next(err);
  }
};

// PUT /api/plans/:id — admin update
const updatePlan = async (req, res, next) => {
  const { id } = req.params;
  const { data, error } = validatePlanInput(req.body, { partial: true });
  if (error) return res.status(400).json({ message: error });

  try {
    const existing = await prisma.plan.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'Plan not found.' });

    const nextRole = data.role ?? existing.role;
    const nextSlug = data.slug ?? existing.slug;
    if (nextSlug !== existing.slug || nextRole !== existing.role) {
      const clash = await prisma.plan.findUnique({
        where: { role_slug: { role: nextRole, slug: nextSlug } },
      });
      if (clash && clash.id !== id) {
        return res.status(409).json({
          message: `A "${nextSlug}" plan already exists for this role.`,
        });
      }
    }
    const plan = await prisma.plan.update({ where: { id }, data });
    res.status(200).json(plan);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/plans/:id — admin delete. Past payments keep their snapshot
// fields (planId/planName/amount), so history stays intact.
const deletePlan = async (req, res, next) => {
  const { id } = req.params;
  try {
    const existing = await prisma.plan.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'Plan not found.' });
    await prisma.plan.delete({ where: { id } });
    res.status(200).json({ message: `Plan "${existing.name}" deleted.` });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  SEED_PLANS,
  getPublicPlans,
  getAllPlans,
  createPlan,
  updatePlan,
  deletePlan,
};
