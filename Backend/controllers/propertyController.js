const Property = require('../models/Property');

// Create a new property
const createProperty = async (req, res) => {
  const { title, description, location, price, propertyType, size, bedrooms, bathrooms, photos } = req.body;

  // Validation
  if (!title || !location || !price || !propertyType) {
    return res.status(400).json({ message: 'Please provide all required fields.' });
  }

  try {
    const property = await Property.create({
      title,
      description,
      photos,
      location,
      price,
      propertyType,
      size,
      bedrooms,
      bathrooms,
      listedBy: req.user.id, // User from token middleware
    });

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
    const properties = await Property.find(filter).populate('listedBy', 'name email role');
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
      { new: true }
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
    res.status(200).json({ message: 'Property deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createProperty, getProperties, updateProperty, deleteProperty };