const Property = require('../models/Property');
const Requirement = require('../models/Requirement');
const Match = require('../models/Match');
const User = require('../models/User');
const { calculateMatchScore } = require('../utils/matchScore');

// Calculate matches for a property against requirements
const matchPropertyToRequirements = async (req, res) => {
  const { propertyId } = req.body;

  if (!propertyId) {
    return res.status(400).json({ message: 'Property ID is required.' });
  }

  try {
    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ message: 'Property not found.' });
    }

    const requirements = await Requirement.find({
      'location.city': property.location.city,
      propertyType: property.propertyType,
    }).populate('requiredBy', 'name email role');

    const matches = requirements.map((requirement) => {
      const score = calculateMatchScore(property, requirement);
      return { requirement, score };
    });

    matches.sort((a, b) => b.score - a.score);

    res.status(200).json(matches);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Calculate matches for a requirement against properties
const matchRequirementsToProperties = async (req, res) => {
  const { requirementId } = req.body;

  if (!requirementId) {
    return res.status(400).json({ message: 'Requirement ID is required.' });
  }

  try {
    const requirement = await Requirement.findById(requirementId);
    if (!requirement) {
      return res.status(404).json({ message: 'Requirement not found.' });
    }

    const properties = await Property.find({
      'location.city': requirement.location.city,
      propertyType: requirement.propertyType,
    }).populate('listedBy', 'name email role');

    const matches = properties.map((property) => {
      const score = calculateMatchScore(property, requirement);
      return { property, score };
    });

    matches.sort((a, b) => b.score - a.score);

    res.status(200).json(matches);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create a new match
const createMatch = async (req, res) => {
  const { propertyId, requirementId, type, notes } = req.body;

  if (!propertyId || !requirementId || !type) {
    return res.status(400).json({ 
      message: 'Property ID, Requirement ID, and match type are required.' 
    });
  }

  try {
    // Check if match already exists
    const existingMatch = await Match.findOne({ 
      property: propertyId, 
      requirement: requirementId 
    });

    if (existingMatch) {
      return res.status(409).json({ message: 'Match already exists.' });
    }

    const property = await Property.findById(propertyId);
    const requirement = await Requirement.findById(requirementId);

    if (!property || !requirement) {
      return res.status(404).json({ message: 'Property or requirement not found.' });
    }

    const score = calculateMatchScore(property, requirement);

    const match = await Match.create({
      property: propertyId,
      requirement: requirementId,
      initiator: req.user.id,
      score,
      type,
      notes: notes || ''
    });

    await match.populate('property requirement initiator');

    res.status(201).json(match);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all matches for current user
const getMatches = async (req, res) => {
  try {
    const matches = await Match.find({
      $or: [
        { initiator: req.user.id },
        { 'property.listedBy': req.user.id }
      ]
    })
    .populate('property', 'title price location photos')
    .populate('requirement', 'location budget propertyType')
    .populate('initiator', 'name email role')
    .sort({ createdAt: -1 });

    res.status(200).json(matches);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single match by ID
const getMatchById = async (req, res) => {
  const { id } = req.params;

  try {
    const match = await Match.findById(id)
      .populate('property')
      .populate('requirement')
      .populate('initiator', 'name email role');

    if (!match) {
      return res.status(404).json({ message: 'Match not found.' });
    }

    res.status(200).json(match);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Helper — returns the Property._ids listed by the user and the
// Requirement._ids posted by the user, so we can scope match queries
// to "matches that involve me on either side".
const userInvolvedFilter = async (userId) => {
  const Property = require('../models/Property');
  const Requirement = require('../models/Requirement');
  const [props, reqs] = await Promise.all([
    Property.find({ listedBy: userId }).select('_id'),
    Requirement.find({ requiredBy: userId }).select('_id'),
  ]);
  return {
    $or: [
      { property: { $in: props.map((p) => p._id) } },
      { requirement: { $in: reqs.map((r) => r._id) } },
    ],
  };
};

// Get seller-buyer matches involving the current user (their listed property
// OR their posted requirement).
const getSellerBuyerMatches = async (req, res) => {
  try {
    const userFilter = await userInvolvedFilter(req.user.id);
    const matches = await Match.find({ type: 'seller-buyer', ...userFilter })
      .populate('property', 'title price location photos listedBy')
      .populate('requirement', 'title location budget propertyType requiredBy')
      .populate('initiator', 'name email role')
      .sort({ score: -1 });

    res.status(200).json(matches);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get dealer-buyer matches involving the current user.
const getDealerBuyerMatches = async (req, res) => {
  try {
    const userFilter = await userInvolvedFilter(req.user.id);
    const matches = await Match.find({ type: 'dealer-buyer', ...userFilter })
      .populate('property', 'title price location photos listedBy')
      .populate('requirement', 'title location budget propertyType requiredBy')
      .populate('initiator', 'name email role')
      .sort({ score: -1 });

    res.status(200).json(matches);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get dealer-dealer matches involving the current user.
const getDealerDealerMatches = async (req, res) => {
  try {
    const userFilter = await userInvolvedFilter(req.user.id);
    const matches = await Match.find({ type: 'dealer-dealer', ...userFilter })
      .populate('property', 'title price location photos listedBy')
      .populate('requirement', 'title location budget propertyType requiredBy')
      .populate('initiator', 'name email role')
      .sort({ score: -1 });

    res.status(200).json(matches);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get every match involving the current user, regardless of type.
// Used by dashboards (seller/buyer/dealer) to surface a "Recent Matches"
// section. Returns matches sorted by most-recently-created first.
const getMyMatches = async (req, res) => {
  try {
    const userFilter = await userInvolvedFilter(req.user.id);
    const matches = await Match.find(userFilter)
      .populate('property', 'title price location photos listedBy propertyType')
      .populate('requirement', 'title location budget propertyType requiredBy')
      .populate('initiator', 'name email role')
      .sort({ createdAt: -1 });

    res.status(200).json(matches);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update match status
const updateMatchStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['pending', 'accepted', 'rejected', 'closed'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status value.' });
  }

  try {
    const match = await Match.findByIdAndUpdate(
      id,
      { status },
      { returnDocument: 'after' }
    ).populate('property requirement initiator');

    if (!match) {
      return res.status(404).json({ message: 'Match not found.' });
    }

    res.status(200).json(match);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete match
const deleteMatch = async (req, res) => {
  const { id } = req.params;

  try {
    const match = await Match.findOneAndDelete({ 
      _id: id, 
      initiator: req.user.id 
    });

    if (!match) {
      return res.status(404).json({ message: 'Match not found or unauthorized.' });
    }

    res.status(200).json({ message: 'Match deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  matchPropertyToRequirements,
  matchRequirementsToProperties,
  createMatch,
  getMatches,
  getMatchById,
  getMyMatches,
  getSellerBuyerMatches,
  getDealerBuyerMatches,
  getDealerDealerMatches,
  updateMatchStatus,
  deleteMatch,
};