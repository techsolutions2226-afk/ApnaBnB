const mongoose = require('mongoose');

const PropertySchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    photos: [{ type: String }],
    location: {
      city: { type: String, required: true },
      area: { type: String, required: true },
      coordinates: {
        lat: { type: Number },
        lng: { type: Number },
      },
    },
    // For-sale vs for-rent. When 'rent', `price` is interpreted as monthly rent.
    purpose: {
      type: String,
      enum: ['sale', 'rent'],
      default: 'sale',
      required: true,
    },
    price: { type: Number, required: true },
    // Top-level grouping shown in the listing form and search filter.
    // 'home' covers houses / flats / portions / rooms / farm houses / penthouses.
    // 'plot' covers residential / commercial / agricultural / industrial land.
    // 'commercial' covers offices / shops / warehouses / factories / buildings.
    category: {
      type: String,
      enum: ['home', 'plot', 'commercial'],
      default: 'home',
      required: true,
    },
    // Leaf-level type. Enum kept permissive (string-only) so future subtypes
    // don't require a migration; the form constrains the inputs.
    propertyType: {
      type: String,
      enum: [
        // Legacy values (kept for backward-compatibility with existing data)
        'house', 'apartment', 'plot',
        // Home subtypes
        'flat', 'upper-portion', 'lower-portion', 'farm-house', 'room', 'penthouse',
        // Plot subtypes
        'residential-plot', 'commercial-plot', 'agricultural-land', 'industrial-land',
        // Commercial subtypes
        'office', 'shop', 'warehouse', 'factory', 'building',
      ],
      required: true,
    },
    size: { type: Number },
    sizeUnit: { type: String, enum: ['Marla', 'Kanal', 'sq ft'], default: 'Marla' },
    bedrooms: { type: Number },
    bathrooms: { type: Number },
    amenities: { type: [String], default: [] },

    // Rental-specific fields (only enforced by controllers when purpose === 'rent').
    securityDeposit: { type: Number, default: 0 },
    leaseTerm: { type: Number, default: 12 }, // months
    furnished: {
      type: String,
      enum: ['unfurnished', 'semi-furnished', 'furnished'],
      default: 'unfurnished',
    },
    availableFrom: { type: Date },

    // Per-listing override contact details (defaults to the lister's user profile
    // values on the frontend if these are blank).
    contactName: { type: String, default: '' },
    contactEmail: { type: String, default: '' },
    contactPhone: { type: String, default: '' },

    status: {
      type: String,
      enum: ['active', 'pending', 'sold', 'rented', 'featured'],
      // New listings are usable immediately so they show up in search and the
      // match engine. Admin can flip back to 'pending' for moderation.
      default: 'active'
    },
    listedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

const Property = mongoose.model('Property', PropertySchema);
module.exports = Property;