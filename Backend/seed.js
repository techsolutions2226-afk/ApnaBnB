/* eslint-disable no-console */
require("dotenv").config();
const mongoose = require("mongoose");

const User = require("./models/User");
const Property = require("./models/Property");
const Listing = require("./models/Listing");
const Requirement = require("./models/Requirement");
const Match = require("./models/Match");
const Conversation = require("./models/Conversation");
const Message = require("./models/Message");
const Review = require("./models/Review");

const usersData = require("./seed/data/users");
const propertiesData = require("./seed/data/properties");
const listingsData = require("./seed/data/listings");
const requirementsData = require("./seed/data/requirements");
const matchesData = require("./seed/data/matches");
const conversationsData = require("./seed/data/conversations");
const reviewsData = require("./seed/data/reviews");

const RESET = process.argv.includes("--reset");

// String ID → Mongo ObjectId. Built up as records are inserted; later inserts
// use it to resolve cross-references (e.g., property.listedById → User._id).
const idMap = new Map();
const oid = (key) => {
  const id = idMap.get(key);
  if (!id) throw new Error(`Unknown reference: ${key}`);
  return id;
};
const allocate = (key) => {
  const id = new mongoose.Types.ObjectId();
  idMap.set(key, id);
  return id;
};

async function clearAll() {
  await Promise.all([
    User.deleteMany({}),
    Property.deleteMany({}),
    Listing.deleteMany({}),
    Requirement.deleteMany({}),
    Match.deleteMany({}),
    Conversation.deleteMany({}),
    Message.deleteMany({}),
    Review.deleteMany({}),
  ]);
}

async function seedUsers() {
  // User.create() runs the pre-save bcrypt hook on each doc; insertMany would skip it.
  const docs = usersData.map((u) => ({
    _id: allocate(u.id),
    name: `${u.firstName} ${u.lastName}`.trim(),
    email: u.email,
    password: u.password,
    role: u.role,
    // Demo accounts are pre-verified so seeded demo logins work without OTP.
    verified: true,
  }));
  await User.create(docs);
  return docs.length;
}

async function seedProperties() {
  const docs = propertiesData.map((p) => ({
    _id: allocate(p.id),
    title: p.title,
    description: p.description,
    photos: p.photos,
    location: {
      city: p.city,
      area: p.area,
      coordinates: p.coordinates,
    },
    price: p.price,
    propertyType: p.propertyType.toLowerCase(),
    size: p.size,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    status: "active",
    listedBy: oid(p.listedById),
  }));
  await Property.insertMany(docs);
  return docs.length;
}

async function seedListings() {
  // The Listing schema has no `featured` field; surface featured listings via status.
  const docs = listingsData.map((l) => {
    let status = l.status;
    if (l.featured && status === "active") status = "featured";
    return {
      _id: allocate(l.id),
      property: oid(l.propertyId),
      owner: oid(l.ownerId),
      views: l.views,
      inquiries: l.inquiries,
      status,
    };
  });
  await Listing.insertMany(docs);
  return docs.length;
}

async function seedRequirements() {
  const docs = requirementsData.map((r) => ({
    _id: allocate(r.id),
    requiredBy: oid(r.userId),
    title: r.title,
    location: { city: r.city, area: r.area },
    budget: { min: r.budgetMin, max: r.budgetMax },
    propertyType: r.propertyType.toLowerCase(),
    size: r.size,
    bedrooms: r.bedrooms,
    bathrooms: r.bathrooms,
    notes: r.notes,
    status: r.status,
    urgency: r.urgency,
  }));
  await Requirement.insertMany(docs);
  return docs.length;
}

async function seedMatches() {
  // Mock "active" status doesn't exist in the Match enum; map it to "accepted".
  const mapStatus = (s) => (s === "active" ? "accepted" : s);
  const docs = matchesData.map((m) => ({
    _id: allocate(m.id),
    property: oid(m.propertyId),
    requirement: oid(m.requirementId),
    initiator: oid(m.initiatorId),
    score: m.matchScore,
    type: m.type,
    status: mapStatus(m.status),
    notes: m.summary || "",
  }));
  await Match.insertMany(docs);
  return docs.length;
}

async function seedConversationsAndMessages() {
  const convoDocs = conversationsData.map((c) => ({
    _id: allocate(c.id),
    participants: c.participants.map(oid),
  }));
  await Conversation.insertMany(convoDocs);

  let messageCount = 0;
  const messageDocs = [];
  for (const c of conversationsData) {
    for (const m of c.messages) {
      messageDocs.push({
        conversationId: oid(c.id),
        sender: oid(m.senderId),
        content: m.text,
        read: false,
      });
      messageCount += 1;
    }
  }
  await Message.insertMany(messageDocs);
  return { conversations: convoDocs.length, messages: messageCount };
}

async function seedReviews() {
  const docs = reviewsData.map((r) => ({
    _id: allocate(r.id),
    reviewer: oid(r.userId),
    target: oid(r.propertyId),
    targetType: "property",
    rating: r.rating,
    comment: r.text,
  }));
  await Review.insertMany(docs);
  return docs.length;
}

async function run() {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is not set in .env — cannot seed.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log(`Connected to ${mongoose.connection.name}`);

  const existingUsers = await User.countDocuments();
  if (existingUsers > 0 && !RESET) {
    console.error(
      `Refusing to seed: database already contains ${existingUsers} user(s). ` +
      `Re-run with --reset (or 'npm run seed:reset') to wipe and reseed.`
    );
    await mongoose.disconnect();
    process.exit(1);
  }
  if (RESET) {
    console.log("Reset flag set — clearing all collections...");
    await clearAll();
  }

  const counts = {};
  counts.users = await seedUsers();
  counts.properties = await seedProperties();
  counts.listings = await seedListings();
  counts.requirements = await seedRequirements();
  counts.matches = await seedMatches();
  const convoMsg = await seedConversationsAndMessages();
  counts.conversations = convoMsg.conversations;
  counts.messages = convoMsg.messages;
  counts.reviews = await seedReviews();

  console.log("\nSeed complete:");
  for (const [key, value] of Object.entries(counts)) {
    console.log(`  ${key.padEnd(14)} ${value}`);
  }
  console.log(
    `\nLogin examples:\n` +
    `  seller  ahmad@example.com / password123\n` +
    `  buyer   fatima@example.com / password123\n` +
    `  dealer  bilal@example.com / password123\n` +
    `  admin   admin@realestate.pk / admin123`
  );

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(async (err) => {
  console.error("Seed failed:", err);
  try {
    await mongoose.disconnect();
  } catch (_) { /* ignore */ }
  process.exit(1);
});
