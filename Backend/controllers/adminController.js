const User = require('../models/User');
const Property = require('../models/Property');
const Requirement = require('../models/Requirement');
const Match = require('../models/Match');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

// Get platform stats
const getPlatformStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalProperties = await Property.countDocuments();
    const totalActiveProperties = await Property.countDocuments({ status: 'active' });
    const totalRequirements = await Requirement.countDocuments();
    const totalMatches = await Match.countDocuments();
    const totalConversations = await Conversation.countDocuments();
    const totalMessages = await Message.countDocuments();

    // User breakdown by role
    const usersByRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    // Listings by status
    const listingsByStatus = await Property.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    res.status(200).json({
      totalUsers,
      totalProperties,
      totalActiveProperties,
      totalRequirements,
      totalMatches,
      totalConversations,
      totalMessages,
      usersByRole,
      listingsByStatus
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all users
const getAllUsers = async (req, res) => {
  try {
    const { role, verified, page = 1, limit = 20 } = req.query;
    let filter = {};
    
    if (role) filter.role = role;
    if (verified !== undefined) filter.verified = verified === 'true';

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await User.countDocuments(filter);

    res.status(200).json({
      users,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single user by ID
const getUserById = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findById(id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Get user's activity
    const listings = await Property.countDocuments({ listedBy: id });
    const requirements = await Requirement.countDocuments({ requiredBy: id });
    const matches = await Match.countDocuments({ initiator: id });

    res.status(200).json({
      user,
      activity: { listings, requirements, matches }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Verify/Suspend users
const manageUser = async (req, res) => {
  const { id } = req.params;
  const { action } = req.body;

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

    res.status(200).json({ message: `User ${action}ed successfully.`, user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Verify user endpoint (specific)
const verifyUser = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findByIdAndUpdate(
      id,
      { verified: true },
      { returnDocument: 'after' }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.status(200).json({ message: 'User verified successfully.', user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Suspend user endpoint (specific)
const suspendUser = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findByIdAndUpdate(
      id,
      { verified: false },
      { returnDocument: 'after' }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.status(200).json({ message: 'User suspended successfully.', user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all properties (admin view)
const getAllProperties = async (req, res) => {
  try {
    const { status, city, page = 1, limit = 20 } = req.query;
    let filter = {};
    
    if (status) filter.status = status;
    if (city) filter['location.city'] = city;

    const properties = await Property.find(filter)
      .populate('listedBy', 'name email role')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Property.countDocuments(filter);

    res.status(200).json({
      properties,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Approve property
const approveProperty = async (req, res) => {
  const { id } = req.params;

  try {
    const property = await Property.findByIdAndUpdate(
      id,
      { status: 'active' },
      { returnDocument: 'after' }
    ).populate('listedBy', 'name email');

    if (!property) {
      return res.status(404).json({ message: 'Property not found.' });
    }

    res.status(200).json({ message: 'Property approved successfully.', property });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Reject property
const rejectProperty = async (req, res) => {
  const { id } = req.params;

  try {
    const property = await Property.findByIdAndUpdate(
      id,
      { status: 'rejected' },
      { returnDocument: 'after' }
    ).populate('listedBy', 'name email');

    if (!property) {
      return res.status(404).json({ message: 'Property not found.' });
    }

    res.status(200).json({ message: 'Property rejected successfully.', property });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Moderate property (legacy - supports approve/reject/delete)
const moderateProperty = async (req, res) => {
  const { id } = req.params;
  const { action } = req.body;

  if (!['approve', 'reject', 'delete'].includes(action)) {
    return res.status(400).json({ message: 'Invalid action. Use "approve", "reject", or "delete".' });
  }

  try {
    const property = await Property.findById(id);
    if (!property) {
      return res.status(404).json({ message: 'Property not found.' });
    }

    if (action === 'delete') {
      await Property.findByIdAndDelete(id);
    } else {
      property.status = action === 'approve' ? 'active' : 'rejected';
      await property.save();
    }

    res.status(200).json({ message: `Property ${action}d successfully.` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all messages (admin view)
const getAllMessages = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;

    const messages = await Message.find()
      .populate('sender', 'name email role')
      .populate('conversationId')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Message.countDocuments();

    res.status(200).json({
      messages,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get platform activity logs
const getActivityLogs = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Get counts by day
    const userSignups = await User.countDocuments({ createdAt: { $gte: since } });
    const newListings = await Property.countDocuments({ createdAt: { $gte: since } });
    const newRequirements = await Requirement.countDocuments({ createdAt: { $gte: since } });
    const newMatches = await Match.countDocuments({ createdAt: { $gte: since } });
    const newMessages = await Message.countDocuments({ createdAt: { $gte: since } });

    res.status(200).json({
      period: `${days} days`,
      activity: {
        userSignups,
        newListings,
        newRequirements,
        newMatches,
        newMessages
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
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
  getActivityLogs
};