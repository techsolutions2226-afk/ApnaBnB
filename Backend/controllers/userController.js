const prisma = require('../db/prisma');

// Public read-only profile lookup. Excludes password and email; we only expose
// fields the client renders on the public Profile page.
const getPublicUser = async (req, res, next) => {
  const { id } = req.params;

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        role: true,
        verified: true,
        avatar: true,
        phone: true,
        location: true,
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
// every role dashboard (active listings, total views, inquiries, matches, and
// unread messages) with one round-trip instead of several client-side fetches.
const getUserStats = async (req, res, next) => {
  const userId = req.user.id;

  try {
    const [listings, matchCount, convs] = await Promise.all([
      prisma.listing.findMany({
        where: { ownerId: userId },
        select: { status: true, views: true, inquiries: true },
      }),
      // Same "matches that involve me" rule as matchController.involvedWhere.
      prisma.match.count({
        where: {
          OR: [
            { property: { listedById: userId } },
            { requirement: { requiredById: userId } },
          ],
        },
      }),
      prisma.conversation.findMany({
        where: { participants: { some: { id: userId } } },
        select: { id: true },
      }),
    ]);

    const unreadRows = convs.length
      ? await prisma.message.groupBy({
          by: ['conversationId'],
          where: {
            conversationId: { in: convs.map((c) => c.id) },
            read: false,
            senderId: { not: userId },
          },
          _count: { _all: true },
        })
      : [];

    res.status(200).json({
      totalListings: listings.length,
      activeListings: listings.filter((l) => l.status === 'active').length,
      totalViews: listings.reduce((sum, l) => sum + (l.views || 0), 0),
      totalInquiries: listings.reduce((sum, l) => sum + (l.inquiries || 0), 0),
      matches: matchCount,
      unreadMessages: unreadRows.reduce((sum, r) => sum + r._count._all, 0),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getPublicUser, updateMe, getUserStats };
