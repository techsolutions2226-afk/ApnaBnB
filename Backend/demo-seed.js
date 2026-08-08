/* One-shot demo-data seeder (Postgres / Prisma).
 *
 * Adds three test users (seller / dealer / buyer), 10 listings (5 each for the
 * seller and dealer), and 5 requirements posted by the buyer that are
 * carefully designed to *match* the listings on city + area + property type
 * + price ±10%.
 *
 * Run with:
 *   cd Backend && node demo-seed.js
 *
 * Idempotent — re-running deletes the test users (cascading all their data)
 * and reseeds.
 */

require('dotenv').config();
const bcrypt = require('bcrypt');
const prisma = require('./db/prisma');
const { encryptMessage } = require('./utils/messageCrypto');
const { generateMatchesForProperty } = require('./controllers/propertyController');

const TEST_EMAILS = [
  'ahmed.seller@apnabnb.test',
  'bilal.dealer@apnabnb.test',
  'fatima.buyer@apnabnb.test',
];

const PASS = 'Test@1234';

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is missing from .env — bailing.');
    process.exit(1);
  }

  /* ── 1. Clean up any prior runs — deleting the users cascades every
     property / listing / requirement / match / trip / wishlist they own.
     Conversations are the one exception (no FK back to a user), so drop any
     that involve the test emails first. ── */
  const existingUsers = await prisma.user.findMany({
    where: { email: { in: TEST_EMAILS } },
    select: { id: true },
  });
  const oldUserIds = existingUsers.map((u) => u.id);
  if (oldUserIds.length > 0) {
    const oldConvs = await prisma.conversation.findMany({
      where: { participants: { some: { id: { in: oldUserIds } } } },
      select: { id: true },
    });
    if (oldConvs.length > 0) {
      await prisma.conversation.deleteMany({
        where: { id: { in: oldConvs.map((c) => c.id) } },
      });
    }
  }
  const del = await prisma.user.deleteMany({ where: { email: { in: TEST_EMAILS } } });
  if (del.count > 0) {
    console.log(`Cleared ${del.count} existing test user(s) + their data.`);
  }

  /* ── 2. Create three users (hash the shared password once). ── */
  const passwordHash = await bcrypt.hash(PASS, 10);
  const seller = await prisma.user.create({
    data: {
      name: 'Ahmed Hassan',
      email: TEST_EMAILS[0],
      password: passwordHash,
      role: 'seller',
      verified: true,
      phone: '+923001112233',
      location: 'Lahore',
    },
  });
  const dealer = await prisma.user.create({
    data: {
      name: 'Bilal Khan',
      email: TEST_EMAILS[1],
      password: passwordHash,
      role: 'dealer',
      verified: true,
      phone: '+923004445566',
      location: 'Karachi',
    },
  });
  const buyer = await prisma.user.create({
    data: {
      name: 'Fatima Ali',
      email: TEST_EMAILS[2],
      password: passwordHash,
      role: 'buyer',
      verified: true,
      phone: '+923007778899',
      location: 'Lahore',
    },
  });
  console.log('Created users:', seller.email, dealer.email, buyer.email);

  /* ── 3. Listings designed so requirements below produce matches ── */
  const sellerPropsData = [
    { title: '10 Marla House in Gulberg III', city: 'Lahore', area: 'Gulberg', price: 50000000, propertyType: 'house', category: 'home', purpose: 'sale', bedrooms: 4, bathrooms: 4, size: 10, sizeUnit: 'Marla' },
    { title: '3 Bedroom Apartment near Sea View', city: 'Karachi', area: 'Clifton', price: 18000000, propertyType: 'apartment', category: 'home', purpose: 'sale', bedrooms: 3, bathrooms: 3, size: 1800, sizeUnit: 'sq ft' },
    { title: 'Residential plot in F-11', city: 'Islamabad', area: 'F-11', price: 25000000, propertyType: 'residential-plot', category: 'plot', purpose: 'sale', bedrooms: 0, bathrooms: 0, size: 10, sizeUnit: 'Marla' },
    { title: '1 Kanal House in DHA Phase 5', city: 'Lahore', area: 'DHA', price: 80000000, propertyType: 'house', category: 'home', purpose: 'sale', bedrooms: 5, bathrooms: 5, size: 1, sizeUnit: 'Kanal' },
    { title: '2 BR Apartment in Clifton Block 5', city: 'Karachi', area: 'Clifton', price: 12000000, propertyType: 'apartment', category: 'home', purpose: 'sale', bedrooms: 2, bathrooms: 2, size: 1200, sizeUnit: 'sq ft' },
  ];

  const dealerPropsData = [
    { title: 'Spacious House in Gulberg II', city: 'Lahore', area: 'Gulberg', price: 45000000, propertyType: 'house', category: 'home', purpose: 'sale', bedrooms: 5, bathrooms: 4, size: 12, sizeUnit: 'Marla' },
    { title: 'Furnished 3 Bed Flat for Rent — DHA', city: 'Karachi', area: 'DHA', price: 150000, propertyType: 'flat', category: 'home', purpose: 'rent', bedrooms: 3, bathrooms: 3, size: 1800, sizeUnit: 'sq ft', furnished: 'furnished', securityDeposit: 300000, leaseTerm: 12 },
    { title: '2 Bed Apartment in F-10 Markaz', city: 'Islamabad', area: 'F-10', price: 9000000, propertyType: 'apartment', category: 'home', purpose: 'sale', bedrooms: 2, bathrooms: 2, size: 1100, sizeUnit: 'sq ft' },
    { title: 'Brand New House in Rawalpindi DHA', city: 'Rawalpindi', area: 'DHA', price: 60000000, propertyType: 'house', category: 'home', purpose: 'sale', bedrooms: 4, bathrooms: 4, size: 1, sizeUnit: 'Kanal' },
    { title: 'Studio Apartment for Rent — Clifton', city: 'Karachi', area: 'Clifton', price: 80000, propertyType: 'apartment', category: 'home', purpose: 'rent', bedrooms: 2, bathrooms: 2, size: 950, sizeUnit: 'sq ft', furnished: 'semi-furnished', securityDeposit: 160000, leaseTerm: 12 },
  ];

  const buildProp = (data, owner) => ({
    title: data.title,
    description: `Demo property listed under ${owner.name}. ${data.purpose === 'rent' ? 'Monthly rent in PKR.' : 'Sale price in PKR.'}`,
    photos: ['https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=900&q=80&auto=format&fit=crop'],
    location: { city: data.city, area: data.area },
    price: data.price,
    purpose: data.purpose,
    category: data.category,
    propertyType: data.propertyType,
    size: data.size,
    sizeUnit: data.sizeUnit,
    bedrooms: data.bedrooms,
    bathrooms: data.bathrooms,
    amenities: ['Parking', 'Security'],
    securityDeposit: data.securityDeposit || 0,
    leaseTerm: data.leaseTerm || 12,
    furnished: data.furnished || 'unfurnished',
    contactName: owner.name,
    contactEmail: owner.email,
    contactPhone: owner.phone,
    status: 'active',
    listedById: owner.id,
  });

  const allPropsData = [
    ...sellerPropsData.map((d) => buildProp(d, seller)),
    ...dealerPropsData.map((d) => buildProp(d, dealer)),
  ];

  const properties = [];
  for (const data of allPropsData) {
    properties.push(await prisma.property.create({ data }));
  }
  console.log(`Created ${properties.length} properties.`);

  /* Wrap each property in a Listing so it shows on the owner's My Listings. */
  await prisma.listing.createMany({
    data: properties.map((p) => ({ propertyId: p.id, ownerId: p.listedById, status: 'active' })),
  });
  console.log(`Created ${properties.length} listings.`);

  /* ── 4. Requirements — each crafted to match at least one listing ── */
  const requirementsData = [
    { title: 'Looking for house in Lahore Gulberg', city: 'Lahore', area: 'Gulberg', budgetMin: 40000000, budgetMax: 55000000, purpose: 'sale', propertyType: 'house', bedrooms: 4, bathrooms: 4, urgency: '60 days', notes: 'Family relocating, prefer well-maintained property.' },
    { title: 'Need 3 bed flat for rent in Karachi DHA', city: 'Karachi', area: 'DHA', budgetMin: 100000, budgetMax: 180000, purpose: 'rent', propertyType: 'flat', bedrooms: 3, bathrooms: 3, urgency: '30 days', notes: 'Furnished preferred.' },
    { title: 'Want to buy a plot in Islamabad F-11', city: 'Islamabad', area: 'F-11', budgetMin: 22000000, budgetMax: 28000000, purpose: 'sale', propertyType: 'residential-plot', bedrooms: 0, bathrooms: 0, urgency: '90 days', notes: 'Investment purpose.' },
    { title: 'Apartment in Clifton Karachi', city: 'Karachi', area: 'Clifton', budgetMin: 10000000, budgetMax: 15000000, purpose: 'sale', propertyType: 'apartment', bedrooms: 2, bathrooms: 2, urgency: '45 days', notes: '2 bedroom for small family.' },
    { title: 'House in Rawalpindi DHA', city: 'Rawalpindi', area: 'DHA', budgetMin: 55000000, budgetMax: 65000000, purpose: 'sale', propertyType: 'house', bedrooms: 4, urgency: '60 days', notes: '1 Kanal preferred.' },
  ];

  await prisma.requirement.createMany({
    data: requirementsData.map((r) => ({
      requiredById: buyer.id,
      title: r.title,
      location: { city: r.city, area: r.area },
      budget: { min: r.budgetMin, max: r.budgetMax },
      purpose: r.purpose,
      propertyType: r.propertyType,
      size: '',
      bedrooms: r.bedrooms ?? 0,
      bathrooms: r.bathrooms ?? 0,
      notes: r.notes,
      status: 'active',
      urgency: r.urgency,
    })),
  });
  console.log(`Created ${requirementsData.length} requirements.`);

  /* ── 5. Generate matches by running each property through the match engine ── */
  let totalMatches = 0;
  for (const p of properties) {
    const ms = await generateMatchesForProperty(p, p.listedById);
    totalMatches += ms.length;
  }
  console.log(`Match engine produced ${totalMatches} match record(s).`);

  /* ── 6. Demo conversations + messages ── */
  const now = Date.now();
  const agoMs = (ms) => new Date(now - ms);

  // Create an encrypted message; when `edited` is set, content is re-written
  // so updatedAt > createdAt and the client renders the "Edited" tag.
  const makeMessage = async ({ conversationId, senderId, content, read = false, createdAt, edited, attachments = [] }) => {
    const m = await prisma.message.create({
      data: {
        conversationId,
        senderId,
        content: encryptMessage(content),
        attachments,
        read,
        createdAt,
        // Match updatedAt to createdAt so only the truly-edited message below
        // trips the client's "Edited" (updatedAt > createdAt) heuristic.
        updatedAt: createdAt,
      },
    });
    if (edited) {
      await prisma.message.update({
        where: { id: m.id },
        data: { content: encryptMessage(edited) },
      });
    }
    return m.id;
  };

  // Thread 1 — Gulberg III house (Ahmed the seller ↔ Fatima the buyer).
  const convSellerBuyer = await prisma.conversation.create({
    data: {
      participants: { connect: [{ id: seller.id }, { id: buyer.id }] },
      createdAt: agoMs(6 * 3600e3),
    },
  });
  await makeMessage({
    conversationId: convSellerBuyer.id, senderId: seller.id,
    content: "Hello! I saw you're interested in the Gulberg III house — happy to answer any questions.",
    read: true, createdAt: agoMs(5.5 * 3600e3),
  });
  await makeMessage({
    conversationId: convSellerBuyer.id, senderId: buyer.id,
    content: "Yes! My family loves the area. What's your best price?",
    read: true, createdAt: agoMs(5 * 3600e3),
  });
  await makeMessage({
    conversationId: convSellerBuyer.id, senderId: seller.id,
    content: 'Listed at 50M. I can do 47.5M if we close this month.',
    read: true, createdAt: agoMs(4.5 * 3600e3),
    edited: 'Listed at 50M. I can do 47.5M if we close this month — fittings included.',
  });
  await makeMessage({
    conversationId: convSellerBuyer.id, senderId: buyer.id,
    content: 'Sounds fair. Could we visit this weekend?',
    read: true, createdAt: agoMs(3 * 3600e3),
  });
  await makeMessage({
    conversationId: convSellerBuyer.id, senderId: seller.id,
    content: "Sure — Saturday 11am works. I'll have the documents ready.",
    read: false, createdAt: agoMs(1.5 * 3600e3),
  });
  await makeMessage({
    conversationId: convSellerBuyer.id, senderId: buyer.id,
    content: 'Actually, could you share more photos of the interior?',
    read: false, createdAt: agoMs(30 * 60e3),
  });

  // Thread 2 — furnished DHA Karachi flat (Bilal the dealer ↔ Fatima).
  const convDealerBuyer = await prisma.conversation.create({
    data: {
      participants: { connect: [{ id: dealer.id }, { id: buyer.id }] },
      createdAt: agoMs(2 * 24 * 3600e3),
    },
  });
  await makeMessage({
    conversationId: convDealerBuyer.id, senderId: dealer.id,
    content: 'I manage a fully furnished 3-bed flat in DHA Karachi — 150k/month.',
    read: true, createdAt: agoMs(2 * 24 * 3600e3),
  });
  await makeMessage({
    conversationId: convDealerBuyer.id, senderId: buyer.id,
    content: 'Are utilities included?',
    read: true, createdAt: agoMs(26 * 3600e3),
  });
  await makeMessage({
    conversationId: convDealerBuyer.id, senderId: dealer.id,
    content: "Yes, and a refundable 300k deposit. Here's the living room:",
    read: false, createdAt: agoMs(22 * 3600e3),
    attachments: [{
      url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=900&q=80&auto=format&fit=crop',
      type: 'image', name: 'living-room.jpg', size: 0,
    }],
  });

  const totalMessages = await prisma.message.count({
    where: { conversationId: { in: [convSellerBuyer.id, convDealerBuyer.id] } },
  });
  console.log(`Created 2 demo conversations with ${totalMessages} messages (incl. an edited + an image message).`);

  /* ── 7. Summary ── */
  console.log('\n────────────────────────────────────────────');
  console.log('  DEMO DATA SEEDED');
  console.log('────────────────────────────────────────────');
  console.log('  Test users (password for all: Test@1234)');
  console.log(`    SELLER  ${TEST_EMAILS[0]}`);
  console.log(`    DEALER  ${TEST_EMAILS[1]}`);
  console.log(`    BUYER   ${TEST_EMAILS[2]}`);
  console.log('');
  console.log(`  Listings created:    ${properties.length}`);
  console.log(`  Requirements:        ${requirementsData.length}`);
  console.log(`  Matches generated:   ${totalMatches}`);
  console.log(`  Conversations:       2 (${totalMessages} messages)`);
  console.log('────────────────────────────────────────────\n');

  await prisma.$disconnect();
  process.exit(0);
}

main().catch(async (err) => {
  console.error('Seed failed:', err);
  try { await prisma.$disconnect(); } catch (_) {}
  process.exit(1);
});
