const Requirement = require('../models/Requirement');

// Create Requirement
const createRequirement = async (req, res) => {
  const { location, budget, propertyType, size, bedrooms, bathrooms } = req.body;

  // Validation
  if (!location?.city || !propertyType) {
    return res.status(400).json({ message: 'City and Property Type are required.' });
  }

  try {
    const requirement = await Requirement.create({
      requiredBy: req.user.id,
      location,
      budget,
      propertyType,
      size,
      bedrooms,
      bathrooms,
    });

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

module.exports = { createRequirement, getRequirements, updateRequirement, deleteRequirement };