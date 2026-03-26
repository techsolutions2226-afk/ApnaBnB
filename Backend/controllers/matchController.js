const Property = require('../models/Property');
const Requirement = require('../models/Requirement');

// Calculate matches for a property against requirements
const matchPropertyToRequirements = async (req, res) => {
  const { propertyId } = req.body;

  // Validate input
  if (!propertyId) {
    return res.status(400).json({ message: 'Property ID is required.' });
  }

  try {
    // Fetch property
    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ message: 'Property not found.' });
    }

    // Fetch requirements to match against
    const requirements = await Requirement.find({
      'location.city': property.location.city,
      propertyType: property.propertyType,
    });

    // Calculate match scores
    const matches = requirements.map((requirement) => {
      let score = 0;

      // Budget match
      if (
        property.price >= (requirement.budget?.min || 0) &&
        property.price <= (requirement.budget?.max || Infinity)
      ) {
        score += 40;
      }

      // Area match
      if (property.location.area === requirement.location?.area) {
        score += 20;
      }

      // Bedrooms/bathrooms/size match
      if (
        (!requirement.bedrooms || property.bedrooms === requirement.bedrooms) &&
        (!requirement.bathrooms || property.bathrooms === requirement.bathrooms)
      ) {
        score += 20;
      }

      // Add weighted score result
      return { requirement, score };
    });

    // Sort matches by score
    matches.sort((a, b) => b.score - a.score);

    res.status(200).json(matches);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Calculate matches for a requirement against properties
const matchRequirementsToProperties = async (req, res) => {
  const { requirementId } = req.body;

  // Validate input
  if (!requirementId) {
    return res.status(400).json({ message: 'Requirement ID is required.' });
  }

  try {
    // Fetch requirement
    const requirement = await Requirement.findById(requirementId);
    if (!requirement) {
      return res.status(404).json({ message: 'Requirement not found.' });
    }

    // Fetch properties to match against
    const properties = await Property.find({
      'location.city': requirement.location.city,
      propertyType: requirement.propertyType,
    });

    // Calculate match scores
    const matches = properties.map((property) => {
      let score = 0;

      // Budget match
      if (
        property.price >= (requirement.budget?.min || 0) &&
        property.price <= (requirement.budget?.max || Infinity)
      ) {
        score += 40;
      }

      // Area match
      if (property.location.area === requirement.location?.area) {
        score += 20;
      }

      // Bedrooms/bathrooms/size match
      if (
        (!requirement.bedrooms || property.bedrooms === requirement.bedrooms) &&
        (!requirement.bathrooms || property.bathrooms === requirement.bathrooms)
      ) {
        score += 20;
      }

      // Add weighted score result
      return { property, score };
    });

    // Sort matches by score
    matches.sort((a, b) => b.score - a.score);

    res.status(200).json(matches);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { matchPropertyToRequirements, matchRequirementsToProperties };