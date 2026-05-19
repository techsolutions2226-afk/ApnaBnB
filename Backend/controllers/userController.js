const User = require('../models/User');

// Public read-only profile lookup. Excludes password and email; we only expose
// fields the client renders on the public Profile page.
const getPublicUser = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findById(id).select('name role verified avatar phone location createdAt');

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Authenticated user updates their own profile. Whitelisted fields only â€”
// callers can't escalate role or flip `verified` through this endpoint.
const updateMe = async (req, res) => {
  const allowed = ['name', 'avatar', 'phone', 'location', 'emergencyContact'];
  const updates = {};
  for (const key of allowed) {
    if (key in req.body) updates[key] = req.body[key];
  }

  try {
    const user = await User.findByIdAndUpdate(req.user.id, updates, {
      returnDocument: 'after',
      runValidators: true,
    }).select('name email role verified avatar phone location emergencyContact createdAt');

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getPublicUser, updateMe };
