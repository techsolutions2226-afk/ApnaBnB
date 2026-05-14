const Requirement = require('../models/Requirement');
const Property = require('../models/Property');
const Match = require('../models/Match');
const User = require('../models/User');
const { calculateMatchScore } = require('../utils/matchScore');

// Auto-generate matches for a requirement
const generateMatchesForRequirement = async (requirement, userId) => {
  try {
    // Find matching properties
    const properties = await Property.find({
      'location.city': requirement.location.city,
      propertyType: { $in: [requirement.propertyType, requirement.propertyType.toLowerCase()] },
      status: 'active'
    });

    const matches = [];
    for (const property of properties) {
      const score = calculateMatchScore(property, requirement);
      
      if (score >= 30) { // Only create matches with decent scores
        // Determine match type based on property owner
        let matchType = 'seller-buyer';
        const propertyOwner = await User.findById(property.listedBy);
        
        if (propertyOwner?.role === 'dealer') {
          matchType = 'dealer-buyer';
        }

        // Check if match already exists
        const existingMatch = await Match.findOne({
          property: property._id,
          requirement: requirement._id
        });

        if (!existingMatch) {
          const match = await Match.create({
            property: property._id,
            requirement: requirement._id,
            initiator: userId,
            score,
            type: matchType,
            status: 'pending'
          });
          matches.push(match);
        }
      }
    }
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
    const requirement = await Requirement.create({
      requiredBy: req.user.id,
      title: title.trim(),
      location,
      budget,
      propertyType: propertyType.toLowerCase(), // Normalize to lowercase
      size: size || '',
      bedrooms: bedrooms || undefined,
      bathrooms: bathrooms || undefined,
      notes: notes || '',
      urgency: urgency || '',
      status: 'active'
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
  let filter = {};

  if (city) filter['location.city'] = city;
  if (propertyType) filter.propertyType = propertyType;
  if (budget) {
    const [min, max] = budget.split('-');
    filter['budget.min'] = { $gte: Number(min) };
    filter['budget.max'] = { $lte: Number(max) };
  }

  try {
    const requirements = await Requirement.find(filter).populate('requiredBy', 'name email role');
    res.status(200).json(requirements);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update Requirement
const updateRequirement = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const requirement = await Requirement.findOneAndUpdate(
      { _id: id, requiredBy: req.user.id }, // Ensure user owns the requirement
      updates,
      { new: true }
    );

    if (!requirement) {
      return res.status(404).json({ message: 'Requirement not found or unauthorized.' });
    }

    res.status(200).json(requirement);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Requirement by ID
const getRequirementById = async (req, res) => {
  const { id } = req.params;

  try {
    const requirement = await Requirement.findById(id).populate('requiredBy', 'name email role');
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
    const requirements = await Requirement.find({ requiredBy: userId }).populate('requiredBy', 'name email role');
    res.status(200).json(requirements);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete Requirement
const deleteRequirement = async (req, res) => {
  const { id } = req.params;

  try {
    const requirement = await Requirement.findOneAndDelete({ _id: id, requiredBy: req.user.id });
    if (!requirement) {
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
  let filter = {};

  // Text search across notes or description if available
  if (q) {
    filter.$or = [
      { 'location.city': { $regex: q, $options: 'i' } },
      { 'location.area': { $regex: q, $options: 'i' } }
    ];
  }

  // Location filters
  if (city) filter['location.city'] = city;
  if (area) filter['location.area'] = area;

  // Budget range
  if (minBudget || maxBudget) {
    filter.$and = filter.$and || [];
    if (minBudget) filter.$and.push({ 'budget.max': { $gte: Number(minBudget) } });
    if (maxBudget) filter.$and.push({ 'budget.min': { $lte: Number(maxBudget) } });
  }

  // Property details
  if (propertyType) filter.propertyType = propertyType;
  if (bedrooms) filter.bedrooms = { $gte: Number(bedrooms) };
  if (bathrooms) filter.bathrooms = { $gte: Number(bathrooms) };

  try {
    const requirements = await Requirement.find(filter).populate('requiredBy', 'name email role');
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
  generateMatchesForRequirement 
};