const User = require('../models/User');
const Property = require('../models/Property');

// Get platform stats
const getPlatformStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalActiveProperties = await Property.countDocuments({ status: 'active' });

    res.status(200).json({
      totalUsers,
      totalActiveProperties,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Verify/Suspend users
const manageUser = async (req, res) => {
  const { id } = req.params;
  const { action } = req.body; // Example: action can be 'verify' or 'suspend'

  if (action !== 'verify' && action !== 'suspend') {
    return res.status(400).json({ message: 'Invalid action. Use "verify" or "suspend".' });
  }

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    user.verified = action === 'verify';
    await user.save();

    res.status(200).json({ message: `User ${action}ed successfully.` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Moderate property
const moderateProperty = async (req, res) => {
  const { id } = req.params;
  const { action } = req.body; // Example: action can be 'approve', 'reject', or 'delete'

  if (!['approve', 'reject', 'delete'].includes(action)) {
    return res.status(400).json({ message: 'Invalid action. Use "approve", "reject", or "delete".' });
  }

  try {
    const property = await Property.findById(id);
    if (!property) {
      return res.status(404).json({ message: 'Property not found.' });
    }

    if (action === 'delete') {
      await property.remove();
    } else {
      property.status = action === 'approve' ? 'active' : 'rejected';
      await property.save();
    }

    res.status(200).json({ message: `Property ${action}d successfully.` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getPlatformStats, manageUser, moderateProperty };