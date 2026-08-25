const prisma = require('../db/prisma');
const { involvedWhere, roleInvolvedWhere } = require('./matchController');
const { hasContactAccess } = require('../utils/subscription');

// Public read-only profile lookup. Excludes password and email; we only expose
// fields the client renders on the public Profile page.
const getPublicUser = async (req, res, next) => {
  const { id } = req.params;

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      // Deliberately NO phone / location / email: this route is unauthenticated,
      // so anything selected here is world-readable. Contact details are a paid
      // reveal and come only from getUserProfile below.
      select: {
        id: true,
        name: true,
        role: true,
        verified: true,
        avatar: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

// GET /api/users/:id/profile — the full owner profile behind the paid gate.
// Returns everything a member may see about a lister: identity, contact
// details, where they operate, and their active listings. Open to the user
// themselves and to anyone holding an approved plan; everyone else gets 402
// so the client can route them to /plans.
const getUserProfile = async (req, res, next) => {
  const { id } = req.params;

  try {
    const isSelf = req.user.id === id;
    if (!isSelf && !(await hasContactAccess(req.user.id))) {
      return res.status(402).json({
        code: 'PLAN_REQUIRED',
        message: 'Choose a plan to see full owner details.',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        role: true,
        viewRole: true,
        verified: true,
        avatar: true,
        email: true,
        phone: true,
        location: true,
        latitude: true,
        longitude: true,
        createdAt: true,
        lastSeenAt: true,
        _count: { select: { properties: true, listings: true, requirements: true } },
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Their other listings, so the viewer can judge the lister at a glance.
    const properties = await prisma.property.findMany({
      where: { listedById: id, status: 'active' },
      orderBy: { createdAt: 'desc' },
      take: 12,
      select: {
        id: true,
        title: true,
        price: true,
        purpose: true,
        category: true,
        photos: true,
        location: true,
        bedrooms: true,
        bathrooms: true,
        size: true,
        sizeUnit: true,
        propertyType: true,
        createdAt: true,
      },
    });

    res.status(200).json({ ...user, properties });
  } catch (error) {
    next(error);
  }
};

// Authenticated user updates their own profile. Whitelisted fields only —
// callers can't escalate role or flip `verified` through this endpoint.
const VIEW_ROLES = ['seller', 'buyer', 'dealer'];

const updateMe = async (req, res, next) => {
  const allowed = ['name', 'avatar', 'phone', 'location', 'emergencyContact', 'viewRole'];
  const updates = {};
  for (const key of allowed) {
    if (key in req.body) updates[key] = req.body[key];
  }

  // The "Viewing as" hat must be a real dashboard role (or null to clear).
  if ('viewRole' in updates) {
    if (updates.viewRole === null || updates.viewRole === '') {
      updates.viewRole = null;
    } else if (!VIEW_ROLES.includes(updates.viewRole)) {
      return res.status(400).json({ message: 'Invalid viewRole.' });
    }
  }

  try {
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: updates,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        viewRole: true,
        verified: true,
        avatar: true,
        phone: true,
        location: true,
        emergencyContact: true,
        createdAt: true,
      },
    });

    res.status(200).json(user);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'User not found.' });
    }
    next(error);
  }
};

// Live dashboard metrics for the authenticated user — powers the stat cards on
// every role dashboard (active listings, total views, inquiries, matches) with
// one round-trip instead of several client-side fetches.
const getUserStats = async (req, res, next) => {
  const userId = req.user.id;
  const viewRole = req.query.viewRole;
  // Scope match counts + listing counts to the role the user is acting as
  // (same rule as the match/list/requirement endpoints) so every dashboard
  // stat matches what that role sees.
  const matchWhere = viewRole
    ? roleInvolvedWhere(userId, viewRole)
    : involvedWhere(userId);

  const listingWhere = { ownerId: userId };
  if (viewRole) listingWhere.property = { actingRole: viewRole };

  try {
    const [listings, matchCount] = await Promise.all([
      prisma.listing.findMany({
        where: listingWhere,
        select: { status: true, views: true, inquiries: true },
      }),
      prisma.match.count({ where: matchWhere }),
    ]);

    res.status(200).json({
      totalListings: listings.length,
      activeListings: listings.filter((l) => l.status === 'active').length,
      totalViews: listings.reduce((sum, l) => sum + (l.views || 0), 0),
      totalInquiries: listings.reduce((sum, l) => sum + (l.inquiries || 0), 0),
      matches: matchCount,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUserProfile, getPublicUser, updateMe, getUserStats };
