/* eslint-disable no-console */
/**
 * One-time backfill: populate `amenities` for properties that don't have any.
 *
 * Existing properties were created before the listing flow started sending
 * amenities to the API, so they have `amenities: []` (or missing entirely).
 * This script assigns a sensible default set based on `propertyType` so the
 * detail page's "What this place offers" section renders something useful
 * without manual editing.
 *
 * Run:
 *   node scripts/backfillAmenities.js
 *
 * Add --force to overwrite even properties that already have amenities.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Property = require('../models/Property');

const FORCE = process.argv.includes('--force');

const DEFAULTS_BY_TYPE = {
  house: ['Parking', 'Security', 'Garden', 'Backup power', 'Servant quarter'],
  apartment: ['Parking', 'Security', 'Elevator', 'Backup power'],
  plot: ['Corner plot', 'Security'],
};

const FALLBACK = ['Parking', 'Security'];

async function main() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI not set in .env');
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const filter = FORCE
    ? {}
    : {
        $or: [
          { amenities: { $exists: false } },
          { amenities: { $size: 0 } },
        ],
      };

  const properties = await Property.find(filter);
  console.log(`Found ${properties.length} properties to update${FORCE ? ' (force mode)' : ''}.`);

  let updated = 0;
  for (const p of properties) {
    const type = (p.propertyType || '').toLowerCase();
    const amenities = DEFAULTS_BY_TYPE[type] || FALLBACK;
    p.amenities = amenities;
    await p.save();
    updated += 1;
    console.log(`  · ${p._id}  [${type || 'unknown'}]  →  ${amenities.join(', ')}`);
  }

  console.log(`\nDone. ${updated} propert${updated === 1 ? 'y' : 'ies'} updated.`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('Backfill failed:', err.message);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
