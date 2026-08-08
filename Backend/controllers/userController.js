const prisma = require('../db/prisma');

// Public read-only profile lookup. Excludes password and email; we only expose
// fields the client renders on the public Profile page.
const getPublicUser = async (req, res) => {
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
    res.status(500).json({ message: error.message });
  }
};

// Authenticated user updates their own profile. Whitelisted fields only —
// callers can't escalate role or flip `verified` through this endpoint.
const VIEW_ROLES = ['seller', 'buyer', 'dealer'];

const updateMe = async (req, res) => {
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
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getPublicUser, updateMe };
