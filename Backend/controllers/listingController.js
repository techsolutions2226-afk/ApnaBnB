const Listing = require('../models/Listing');
const Property = require('../models/Property');
const User = require('../models/User');
const { sendListingCreatedEmail } = require('../utils/mailer');

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

    // Fire-and-forget confirmation email to the seller/dealer. We deliberately
    // do NOT await this in a way that fails the request — the listing has
    // already been persisted, so the email is a courtesy on top.
    (async () => {
      try {
        const user = await User.findById(req.user.id).select('name email');
        if (!user?.email) return;
        const base = (process.env.FRONTEND_URL || 'http://localhost:5174').replace(/\/+$/, '');
        const listingUrl = `${base}/listing/${listing._id}`;
        await sendListingCreatedEmail(
          user.email,
          user.name,
          {
            title: property.title,
            propertyType: property.propertyType,
            city: property.location?.city,
            area: property.location?.area,
            price: property.price,
            bedrooms: property.bedrooms,
            bathrooms: property.bathrooms,
            size: property.size,
            sizeUnit: property.sizeUnit,
          },
          listingUrl,
        );
      } catch (mailErr) {
        console.error('Listing confirmation email failed:', mailErr.message);
      }
    })();

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
      { returnDocument: 'after' }
    ).populate('property owner');

    if (!listing) {
      return res.status(404).json({ message: 'Listing not found or unauthorized.' });
    }

    res.status(200).json(listing);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Listings for a specific user
const getUserListings = async (req, res) => {
  const { userId } = req.params;

  try {
    const listings = await Listing.find({ owner: userId })
      .populate('property', 'title description photos location price propertyType size sizeUnit bedrooms bathrooms amenities')
      .populate('owner', 'name email role');
    res.status(200).json(listings);
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

    // Cascade delete the associated property so it doesn't show up on the home page
    if (listing.property) {
      await Property.findByIdAndDelete(listing.property);
    }

    res.status(200).json({ message: 'Listing and property deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single listing by ID
const getListingById = async (req, res) => {
  const { id } = req.params;

  try {
    const listing = await Listing.findById(id)
      .populate('property', 'title description photos location price propertyType size sizeUnit bedrooms bathrooms amenities listedBy')
      .populate('owner', 'name email role');
    if (!listing) {
      return res.status(404).json({ message: 'Listing not found.' });
    }
    res.status(200).json(listing);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createListing, getListings, getUserListings, getListingById, updateListing, deleteListing };