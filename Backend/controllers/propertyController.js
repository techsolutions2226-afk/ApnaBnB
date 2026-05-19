const Property = require('../models/Property');
const Requirement = require('../models/Requirement');
const Match = require('../models/Match');
const User = require('../models/User');
const { geocodeAddress } = require('../utils/geocode');
const {
  calculateMatchScore,
  determineMatchType,
  isMatchCandidate,
} = require('../utils/matchScore');

// Auto-generate matches for a newly-created property.
// Pre-filters requirements by city + area + propertyType + price ±10%,
// then derives match type from the two owners' roles.
const generateMatchesForProperty = async (property, userId) => {
  try {
    const propertyOwner = await User.findById(property.listedBy).select('role');
    if (!propertyOwner) return [];

    // City + type filter at the DB layer — keeps payload small.
    // Finer-grained area/price checks happen in JS via isMatchCandidate
    // (Mongo can't express "area substring" cleanly).
    const requirements = await Requirement.find({
      'location.city': property.location.city,
      propertyType: { $in: [property.propertyType, property.propertyType.toLowerCase()] },
      // Only active requirements should produce matches — fulfilled/closed are done.
      status: 'active',
    }).populate('requiredBy', 'role');

    const matches = [];
    for (const requirement of requirements) {
      if (!isMatchCandidate(property, requirement)) continue;

      const requirementOwner = requirement.requiredBy;
      const matchType = determineMatchType(propertyOwner.role, requirementOwner?.role);
      if (!matchType) continue;

      const existingMatch = await Match.findOne({
        property: property._id,
        requirement: requirement._id,
      });
      if (existingMatch) continue;

      const score = calculateMatchScore(property, requirement);
      const match = await Match.create({
        property: property._id,
        requirement: requirement._id,
        initiator: userId,
        score,
        type: matchType,
        status: 'pending',
      });
      matches.push(match);
    }
    return matches;
  } catch (error) {
    console.error('Error generating matches:', error);
    return [];
  }
};

// Create a new property
const createProperty = async (req, res) => {
  const { title, description, location, price, propertyType, size, sizeUnit, bedrooms, bathrooms, photos, amenities } = req.body;

  // Validation
  if (!title || !location || !price || !propertyType) {
    return res.status(400).json({ message: 'Please provide all required fields.' });
  }

  try {
    // If the client didn't drop a pin, fall back to forward-geocoding the
    // human-readable address so map views always have a coordinate to render.
    let resolvedLocation = location;
    const hasCoords =
      location?.coordinates &&
      typeof location.coordinates.lat === 'number' &&
      typeof location.coordinates.lng === 'number';
    if (!hasCoords) {
      const addressParts = [location?.area, location?.city, 'Pakistan'].filter(Boolean);
      const coords = await geocodeAddress(addressParts.join(', '));
      if (coords) {
        resolvedLocation = { ...location, coordinates: coords };
      }
    }

    const property = await Property.create({
      title,
      description,
      photos,
      location: resolvedLocation,
      price,
      propertyType,
      size,
      sizeUnit: sizeUnit || 'Marla',
      bedrooms,
      bathrooms,
      amenities: Array.isArray(amenities) ? amenities : [],
      listedBy: req.user.id,
    });

    // Generate automatic matches
    await generateMatchesForProperty(property, req.user.id);

    res.status(201).json(property);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all properties (with filters)
const getProperties = async (req, res) => {
  const { city, price, propertyType } = req.query;
  let filter = {};

  if (city) filter['location.city'] = city;
  if (price) {
    const [min, max] = price.split('-');
    filter.price = { $gte: Number(min), $lte: Number(max) };
  }
  if (propertyType) filter.propertyType = propertyType;

  try {
    const properties = await Property.find(filter).populate('listedBy', 'name email role avatar');
    res.status(200).json(properties);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update a property
const updateProperty = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const property = await Property.findOneAndUpdate(
      { _id: id, listedBy: req.user.id }, // Ensure user owns the property
      updates,
      { returnDocument: 'after' }
    );
    if (!property) {
      return res.status(404).json({ message: 'Property not found or unauthorized.' });
    }
    res.status(200).json(property);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a property
const deleteProperty = async (req, res) => {
  const { id } = req.params;

  try {
    const property = await Property.findOneAndDelete({ _id: id, listedBy: req.user.id });
    if (!property) {
      return res.status(404).json({ message: 'Property not found or unauthorized.' });
    }
    
    // Cascade delete the associated listing
    const Listing = require('../models/Listing');
    await Listing.findOneAndDelete({ property: id });

    res.status(200).json({ message: 'Property and listing deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single property by ID
const getPropertyById = async (req, res) => {
  const { id } = req.params;

  try {
    const property = await Property.findById(id).populate('listedBy', 'name email role avatar');
    if (!property) {
      return res.status(404).json({ message: 'Property not found.' });
    }
    res.status(200).json(property);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Search properties with text search
const searchProperties = async (req, res) => {
  const { q, city, area, minPrice, maxPrice, propertyType, bedrooms, bathrooms } = req.query;
  let filter = {};

  // Text search across title and description
  if (q) {
    filter.$or = [
      { title: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } }
    ];
  }

  // Location filters
  if (city) filter['location.city'] = city;
  if (area) filter['location.area'] = area;

  // Price range
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  // Property details
  if (propertyType) filter.propertyType = propertyType;
  if (bedrooms) filter.bedrooms = { $gte: Number(bedrooms) };
  if (bathrooms) filter.bathrooms = { $gte: Number(bathrooms) };

  try {
    const properties = await Property.find(filter).populate('listedBy', 'name email role avatar');
    res.status(200).json(properties);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { 
  createProperty, 
  getProperties, 
  getPropertyById, 
  searchProperties, 
  updateProperty, 
  deleteProperty,
  generateMatchesForProperty 
};