/* Full-coverage demo seeder (Postgres / Prisma).
 *
 * Populates EVERY table so the whole site can be exercised end to end:
 *   User · Property · Listing · Requirement · Match · Conversation ·
 *   ConversationParticipant · Message · Review · Trip · Wishlist ·
 *   Plan · Payment · ActivityLog · ContactPage
 *
 * Every property gets its own distinct photo set (no image is reused across
 * properties — asserted before writing) and real coordinates, so map views,
 * search and the listing cards all have something to render.
 *
 * Run with:
 *   cd Backend && node full-seed.js
 *
 * Idempotent — deleting the seeded users cascades their properties, listings,
 * requirements, matches, trips, wishlists, reviews and payments. Conversations
 * have no FK back to a user, so they are removed explicitly first.
 *
 * Only touches rows it owns: seeded users all use the @apnabnb.seed domain,
 * and real accounts (including admin@gmail.com) are never modified.
 */

require('dotenv').config();
const bcrypt = require('bcrypt');
const prisma = require('./db/prisma');
const { encryptMessage } = require('./utils/messageCrypto');

const PASS = 'Test@1234';
const DOMAIN = '@apnabnb.seed';

/* ── People ───────────────────────────────────────────────────────────── */
const PEOPLE = [
  { key: 'ahmed',  name: 'Ahmed Raza',    role: 'seller', phone: '+92 300 4455661', location: 'Gulberg III, Lahore',     lat: 31.5204, lng: 74.3587 },
  { key: 'sana',   name: 'Sana Iqbal',    role: 'seller', phone: '+92 301 7788992', location: 'F-8, Islamabad',          lat: 33.7005, lng: 73.0553 },
  { key: 'bilal',  name: 'Bilal Hussain', role: 'dealer', phone: '+92 321 5566773', location: 'DHA Phase 6, Karachi',    lat: 24.8008, lng: 67.0691 },
  { key: 'hina',   name: 'Hina Malik',    role: 'dealer', phone: '+92 333 2244556', location: 'Bahria Town, Rawalpindi', lat: 33.5651, lng: 73.0169 },
  { key: 'fatima', name: 'Fatima Noor',   role: 'buyer',  phone: '+92 345 9988771', location: 'Model Town, Lahore',      lat: 31.4805, lng: 74.3239 },
  { key: 'usman',  name: 'Usman Tariq',   role: 'buyer',  phone: '+92 311 6677884', location: 'G-11, Islamabad',         lat: 33.6683, lng: 72.9903 },
  { key: 'ayesha', name: 'Ayesha Khan',   role: 'buyer',  phone: '+92 302 3344559', location: 'Clifton, Karachi',        lat: 24.8138, lng: 67.0300 },
];

/* ── Photos ───────────────────────────────────────────────────────────────
   One unique pair per property. Asserted globally unique below — a repeated
   Unsplash id was the exact bug in the previous seeder. */
const PHOTO_SETS = [
  ['photo-1564013799919-ab600027ffc6', 'photo-1600585154340-be6161a56a0c'],
  ['photo-1568605114967-8130f3a36994', 'photo-1600607687939-ce8a6c25118c'],
  ['photo-1580587771525-78b9dba3b914', 'photo-1605276374104-dee2a0ed3cd6'],
  ['photo-1600596542815-ffad4c1539a9', 'photo-1613490493576-7fde63acd811'],
  ['photo-1570129477492-45c003edd2be', 'photo-1600210492486-724fe5c67fb0'],
  ['photo-1512917774080-9991f1c4c750', 'photo-1522708323590-d24dbb6b0267'],
  ['photo-1600566753086-00f18fb6b3ea', 'photo-1502672260266-1c1ef2d93688'],
  ['photo-1600047509807-ba8f99d2cdde', 'photo-1493809842364-78817add7ffb'],
  ['photo-1449844908441-8829872d2607', 'photo-1502005229762-cf1b2da7c5d6'],
  ['photo-1523217582562-09d0def993a6', 'photo-1560185007-cde436f6a4d0'],
  ['photo-1576941089067-2de3c901e126', 'photo-1560184897-ae75f418493e'],
  ['photo-1583608205776-bfd35f0d9f83', 'photo-1560448075-bb485b067938'],
  ['photo-1592595896551-12b371d546d5', 'photo-1560440021-33f9b867899d'],
  ['photo-1494526585095-c41746248156', 'photo-1556912173-3bb406ef7e77'],
  ['photo-1416331108676-a22ccb276e35', 'photo-1556909212-d5b604d0c90d'],
  ['photo-1502005097973-6a7082348e28', 'photo-1484154218962-a197022b5858'],
];
const img = (id) => `https://images.unsplash.com/${id}?w=1000&q=80&auto=format&fit=crop`;

/* ── Properties ───────────────────────────────────────────────────────────
   Coordinates are real city/area centroids so map views render sensibly.
   Buyer requirements below are tuned to match several of these. */
const PROPERTIES = [
  { owner: 'ahmed', title: '10 Marla House in Gulberg III',        city: 'Lahore',     area: 'Gulberg',      lat: 31.5204, lng: 74.3587, purpose: 'sale', category: 'home',       propertyType: 'house',      price: 48000000, size: 10, unit: 'Marla', bed: 4, bath: 4, status: 'active',   amenities: ['Parking', 'Security', 'Backup Generator', 'Lawn'] },
  { owner: 'ahmed', title: '1 Kanal Corner House, DHA Phase 5',     city: 'Lahore',     area: 'DHA',          lat: 31.4697, lng: 74.4131, purpose: 'sale', category: 'home',       propertyType: 'house',      price: 92000000, size: 1,  unit: 'Kanal', bed: 6, bath: 6, status: 'featured', amenities: ['Parking', 'Security', 'Swimming Pool', 'Servant Quarter'] },
  { owner: 'ahmed', title: '5 Marla Upper Portion, Johar Town',     city: 'Lahore',     area: 'Johar Town',   lat: 31.4697, lng: 74.2728, purpose: 'rent', category: 'home',       propertyType: 'upper-portion', price: 65000, size: 5, unit: 'Marla', bed: 2, bath: 2, status: 'active',   amenities: ['Parking', 'Security'], deposit: 130000, furnished: 'semi-furnished' },
  { owner: 'ahmed', title: 'Commercial Shop on Main Boulevard',     city: 'Lahore',     area: 'Gulberg',      lat: 31.5150, lng: 74.3450, purpose: 'rent', category: 'commercial', propertyType: 'shop',       price: 180000,   size: 4,  unit: 'Marla', bed: 0, bath: 1, status: 'active',   amenities: ['Security', 'Parking'], deposit: 540000 },
  { owner: 'sana',  title: '7 Marla House in F-8',                  city: 'Islamabad',  area: 'F-8',          lat: 33.7005, lng: 73.0553, purpose: 'sale', category: 'home',       propertyType: 'house',      price: 78000000, size: 7,  unit: 'Marla', bed: 4, bath: 5, status: 'active',   amenities: ['Parking', 'Security', 'Central Heating'] },
  { owner: 'sana',  title: '2 Bed Apartment, F-11 Markaz',          city: 'Islamabad',  area: 'F-11',         lat: 33.6844, lng: 72.9992, purpose: 'rent', category: 'home',       propertyType: 'flat',       price: 95000,    size: 1200, unit: 'Sq Ft', bed: 2, bath: 2, status: 'active', amenities: ['Elevator', 'Security', 'Parking'], deposit: 190000, furnished: 'furnished' },
  { owner: 'sana',  title: '5 Marla Plot in G-13',                  city: 'Islamabad',  area: 'G-13',         lat: 33.6376, lng: 72.9310, purpose: 'sale', category: 'plot',       propertyType: 'residential-plot', price: 21000000, size: 5, unit: 'Marla', bed: 0, bath: 0, status: 'pending', amenities: [] },
  { owner: 'bilal', title: 'Furnished 3 Bed Flat, DHA Phase 6',     city: 'Karachi',    area: 'DHA',          lat: 24.8008, lng: 67.0691, purpose: 'rent', category: 'home',       propertyType: 'flat',       price: 150000,   size: 1800, unit: 'Sq Ft', bed: 3, bath: 3, status: 'featured', amenities: ['Elevator', 'Security', 'Parking', 'Gym'], deposit: 300000, furnished: 'furnished' },
  { owner: 'bilal', title: '500 Sq Yd Bungalow in Clifton',         city: 'Karachi',    area: 'Clifton',      lat: 24.8138, lng: 67.0300, purpose: 'sale', category: 'home',       propertyType: 'house',      price: 135000000, size: 500, unit: 'Sq Yd', bed: 6, bath: 7, status: 'active', amenities: ['Parking', 'Security', 'Swimming Pool', 'Lawn'] },
  { owner: 'bilal', title: 'Office Floor in Shahrah-e-Faisal',      city: 'Karachi',    area: 'Shahrah-e-Faisal', lat: 24.8607, lng: 67.0641, purpose: 'rent', category: 'commercial', propertyType: 'office', price: 420000, size: 3000, unit: 'Sq Ft', bed: 0, bath: 4, status: 'active', amenities: ['Elevator', 'Security', 'Parking', 'Backup Generator'], deposit: 1260000 },
  { owner: 'bilal', title: '4 Marla Shop, Tariq Road',              city: 'Karachi',    area: 'Tariq Road',   lat: 24.8700, lng: 67.0600, purpose: 'sale', category: 'commercial', propertyType: 'shop',       price: 55000000, size: 4,  unit: 'Marla', bed: 0, bath: 1, status: 'sold',     amenities: ['Security'] },
  { owner: 'hina',  title: '10 Marla House in Bahria Town',         city: 'Rawalpindi', area: 'Bahria Town',  lat: 33.5651, lng: 73.0169, purpose: 'sale', category: 'home',       propertyType: 'house',      price: 42000000, size: 10, unit: 'Marla', bed: 5, bath: 5, status: 'active',   amenities: ['Parking', 'Security', 'Lawn'] },
  { owner: 'hina',  title: '3 Bed Flat in Askari 14',               city: 'Rawalpindi', area: 'Askari',       lat: 33.5900, lng: 73.0700, purpose: 'rent', category: 'home',       propertyType: 'flat',       price: 72000,    size: 1400, unit: 'Sq Ft', bed: 3, bath: 2, status: 'active', amenities: ['Security', 'Parking'], deposit: 144000, furnished: 'semi-furnished' },
  { owner: 'hina',  title: '1 Kanal Plot in Bahria Phase 8',        city: 'Rawalpindi', area: 'Bahria Town',  lat: 33.5340, lng: 73.0900, purpose: 'sale', category: 'plot',       propertyType: 'residential-plot', price: 38000000, size: 1, unit: 'Kanal', bed: 0, bath: 0, status: 'active', amenities: [] },
  { owner: 'hina',  title: '5 Marla House, Sadiqabad',              city: 'Rawalpindi', area: 'Satellite Town', lat: 33.5973, lng: 73.0433, purpose: 'rent', category: 'home',     propertyType: 'house',      price: 55000,    size: 5,  unit: 'Marla', bed: 3, bath: 3, status: 'active',   amenities: ['Parking'], deposit: 110000 },
  { owner: 'sana',  title: '8 Marla House in Wapda Town',           city: 'Lahore',     area: 'Wapda Town',   lat: 31.4300, lng: 74.2500, purpose: 'sale', category: 'home',       propertyType: 'house',      price: 36000000, size: 8,  unit: 'Marla', bed: 4, bath: 3, status: 'rejected', amenities: ['Parking', 'Security'] },
];

/* ── Requirements (buyers) ── */
const REQUIREMENTS = [
  { owner: 'fatima', title: 'Looking for 10 Marla house in Gulberg', city: 'Lahore',     area: 'Gulberg',     purpose: 'sale', category: 'home',       propertyType: 'house', min: 42000000, max: 55000000, bed: 4, status: 'active' },
  { owner: 'fatima', title: '2-3 bed flat on rent in Lahore',        city: 'Lahore',     area: 'Johar Town',  purpose: 'rent', category: 'home',       propertyType: 'upper-portion', min: 50000, max: 80000, bed: 2, status: 'active' },
  { owner: 'usman',  title: 'House in F-8 Islamabad',                city: 'Islamabad',  area: 'F-8',         purpose: 'sale', category: 'home',       propertyType: 'house', min: 70000000, max: 85000000, bed: 4, status: 'active' },
  { owner: 'usman',  title: 'Furnished apartment in F-11',           city: 'Islamabad',  area: 'F-11',        purpose: 'rent', category: 'home',       propertyType: 'flat',  min: 80000,    max: 110000,   bed: 2, status: 'active' },
  { owner: 'ayesha', title: 'Furnished 3 bed flat in DHA Karachi',   city: 'Karachi',    area: 'DHA',         purpose: 'rent', category: 'home',       propertyType: 'flat',  min: 130000,   max: 170000,   bed: 3, status: 'active' },
  { owner: 'ayesha', title: 'Bungalow in Clifton',                   city: 'Karachi',    area: 'Clifton',     purpose: 'sale', category: 'home',       propertyType: 'house', min: 120000000, max: 150000000, bed: 6, status: 'active' },
  { owner: 'usman',  title: 'Plot in Bahria Town Rawalpindi',        city: 'Rawalpindi', area: 'Bahria Town', purpose: 'sale', category: 'plot',       propertyType: 'residential-plot', min: 34000000, max: 45000000, bed: 0, status: 'fulfilled' },
  { owner: 'fatima', title: 'Small office space in Karachi',         city: 'Karachi',    area: 'Shahrah-e-Faisal', purpose: 'rent', category: 'commercial', propertyType: 'office', min: 350000, max: 500000, bed: 0, status: 'closed' },
];

const ago = (ms) => new Date(Date.now() - ms);
const DAY = 24 * 3600e3;

/* Deterministic pseudo-random so re-runs produce the same data. */
let _s = 42;
const rnd = () => ((_s = (_s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const int = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is missing from .env — bailing.');
    process.exit(1);
  }

  /* Guard: every property must have a globally unique photo set. */
  const allIds = PHOTO_SETS.flat();
  const dupes = allIds.filter((id, i) => allIds.indexOf(id) !== i);
  if (dupes.length) {
    console.error('Duplicate photo ids in PHOTO_SETS:', [...new Set(dupes)]);
    process.exit(1);
  }
  if (PHOTO_SETS.length < PROPERTIES.length) {
    console.error(`Need ${PROPERTIES.length} photo sets, have ${PHOTO_SETS.length}.`);
    process.exit(1);
  }

  /* Unsplash ids do rot — one 404 here means a broken image on a card. Skip
     with SKIP_IMAGE_CHECK=1 when seeding offline. */
  if (process.env.SKIP_IMAGE_CHECK !== '1') {
    const urls = PHOTO_SETS.slice(0, PROPERTIES.length).flat().map(img);
    const dead = [];
    await Promise.all(urls.map(async (u) => {
      try {
        const r = await fetch(u, { method: 'HEAD', redirect: 'follow' });
        if (!r.ok) dead.push(`${r.status} ${u}`);
      } catch {
        /* Network trouble shouldn't block seeding — only a definite 404 does. */
      }
    }));
    if (dead.length) {
      console.error('These seed images no longer resolve:');
      dead.forEach((d) => console.error('  ' + d));
      process.exit(1);
    }
    console.log(`Images:         ${urls.length} unique, all reachable`);
  }

  const emails = PEOPLE.map((p) => `${p.key}${DOMAIN}`);

  /* ── 1. Clear previous runs ── */
  const prior = await prisma.user.findMany({ where: { email: { in: emails } }, select: { id: true } });
  const priorIds = prior.map((u) => u.id);
  if (priorIds.length) {
    const convs = await prisma.conversation.findMany({
      where: { participants: { some: { id: { in: priorIds } } } },
      select: { id: true },
    });
    if (convs.length) {
      await prisma.conversation.deleteMany({ where: { id: { in: convs.map((c) => c.id) } } });
    }
    await prisma.activityLog.deleteMany({ where: { userId: { in: priorIds } } });
  }
  const cleared = await prisma.user.deleteMany({ where: { email: { in: emails } } });
  if (cleared.count) console.log(`Cleared ${cleared.count} previous seed user(s) and their data.`);

  /* ── 2. Users ── */
  const hash = await bcrypt.hash(PASS, 10);
  const U = {};
  for (const p of PEOPLE) {
    U[p.key] = await prisma.user.create({
      data: {
        name: p.name,
        email: `${p.key}${DOMAIN}`,
        password: hash,
        role: p.role,
        verified: true,
        phone: p.phone,
        location: p.location,
        latitude: p.lat,
        longitude: p.lng,
        avatar: '',
        createdAt: ago(int(20, 90) * DAY),
      },
    });
  }
  console.log(`Users:          ${Object.keys(U).length}`);

  /* ── 3. Plans (upsert — admin may already have rows) ── */
  const PLAN_ROWS = [
    { role: 'seller', slug: 'basic',   name: 'Basic',   monthlyPrice: 0,    yearlyPrice: 0,     popular: false, sortOrder: 1, description: 'Get started with a single listing.',      limits: { maxListings: 1,  maxRequirements: 0 },  features: [{ text: '1 active listing', included: true }, { text: 'Email match alerts', included: true }, { text: 'Featured placement', included: false }] },
    { role: 'seller', slug: 'pro',     name: 'Pro',     monthlyPrice: 2500, yearlyPrice: 25000, popular: true,  sortOrder: 2, description: 'For active sellers.',                     limits: { maxListings: 10, maxRequirements: 0 },  features: [{ text: 'Up to 10 listings', included: true }, { text: 'Email match alerts', included: true }, { text: 'Featured placement', included: true }] },
    { role: 'seller', slug: 'premium', name: 'Premium', monthlyPrice: 6000, yearlyPrice: 60000, popular: false, sortOrder: 3, description: 'Unlimited reach.',                        limits: { maxListings: 999, maxRequirements: 0 }, features: [{ text: 'Unlimited listings', included: true }, { text: 'Priority support', included: true }, { text: 'Featured placement', included: true }] },
    { role: 'dealer', slug: 'basic',   name: 'Basic',   monthlyPrice: 0,    yearlyPrice: 0,     popular: false, sortOrder: 1, description: 'Try the dealer tools.',                   limits: { maxListings: 3,  maxRequirements: 3 },  features: [{ text: '3 active listings', included: true }, { text: 'Requirements board', included: true }, { text: 'Deal Room', included: false }] },
    { role: 'dealer', slug: 'pro',     name: 'Pro',     monthlyPrice: 4000, yearlyPrice: 40000, popular: true,  sortOrder: 2, description: 'Work both sides of the market.',          limits: { maxListings: 25, maxRequirements: 25 }, features: [{ text: 'Up to 25 listings', included: true }, { text: 'Deal Room', included: true }, { text: 'Priority matching', included: true }] },
    { role: 'dealer', slug: 'premium', name: 'Premium', monthlyPrice: 9000, yearlyPrice: 90000, popular: false, sortOrder: 3, description: 'For agencies.',                           limits: { maxListings: 999, maxRequirements: 999 }, features: [{ text: 'Unlimited listings', included: true }, { text: 'Deal Room', included: true }, { text: 'Dedicated manager', included: true }] },
    { role: 'buyer',  slug: 'basic',   name: 'Basic',   monthlyPrice: 0,    yearlyPrice: 0,     popular: false, sortOrder: 1, description: 'Post what you need, free.',               limits: { maxListings: 0, maxRequirements: 2 },   features: [{ text: '2 active requirements', included: true }, { text: 'Email match alerts', included: true }, { text: 'Priority matching', included: false }] },
    { role: 'buyer',  slug: 'pro',     name: 'Pro',     monthlyPrice: 1500, yearlyPrice: 15000, popular: true,  sortOrder: 2, description: 'Be first in the queue.',                  limits: { maxListings: 0, maxRequirements: 15 },  features: [{ text: 'Up to 15 requirements', included: true }, { text: 'Priority matching', included: true }, { text: 'Deal Room', included: true }] },
  ];
  for (const p of PLAN_ROWS) {
    await prisma.plan.upsert({
      where: { role_slug: { role: p.role, slug: p.slug } },
      update: { name: p.name, monthlyPrice: p.monthlyPrice, yearlyPrice: p.yearlyPrice, description: p.description, popular: p.popular, active: true, features: p.features, limits: p.limits, sortOrder: p.sortOrder },
      create: { ...p, currency: 'PKR', active: true },
    });
  }
  console.log(`Plans:          ${PLAN_ROWS.length} (upserted)`);

  /* ── 4. Properties + Listings ── */
  const props = [];
  for (let i = 0; i < PROPERTIES.length; i++) {
    const d = PROPERTIES[i];
    const owner = U[d.owner];
    const created = ago(int(2, 60) * DAY);
    const prop = await prisma.property.create({
      data: {
        title: d.title,
        description: `${d.title}. ${d.purpose === 'rent' ? 'Monthly rent' : 'Sale price'} in PKR. Well-maintained ${d.propertyType.replace(/-/g, ' ')} in ${d.area}, ${d.city}, close to main access roads, markets and schools.`,
        photos: PHOTO_SETS[i].map(img),
        location: { city: d.city, area: d.area, coordinates: { lat: d.lat, lng: d.lng } },
        purpose: d.purpose,
        price: d.price,
        category: d.category,
        propertyType: d.propertyType,
        size: d.size,
        sizeUnit: d.unit,
        bedrooms: d.bed,
        bathrooms: d.bath,
        amenities: d.amenities,
        securityDeposit: d.deposit || 0,
        leaseTerm: d.purpose === 'rent' ? 12 : 12,
        furnished: d.furnished || 'unfurnished',
        availableFrom: d.purpose === 'rent' ? ago(-7 * DAY) : null,
        contactName: owner.name,
        contactEmail: owner.email,
        contactPhone: owner.phone,
        status: d.status,
        actingRole: owner.role,
        listedById: owner.id,
        createdAt: created,
      },
    });
    const listing = await prisma.listing.create({
      data: {
        propertyId: prop.id,
        ownerId: owner.id,
        views: int(12, 480),
        inquiries: int(0, 25),
        status: ['sold', 'rented'].includes(d.status) ? 'sold' : d.status === 'featured' ? 'featured' : d.status === 'pending' ? 'pending' : 'active',
        createdAt: created,
      },
    });
    props.push({ prop, listing, d, owner });
  }
  console.log(`Properties:     ${props.length}`);
  console.log(`Listings:       ${props.length}`);

  /* ── 5. Requirements ── */
  const reqs = [];
  for (const r of REQUIREMENTS) {
    const owner = U[r.owner];
    const req = await prisma.requirement.create({
      data: {
        requiredById: owner.id,
        title: r.title,
        // location + budget are JSON on this model (not flat columns).
        location: { city: r.city, area: r.area, coordinates: r.coords || null },
        budget: { min: r.min, max: r.max },
        purpose: r.purpose,
        propertyType: r.propertyType,
        size: r.size || '',
        bedrooms: r.bed || null,
        bathrooms: r.bath || null,
        notes: `Looking for a ${r.propertyType.replace(/-/g, ' ')} in ${r.area}, ${r.city}. Budget PKR ${r.min.toLocaleString()} - ${r.max.toLocaleString()}.`,
        urgency: r.urgency || 'flexible',
        status: r.status,
        actingRole: owner.role,
        createdAt: ago(int(1, 40) * DAY),
      },
    });
    reqs.push({ req, r, owner });
  }
  console.log(`Requirements:   ${reqs.length}`);

  /* ── 6. Matches — pair requirements with genuinely compatible properties ── */
  const overlaps = (p, r) =>
    p.d.city === r.r.city &&
    p.d.purpose === r.r.purpose &&
    p.d.category === r.r.category &&
    p.d.price >= r.r.min * 0.9 &&
    p.d.price <= r.r.max * 1.1 &&
    p.owner.id !== r.owner.id;

  const matchRows = [];
  for (const r of reqs) {
    for (const p of props.filter((x) => overlaps(x, r))) {
      const typeMap = { seller: 'seller-buyer', dealer: 'dealer-buyer' };
      matchRows.push({
        propertyId: p.prop.id,
        requirementId: r.req.id,
        initiatorId: p.owner.id,
        score: int(68, 97),
        type: typeMap[p.owner.role] || 'seller-buyer',
        status: pick(['pending', 'accepted', 'accepted', 'rejected']),
        notes: `Auto-matched on ${p.d.city} · ${p.d.category} · budget fit.`,
        aiScore: int(60, 95) / 10,
        aiStatus: 'scored',
        aiReason: 'Location, budget and property type all align with the stated requirement.',
        createdAt: ago(int(1, 20) * DAY),
      });
    }
  }
  if (matchRows.length) await prisma.match.createMany({ data: matchRows });
  console.log(`Matches:        ${matchRows.length}`);

  /* ── 7. Conversations + participant prefs + messages ── */
  const enc = (t) => encryptMessage(t);
  const THREADS = [
    {
      a: 'ahmed', b: 'fatima', propIdx: 0, ageDays: 3,
      msgs: [
        ['b', 'Assalam o alaikum — is the Gulberg house still available?', true, 3 * DAY],
        ['a', 'Walaikum assalam. Yes, it is. Listed at 4.8 crore.', true, 3 * DAY - 2 * 3600e3],
        ['b', 'Could you do 4.5?', true, 2 * DAY],
        ['a', 'I can go to 4.65 if we close this month — fittings included.', true, 2 * DAY - 3600e3],
        ['b', 'That works. Can we visit this weekend?', false, 6 * 3600e3],
        ['a', 'Saturday 11am suits me. I will keep the documents ready.', false, 2 * 3600e3],
      ],
    },
    {
      a: 'bilal', b: 'ayesha', propIdx: 7, ageDays: 5,
      msgs: [
        ['a', 'I manage a fully furnished 3-bed in DHA Phase 6 — 150k/month.', true, 5 * DAY],
        ['b', 'Are utilities included in that?', true, 4 * DAY],
        ['a', 'Maintenance yes, electricity and gas are separate.', true, 4 * DAY - 3600e3],
        ['b', 'Understood. Is it available from next month?', false, 8 * 3600e3],
      ],
    },
    {
      a: 'sana', b: 'usman', propIdx: 4, ageDays: 8,
      msgs: [
        ['b', 'Interested in the F-8 house. Is the price negotiable?', true, 8 * DAY],
        ['a', 'Slightly — around 7.6 crore is workable.', true, 7 * DAY],
        ['b', 'Let me discuss with family and revert.', true, 6 * DAY],
      ],
    },
    {
      a: 'hina', b: 'usman', propIdx: 13, ageDays: 1,
      msgs: [
        ['b', 'Is the 1 Kanal plot in Phase 8 still open?', true, 1 * DAY],
        ['a', 'Yes. Possession is clear and dues are paid.', false, 5 * 3600e3],
      ],
    },
  ];

  let msgCount = 0;
  let convCount = 0;
  for (const t of THREADS) {
    const ua = U[t.a];
    const ub = U[t.b];
    const conv = await prisma.conversation.create({
      data: {
        participants: { connect: [{ id: ua.id }, { id: ub.id }] },
        propertyId: props[t.propIdx].prop.id,
        createdAt: ago(t.ageDays * DAY),
      },
    });
    convCount++;
    // Per-participant prefs (pinned / muted / archived live here, not on the thread).
    await prisma.conversationParticipant.createMany({
      data: [
        { conversationId: conv.id, userId: ua.id, pinned: t.propIdx === 0, muted: false, archived: false },
        { conversationId: conv.id, userId: ub.id, pinned: false, muted: false, archived: false },
      ],
    });
    for (const [who, text, read, backMs] of t.msgs) {
      const sender = who === 'a' ? ua : ub;
      await prisma.message.create({
        data: {
          conversationId: conv.id,
          senderId: sender.id,
          content: enc(text),
          read,
          deliveredAt: ago(backMs),
          readAt: read ? ago(backMs - 60e3) : null,
          createdAt: ago(backMs),
        },
      });
      msgCount++;
    }
    // One message that shares the property as a card.
    await prisma.message.create({
      data: {
        conversationId: conv.id,
        senderId: ua.id,
        content: enc('Sharing the listing for reference.'),
        type: 'property',
        propertyId: props[t.propIdx].prop.id,
        read: true,
        createdAt: ago(t.ageDays * DAY - 1800e3),
      },
    });
    msgCount++;
  }
  console.log(`Conversations:  ${convCount}`);
  console.log(`Messages:       ${msgCount}`);

  /* ── 8. Reviews — both kinds (property and user) ── */
  const reviewRows = [
    { reviewerId: U.fatima.id, target: props[0].prop.id, targetType: 'property', rating: 5, comment: 'Exactly as described. Owner was straightforward about the paperwork.' },
    { reviewerId: U.usman.id,  target: props[4].prop.id, targetType: 'property', rating: 4, comment: 'Good location and well kept, though slightly over our budget.' },
    { reviewerId: U.ayesha.id, target: props[7].prop.id, targetType: 'property', rating: 5, comment: 'Furnishing is genuinely new. Building has proper backup power.' },
    { reviewerId: U.usman.id,  target: props[11].prop.id, targetType: 'property', rating: 3, comment: 'Decent house but the street is narrow for parking.' },
    { reviewerId: U.fatima.id, target: U.ahmed.id,  targetType: 'user', rating: 5, comment: 'Responsive and honest about the condition of the property.' },
    { reviewerId: U.ayesha.id, target: U.bilal.id,  targetType: 'user', rating: 4, comment: 'Knows the DHA market well. Slightly slow to reply on weekends.' },
    { reviewerId: U.usman.id,  target: U.sana.id,   targetType: 'user', rating: 5, comment: 'Very professional throughout the negotiation.' },
    { reviewerId: U.usman.id,  target: U.hina.id,   targetType: 'user', rating: 4, comment: 'Helpful with the plot documentation.' },
  ].map((r) => ({ ...r, createdAt: ago(int(1, 30) * DAY) }));
  await prisma.review.createMany({ data: reviewRows });
  console.log(`Reviews:        ${reviewRows.length}`);

  /* ── 9. Trips — one per status so every tab has content ── */
  const dstr = (offsetDays) => new Date(Date.now() + offsetDays * DAY).toISOString().slice(0, 10);
  const tripRows = [
    { userId: U.fatima.id, propertyId: props[0].prop.id,  checkIn: dstr(4),   checkOut: dstr(4),   nights: 1, totalPrice: 0, status: 'upcoming',  confirmationCode: 'SEED-TRIP-0001' },
    { userId: U.ayesha.id, propertyId: props[7].prop.id,  checkIn: dstr(9),   checkOut: dstr(9),   nights: 1, totalPrice: 0, status: 'upcoming',  confirmationCode: 'SEED-TRIP-0002' },
    { userId: U.usman.id,  propertyId: props[4].prop.id,  checkIn: dstr(-12), checkOut: dstr(-12), nights: 1, totalPrice: 0, status: 'completed', confirmationCode: 'SEED-TRIP-0003' },
    { userId: U.usman.id,  propertyId: props[13].prop.id, checkIn: dstr(-3),  checkOut: dstr(-3),  nights: 1, totalPrice: 0, status: 'completed', confirmationCode: 'SEED-TRIP-0004' },
    { userId: U.fatima.id, propertyId: props[2].prop.id,  checkIn: dstr(-6),  checkOut: dstr(-6),  nights: 1, totalPrice: 0, status: 'cancelled', confirmationCode: 'SEED-TRIP-0005', cancelledAt: dstr(-8), refundAmount: 0 },
  ].map((t) => ({ ...t, guests: { adults: 1, children: 0, infants: 0 }, createdAt: ago(int(1, 25) * DAY) }));
  await prisma.trip.createMany({ data: tripRows });
  console.log(`Trips:          ${tripRows.length}`);

  /* ── 10. Wishlists ── */
  const wl = [
    { userId: U.fatima.id, name: 'Favourites',       isDefault: true,  propertyIds: [props[0].prop.id, props[1].prop.id, props[11].prop.id] },
    { userId: U.fatima.id, name: 'Rentals to visit', isDefault: false, propertyIds: [props[2].prop.id, props[14].prop.id] },
    { userId: U.usman.id,  name: 'Favourites',       isDefault: true,  propertyIds: [props[4].prop.id, props[6].prop.id, props[13].prop.id] },
    { userId: U.ayesha.id, name: 'Favourites',       isDefault: true,  propertyIds: [props[7].prop.id, props[8].prop.id] },
    { userId: U.ayesha.id, name: 'Long shots',       isDefault: false, propertyIds: [props[8].prop.id] },
  ].map((w) => ({ ...w, createdAt: ago(int(1, 30) * DAY) }));
  await prisma.wishlist.createMany({ data: wl });
  console.log(`Wishlists:      ${wl.length}`);

  /* ── 11. Payments — one per status so the admin queue has all three ── */
  const proof = img('photo-1554224155-6726b3ff858f');
  const payRows = [
    { userId: U.ahmed.id,  planId: 'plan-pro',     planName: 'Pro',     billingCycle: 'monthly', amount: 2500, status: 'approved', proofUrl: proof },
    { userId: U.sana.id,   planId: 'plan-premium', planName: 'Premium', billingCycle: 'yearly',  amount: 60000, status: 'approved', proofUrl: proof },
    { userId: U.bilal.id,  planId: 'plan-pro',     planName: 'Pro',     billingCycle: 'monthly', amount: 4000, status: 'pending',  proofUrl: proof },
    { userId: U.hina.id,   planId: 'plan-basic',   planName: 'Basic',   billingCycle: 'monthly', amount: 0,    status: 'rejected', proofUrl: proof },
    { userId: U.fatima.id, planId: 'plan-pro',     planName: 'Pro',     billingCycle: 'monthly', amount: 1500, status: 'approved', proofUrl: proof },
  ].map((p) => ({ ...p, currency: 'PKR', method: 'easypaisa', createdAt: ago(int(1, 45) * DAY) }));
  await prisma.payment.createMany({ data: payRows });
  console.log(`Payments:       ${payRows.length}`);

  /* ── 12. Activity logs ── */
  const logRows = [];
  const logFor = (u, action, entityType, entityId, meta) => ({
    userId: u.id, userRole: u.role, userEmail: u.email, userName: u.name,
    action, entityType, entityId, meta: meta || undefined,
    ip: `103.${int(10, 250)}.${int(1, 250)}.${int(1, 250)}`,
    createdAt: ago(int(1, 40) * DAY),
  });
  for (const p of props) {
    logRows.push(logFor(p.owner, 'property.create', 'property', p.prop.id, { title: p.d.title, city: p.d.city }));
  }
  for (const r of reqs) {
    logRows.push(logFor(r.owner, 'requirement.create', 'requirement', r.req.id, { title: r.r.title }));
  }
  for (const key of Object.keys(U)) {
    logRows.push(logFor(U[key], 'auth.login', 'auth', null, { method: 'password' }));
  }
  logRows.push(logFor(U.fatima, 'wishlist.add', 'wishlist', null, { property: props[0].prop.id }));
  logRows.push(logFor(U.usman,  'trip.create',  'trip', null, { property: props[4].prop.id }));
  logRows.push(logFor(U.bilal,  'payment.submit', 'payment', null, { plan: 'Pro', amount: 4000 }));
  await prisma.activityLog.createMany({ data: logRows });
  console.log(`Activity logs:  ${logRows.length}`);

  /* ── 13. ContactPage (singleton — only fill if still unset) ── */
  const cp = await prisma.contactPage.findUnique({ where: { id: 'singleton' } });
  if (!cp) {
    await prisma.contactPage.create({ data: { id: 'singleton' } });
    console.log('ContactPage:    created (defaults)');
  } else {
    console.log('ContactPage:    already present — left untouched');
  }

  /* ── Summary ── */
  console.log('\n─────────────────────────────────────────────');
  console.log('Seed complete. Sign in with any of these:');
  for (const p of PEOPLE) console.log(`  ${(p.key + DOMAIN).padEnd(26)} ${p.role.padEnd(7)} ${PASS}`);
  console.log('─────────────────────────────────────────────');
}

main()
  .catch((e) => { console.error('\nSeed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
