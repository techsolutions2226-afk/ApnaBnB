const prisma = require('../db/prisma');
const { sendListingCreatedEmail } = require('../utils/mailer');

const ownerSelect = { select: { id: true, name: true, email: true, role: true } };

// Create Listing
const createListing = async (req, res) => {
  const { propertyId } = req.body;

  if (!propertyId) {
    return res.status(400).json({ message: 'Property ID is required.' });
  }

  try {
    // Validate property existence
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) {
      return res.status(404).json({ message: 'Property not found.' });
    }

    // Ensure the user owns the property
    if (property.listedById !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized to create a listing for this property.' });
    }

    // Create the listing
    const listing = await prisma.listing.create({
      data: { propertyId, ownerId: req.user.id },
    });

    // Fire-and-forget confirmation email to the seller/dealer.
    (async () => {
      try {
        const user = await prisma.user.findUnique({
          where: { id: req.user.id },
          select: { name: true, email: true },
        });
        if (!user?.email) return;
        const base = (process.env.FRONTEND_URL || 'http://localhost:5174').replace(/\/+$/, '');
        const listingUrl = `${base}/listing/${listing.id}`;
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
  const where = {};

  if (status) where.status = status;
  if (featured === 'true') where.status = 'featured';

  try {
    const listings = await prisma.listing.findMany({
      where,
      include: { property: true, owner: ownerSelect },
    });
    res.status(200).json(listings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update Listing
const updateListing = async (req, res) => {
  const { id } = req.params;

  try {
    const b = req.body;
    const data = {};
    if ('status' in b) data.status = b.status;
    if ('views' in b) data.views = Number(b.views);
    if ('inquiries' in b) data.inquiries = Number(b.inquiries);

    const result = await prisma.listing.updateMany({
      where: { id, ownerId: req.user.id },
      data,
    });
    if (result.count === 0) {
      return res.status(404).json({ message: 'Listing not found or unauthorized.' });
    }

    const listing = await prisma.listing.findUnique({
      where: { id },
      include: { property: true, owner: ownerSelect },
    });
    res.status(200).json(listing);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Listings for a specific user
const getUserListings = async (req, res) => {
  const { userId } = req.params;

  try {
    const listings = await prisma.listing.findMany({
      where: { ownerId: userId },
      include: { property: true, owner: ownerSelect },
    });
    res.status(200).json(listings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete Listing — also removes the underlying property (cascades matches etc.)
const deleteListing = async (req, res) => {
  const { id } = req.params;

  try {
    const listing = await prisma.listing.findFirst({
      where: { id, ownerId: req.user.id },
    });
    if (!listing) {
      return res.status(404).json({ message: 'Listing not found or unauthorized.' });
    }

    await prisma.listing.delete({ where: { id: listing.id } });
    // Cascade delete the associated property so it doesn't show up on the home page.
    if (listing.propertyId) {
      await prisma.property.deleteMany({ where: { id: listing.propertyId } });
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
    const listing = await prisma.listing.findUnique({
      where: { id },
      include: {
        property: {
          include: {
            listedBy: { select: { id: true, name: true, email: true, role: true, avatar: true } },
          },
        },
        owner: ownerSelect,
      },
    });
    if (!listing) {
      return res.status(404).json({ message: 'Listing not found.' });
    }
    res.status(200).json(listing);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createListing, getListings, getUserListings, getListingById, updateListing, deleteListing };
