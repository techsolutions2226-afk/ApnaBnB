const Listing = require('../models/Listing');
const Property = require('../models/Property');

// Create Listing
const createListing = async (req, res) => {
  const { propertyId } = req.body;

  if (!propertyId) {
    return res.status(400).json({ message: 'Property ID is required.' });
  }

  try {
    // Validate property existence
    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ message: 'Property not found.' });
    }

    // Ensure the user owns the property
    if (property.listedBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized to create a listing for this property.' });
    }

    // Create the listing
    const listing = await Listing.create({
      property: propertyId,
      owner: req.user.id,
    });

    res.status(201).json(listing);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get All Listings (with filters)
const getListings = async (req, res) => {
  const { status, featured } = req.query;
  let filter = {};

  if (status) filter.status = status;
  if (featured === 'true') filter.status = 'featured';

  try {
    const listings = await Listing.find(filter).populate('property owner', 'title price name email');
    res.status(200).json(listings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update Listing
const updateListing = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    // Ensure the listing exists and the user owns it
    const listing = await Listing.findOneAndUpdate(
      { _id: id, owner: req.user.id },
      updates,
      { new: true }
    ).populate('property owner');

    if (!listing) {
      return res.status(404).json({ message: 'Listing not found or unauthorized.' });
    }

    res.status(200).json(listing);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete Listing
const deleteListing = async (req, res) => {
  const { id } = req.params;

  try {
    const listing = await Listing.findOneAndDelete({ _id: id, owner: req.user.id });
    if (!listing) {
      return res.status(404).json({ message: 'Listing not found or unauthorized.' });
    }

    res.status(200).json({ message: 'Listing deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createListing, getListings, updateListing, deleteListing };