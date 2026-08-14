const prisma = require('../db/prisma');
const { decryptMessage } = require('../utils/messageCrypto');

// Get platform stats
const getPlatformStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalProperties,
      totalActiveProperties,
      totalRequirements,
      totalMatches,
      totalConversations,
      totalMessages,
      roleGroups,
      statusGroups,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.property.count(),
      prisma.property.count({ where: { status: 'active' } }),
      prisma.requirement.count(),
      prisma.match.count(),
      prisma.conversation.count(),
      prisma.message.count(),
      prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
      prisma.property.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);

    // Match the previous {_id, count} shape the dashboard consumes.
    const usersByRole = roleGroups.map((g) => ({ _id: g.role, count: g._count._all }));
    const listingsByStatus = statusGroups.map((g) => ({ _id: g.status, count: g._count._all }));

    res.status(200).json({
      totalUsers,
      totalProperties,
      totalActiveProperties,
      totalRequirements,
      totalMatches,
      totalConversations,
      totalMessages,
      usersByRole,
      listingsByStatus,
    });
  } catch (error) {
    next(error);
  }
};

// Get all users
const getAllUsers = async (req, res, next) => {
  try {
    const { role, verified, page = 1, limit = 20 } = req.query;
    const where = {};

    if (role) where.role = role;
    if (verified !== undefined) where.verified = verified === 'true';

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        omit: { password: true },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.user.count({ where }),
    ]);

    res.status(200).json({
      users,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    next(error);
  }
};

// Get single user by ID
const getUserById = async (req, res, next) => {
  const { id } = req.params;

  try {
    const user = await prisma.user.findUnique({ where: { id }, omit: { password: true } });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const [listings, requirements, matches] = await Promise.all([
      prisma.property.count({ where: { listedById: id } }),
      prisma.requirement.count({ where: { requiredById: id } }),
      prisma.match.count({ where: { initiatorId: id } }),
    ]);

    res.status(200).json({ user, activity: { listings, requirements, matches } });
  } catch (error) {
    next(error);
  }
};

// Verify/Suspend users
const manageUser = async (req, res, next) => {
  const { id } = req.params;
  const { action } = req.body;

  if (action !== 'verify' && action !== 'suspend') {
    return res.status(400).json({ message: 'Invalid action. Use "verify" or "suspend".' });
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: { verified: action === 'verify' },
      omit: { password: true },
    });
    res.status(200).json({ message: `User ${action}ed successfully.`, user });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'User not found.' });
    }
    next(error);
  }
};

// Verify user endpoint (specific)
const verifyUser = async (req, res, next) => {
  const { id } = req.params;
  try {
    const user = await prisma.user.update({
      where: { id },
      data: { verified: true },
      omit: { password: true },
    });
    res.status(200).json({ message: 'User verified successfully.', user });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'User not found.' });
    }
    next(error);
  }
};

// Suspend user endpoint (specific)
const suspendUser = async (req, res, next) => {
  const { id } = req.params;
  try {
    const user = await prisma.user.update({
      where: { id },
      data: { verified: false },
      omit: { password: true },
    });
    res.status(200).json({ message: 'User suspended successfully.', user });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'User not found.' });
    }
    next(error);
  }
};

// Get all properties (admin view)
const getAllProperties = async (req, res, next) => {
  try {
    const { status, city, page = 1, limit = 20 } = req.query;
    const where = {};

    if (status) where.status = status;
    if (city) where.location = { path: ['city'], equals: city };

    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where,
        include: { listedBy: { select: { id: true, name: true, email: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.property.count({ where }),
    ]);

    res.status(200).json({
      properties,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    next(error);
  }
};

// Approve property
const approveProperty = async (req, res, next) => {
  const { id } = req.params;
  try {
    const property = await prisma.property.update({
      where: { id },
      data: { status: 'active' },
      include: { listedBy: { select: { id: true, name: true, email: true } } },
    });
    res.status(200).json({ message: 'Property approved successfully.', property });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Property not found.' });
    }
    next(error);
  }
};

// Reject property
const rejectProperty = async (req, res, next) => {
  const { id } = req.params;
  try {
    const property = await prisma.property.update({
      where: { id },
      data: { status: 'rejected' },
      include: { listedBy: { select: { id: true, name: true, email: true } } },
    });
    res.status(200).json({ message: 'Property rejected successfully.', property });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Property not found.' });
    }
    next(error);
  }
};

// Moderate property (legacy - supports approve/reject/delete)
const moderateProperty = async (req, res, next) => {
  const { id } = req.params;
  const { action } = req.body;

  if (!['approve', 'reject', 'delete'].includes(action)) {
    return res.status(400).json({ message: 'Invalid action. Use "approve", "reject", or "delete".' });
  }

  try {
    if (action === 'delete') {
      await prisma.property.delete({ where: { id } });
    } else {
      await prisma.property.update({
        where: { id },
        data: { status: action === 'approve' ? 'active' : 'rejected' },
      });
    }
    res.status(200).json({ message: `Property ${action}d successfully.` });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Property not found.' });
    }
    next(error);
  }
};

// Get all messages (admin view) — content decrypted for readability.
const getAllMessages = async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        include: {
          sender: { select: { id: true, name: true, email: true, role: true } },
          conversation: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.message.count(),
    ]);

    const decrypted = messages.map((m) => ({ ...m, content: decryptMessage(m.content) }));

    res.status(200).json({
      messages: decrypted,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    next(error);
  }
};

// Get platform activity logs
const getActivityLogs = async (req, res, next) => {
  try {
    const { days = 7 } = req.query;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const w = { createdAt: { gte: since } };

    const [userSignups, newListings, newRequirements, newMatches, newMessages] =
      await Promise.all([
        prisma.user.count({ where: w }),
        prisma.property.count({ where: w }),
        prisma.requirement.count({ where: w }),
        prisma.match.count({ where: w }),
        prisma.message.count({ where: w }),
      ]);

    res.status(200).json({
      period: `${days} days`,
      activity: { userSignups, newListings, newRequirements, newMatches, newMessages },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPlatformStats,
  getAllUsers,
  getUserById,
  manageUser,
  verifyUser,
  suspendUser,
  getAllProperties,
  approveProperty,
  rejectProperty,
  moderateProperty,
  getAllMessages,
  getActivityLogs,
};
