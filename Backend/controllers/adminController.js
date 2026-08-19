const bcrypt = require('bcrypt');
const prisma = require('../db/prisma');
const { decryptMessage } = require('../utils/messageCrypto');
const { logActivity } = require('../utils/activityLogger');

// ── Shared selectors ──────────────────────────────────────────────────────
const userSelect = { omit: { password: true } };

const listedBySelect = {
  select: { id: true, name: true, email: true, role: true, avatar: true },
};

const matchInclude = {
  property: {
    include: {
      listedBy: { select: { id: true, name: true, email: true, role: true, avatar: true } },
    },
  },
  requirement: {
    include: {
      requiredBy: { select: { id: true, name: true, email: true, role: true } },
    },
  },
  initiator: { select: { id: true, name: true, email: true, role: true } },
  conversation: { select: { id: true, createdAt: true, updatedAt: true } },
};

// ── Helpers ───────────────────────────────────────────────────────────────
const num = (v) =>
  v === undefined || v === null || v === '' ? undefined : Number(v);

// Normalise a page/limit pair (same semantics as the users endpoint).
const parseAdminPagination = (req) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  return { page, limit, skip: (page - 1) * limit, take: limit };
};

// Whitelist + coerce writable User fields for admin edits.
const buildUserData = (body) => {
  const data = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.email !== undefined) data.email = String(body.email).toLowerCase();
  if (body.role !== undefined) data.role = body.role;
  if (body.phone !== undefined) data.phone = body.phone;
  if (body.location !== undefined) data.location = body.location;
  return data;
};

// Whitelist + coerce writable Property fields (mirrors propertyController).
const buildPropertyData = (body) => {
  const data = {};
  const set = (key, val) => {
    if (val !== undefined) data[key] = val;
  };

  set('title', body.title);
  set('description', body.description);
  set('photos', Array.isArray(body.photos) ? body.photos : undefined);
  set('location', body.location);
  set('price', num(body.price));
  set('purpose', body.purpose);
  set('category', body.category);
  set('propertyType', body.propertyType);
  set('size', num(body.size));
  set('sizeUnit', body.sizeUnit);
  set('bedrooms', num(body.bedrooms));
  set('bathrooms', num(body.bathrooms));
  set('amenities', Array.isArray(body.amenities) ? body.amenities : undefined);
  set('securityDeposit', num(body.securityDeposit));
  set('leaseTerm', num(body.leaseTerm));
  set('furnished', body.furnished);
  set('contactName', body.contactName);
  set('contactEmail', body.contactEmail);
  set('contactPhone', body.contactPhone);
  set('status', body.status);
  if ('availableFrom' in body)
    set('availableFrom', body.availableFrom ? new Date(body.availableFrom) : null);

  return data;
};

// Whitelist writable Requirement fields (mirrors requirementController).
const buildRequirementData = (body) => {
  const data = {};
  const set = (key, val) => {
    if (val !== undefined) data[key] = val;
  };

  set('title', body.title);
  set('location', body.location);
  if ('budget' in body && body.budget !== null && typeof body.budget === 'object') {
    const b = body.budget;
    data.budget = {
      min: b.min !== undefined && b.min !== null && b.min !== ''
        ? Number(b.min)
        : null,
      max: b.max !== undefined && b.max !== null && b.max !== ''
        ? Number(b.max)
        : null,
    };
  }
  set('purpose', body.purpose);
  set('propertyType', body.propertyType);
  set('size', body.size !== undefined ? String(body.size) : undefined);
  set('bedrooms', num(body.bedrooms));
  set('bathrooms', num(body.bathrooms));
  set('notes', body.notes);
  set('status', body.status);
  set('urgency', body.urgency);

  return data;
};

// ── Platform stats ────────────────────────────────────────────────────────
const getPlatformStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalSuspended,
      totalProperties,
      totalActiveProperties,
      totalListings,
      totalRequirements,
      totalMatches,
      totalConversations,
      totalMessages,
      totalReviews,
      roleGroups,
      statusGroups,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { suspended: true } }),
      prisma.property.count(),
      prisma.property.count({ where: { status: 'active' } }),
      prisma.listing.count(),
      prisma.requirement.count(),
      prisma.match.count(),
      prisma.conversation.count(),
      prisma.message.count(),
      prisma.review.count(),
      prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
      prisma.property.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);

    // Match the previous {_id, count} shape the dashboard consumes.
    const usersByRole = roleGroups.map((g) => ({ _id: g.role, count: g._count._all }));
    const listingsByStatus = statusGroups.map((g) => ({ _id: g.status, count: g._count._all }));

    res.status(200).json({
      totalUsers,
      totalSuspended,
      totalProperties,
      totalActiveProperties,
      totalListings,
      totalRequirements,
      totalMatches,
      totalConversations,
      totalMessages,
      totalReviews,
      usersByRole,
      listingsByStatus,
    });
  } catch (error) {
    next(error);
  }
};

// ── Users ─────────────────────────────────────────────────────────────────
// Get all users (paged + searchable by name/email)
const getAllUsers = async (req, res, next) => {
  try {
    const { role, verified, suspended, q } = req.query;
    const where = {};

    if (role) where.role = role;
    if (verified !== undefined) where.verified = verified === 'true';
    if (suspended !== undefined) where.suspended = suspended === 'true';
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }

    const { page, limit, skip, take } = parseAdminPagination(req);
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        ...userSelect,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.user.count({ where }),
    ]);

    res.status(200).json({
      users,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
};

// Get single user by ID (with resource counts + recent activity timeline)
const getUserById = async (req, res, next) => {
  const { id } = req.params;

  try {
    const user = await prisma.user.findUnique({ where: { id }, ...userSelect });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const [listings, requirements, matches, activity] = await Promise.all([
      prisma.property.count({ where: { listedById: id } }),
      prisma.requirement.count({ where: { requiredById: id } }),
      prisma.match.count({ where: { initiatorId: id } }),
      prisma.activityLog.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
    ]);

    res.status(200).json({
      user,
      activity: { listings, requirements, matches, logs: activity },
    });
  } catch (error) {
    next(error);
  }
};

// Create user — admin sets name/email/role/password; account starts verified.
const createUser = async (req, res, next) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: 'Name, email, password and role are required.' });
  }
  if (!['seller', 'buyer', 'dealer'].includes(role)) {
    return res.status(400).json({ message: 'Role must be seller, buyer or dealer.' });
  }

  try {
    const normalizedEmail = String(email).toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(400).json({ message: 'A user with this email already exists.' });
    }

    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: await bcrypt.hash(password, 10),
        role,
        verified: true,
        suspended: false,
      },
      ...userSelect,
    });

    logActivity({
      action: 'admin.user.create',
      entityType: 'user',
      entityId: user.id,
      meta: { name: user.name, email: user.email, role: user.role },
      req,
    });

    res.status(201).json({ message: 'User created successfully.', user });
  } catch (error) {
    next(error);
  }
};

// Edit user (name/email/role/phone/location)
const updateUser = async (req, res, next) => {
  const { id } = req.params;

  try {
    const data = buildUserData(req.body);
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ message: 'Nothing to update.' });
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      ...userSelect,
    });

    logActivity({
      action: 'admin.user.update',
      entityType: 'user',
      entityId: user.id,
      meta: { changes: data },
      req,
    });

    res.status(200).json({ message: 'User updated successfully.', user });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'User not found.' });
    }
    next(error);
  }
};

// Delete user (cascades properties, listings, requirements, matches, messages).
const deleteUser = async (req, res, next) => {
  const { id } = req.params;

  try {
    // Never let an admin delete themselves through the panel.
    if (id === req.user.id) {
      return res.status(400).json({ message: 'You cannot delete your own account.' });
    }
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    await prisma.user.delete({ where: { id } });

    logActivity({
      action: 'admin.user.delete',
      entityType: 'user',
      entityId: id,
      meta: { name: user.name, email: user.email, role: user.role },
      req,
    });

    res.status(200).json({ message: 'User deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

// Verify/Suspend users — general toggle
const manageUser = async (req, res, next) => {
  const { id } = req.params;
  const { action } = req.body;

  if (action !== 'verify' && action !== 'suspend') {
    return res.status(400).json({ message: 'Invalid action. Use "verify" or "suspend".' });
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: {
        // Verify clears suspension; suspend keeps verified intact.
        verified: action === 'verify' ? true : undefined,
        suspended: action === 'suspend',
      },
      ...userSelect,
    });
    res.status(200).json({ message: `User ${action}ed successfully.`, user });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'User not found.' });
    }
    next(error);
  }
};

// Verify user endpoint (specific)
const verifyUser = async (req, res, next) => {
  const { id } = req.params;
  try {
    const user = await prisma.user.update({
      where: { id },
      data: { verified: true, suspended: false },
      ...userSelect,
    });

    logActivity({
      action: 'admin.user.verify',
      entityType: 'user',
      entityId: user.id,
      meta: { email: user.email },
      req,
    });

    res.status(200).json({ message: 'User verified successfully.', user });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'User not found.' });
    }
    next(error);
  }
};

// Suspend user endpoint (specific) — reason captured in the log.
const suspendUser = async (req, res, next) => {
  const { id } = req.params;
  const { reason } = req.body;
  try {
    const user = await prisma.user.update({
      where: { id },
      data: { suspended: true },
      ...userSelect,
    });

    logActivity({
      action: 'admin.user.suspend',
      entityType: 'user',
      entityId: user.id,
      meta: { email: user.email, reason: reason || null },
      req,
    });

    res.status(200).json({ message: 'User suspended successfully.', user });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'User not found.' });
    }
    next(error);
  }
};

// ── Properties ────────────────────────────────────────────────────────────
// Get all properties (admin view) — paged + searchable
const getAllProperties = async (req, res, next) => {
  try {
    const { status, city, q, purpose } = req.query;
    const where = {};

    if (status) where.status = status;
    if (purpose) where.purpose = purpose;
    if (city) where.location = { path: ['city'], equals: city };
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    const { page, limit, skip, take } = parseAdminPagination(req);
    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where,
        include: { listedBy: listedBySelect },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.property.count({ where }),
    ]);

    res.status(200).json({
      properties,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
};

// Edit property (admin) — same whitelist as user edits.
const updateProperty = async (req, res, next) => {
  const { id } = req.params;

  try {
    const data = buildPropertyData(req.body);
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ message: 'Nothing to update.' });
    }

    const property = await prisma.property.findUnique({ where: { id } });
    if (!property) {
      return res.status(404).json({ message: 'Property not found.' });
    }

    const updated = await prisma.property.update({
      where: { id },
      data,
      include: { listedBy: listedBySelect },
    });

    logActivity({
      action: 'admin.property.update',
      entityType: 'property',
      entityId: property.id,
      meta: { title: property.title, changedFields: Object.keys(data) },
      req,
    });

    res.status(200).json({ message: 'Property updated successfully.', property: updated });
  } catch (error) {
    next(error);
  }
};

// Delete property (admin) — cascades listings/matches/trips.
const deleteProperty = async (req, res, next) => {
  const { id } = req.params;

  try {
    const property = await prisma.property.findUnique({ where: { id } });
    if (!property) {
      return res.status(404).json({ message: 'Property not found.' });
    }

    await prisma.property.delete({ where: { id } });

    logActivity({
      action: 'admin.property.delete',
      entityType: 'property',
      entityId: id,
      meta: { title: property.title },
      req,
    });

    res.status(200).json({ message: 'Property deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

// Approve property (deferred moderation — kept for API compat)
const approveProperty = async (req, res, next) => {
  const { id } = req.params;
  try {
    const property = await prisma.property.update({
      where: { id },
      data: { status: 'active' },
      include: { listedBy: { select: { id: true, name: true, email: true } } },
    });

    logActivity({
      action: 'admin.property.approve',
      entityType: 'property',
      entityId: property.id,
      meta: { title: property.title },
      req,
    });

    res.status(200).json({ message: 'Property approved successfully.', property });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Property not found.' });
    }
    next(error);
  }
};

// Reject property
const rejectProperty = async (req, res, next) => {
  const { id } = req.params;
  const { reason } = req.body;
  try {
    const property = await prisma.property.update({
      where: { id },
      data: { status: 'rejected' },
      include: { listedBy: { select: { id: true, name: true, email: true } } },
    });

    logActivity({
      action: 'admin.property.reject',
      entityType: 'property',
      entityId: property.id,
      meta: { title: property.title, reason: reason || null },
      req,
    });

    res.status(200).json({ message: 'Property rejected successfully.', property });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Property not found.' });
    }
    next(error);
  }
};

// ── Listings ──────────────────────────────────────────────────────────────
// Get all listings (admin view) — paged + filterable by status
const getAllListings = async (req, res, next) => {
  try {
    const { status, q } = req.query;
    const where = {};

    if (status) where.status = status;
    if (q) where.property = { is: { title: { contains: q, mode: 'insensitive' } } };

    const { page, limit, skip, take } = parseAdminPagination(req);
    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        include: {
          property: { include: { listedBy: listedBySelect } },
          owner: { select: { id: true, name: true, email: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.listing.count({ where }),
    ]);

    res.status(200).json({
      listings,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
};

// Update listing status (active / pending / sold / featured)
const updateListing = async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !['active', 'pending', 'sold', 'featured'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status.' });
  }

  try {
    const listing = await prisma.listing.findUnique({ where: { id } });
    if (!listing) {
      return res.status(404).json({ message: 'Listing not found.' });
    }

    const updated = await prisma.listing.update({
      where: { id },
      data: { status },
      include: { property: { select: { id: true, title: true } }, owner: { select: { id: true, name: true } } },
    });

    logActivity({
      action: 'admin.listing.update',
      entityType: 'listing',
      entityId: listing.id,
      meta: { statusChange: `${listing.status} -> ${status}` },
      req,
    });

    res.status(200).json({ message: 'Listing updated successfully.', listing: updated });
  } catch (error) {
    next(error);
  }
};

// Delete listing (admin)
const deleteListing = async (req, res, next) => {
  const { id } = req.params;

  try {
    const listing = await prisma.listing.findUnique({ where: { id } });
    if (!listing) {
      return res.status(404).json({ message: 'Listing not found.' });
    }

    await prisma.listing.delete({ where: { id } });

    logActivity({
      action: 'admin.listing.delete',
      entityType: 'listing',
      entityId: id,
      req,
    });

    res.status(200).json({ message: 'Listing deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

// ── Requirements ──────────────────────────────────────────────────────────
// Get all requirements (admin view) — paged + searchable
const getAllRequirements = async (req, res, next) => {
  try {
    const { status, q, city } = req.query;
    const where = {};

    if (status) where.status = status;
    if (city) where.location = { path: ['city'], equals: city };
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { notes: { contains: q, mode: 'insensitive' } },
      ];
    }

    const { page, limit, skip, take } = parseAdminPagination(req);
    const [requirements, total] = await Promise.all([
      prisma.requirement.findMany({
        where,
        include: { requiredBy: { select: { id: true, name: true, email: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.requirement.count({ where }),
    ]);

    res.status(200).json({
      requirements,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
};

// Edit requirement (admin)
const updateRequirement = async (req, res, next) => {
  const { id } = req.params;

  try {
    const data = buildRequirementData(req.body);
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ message: 'Nothing to update.' });
    }

    const requirement = await prisma.requirement.findUnique({ where: { id } });
    if (!requirement) {
      return res.status(404).json({ message: 'Requirement not found.' });
    }

    const updated = await prisma.requirement.update({
      where: { id },
      data,
      include: { requiredBy: { select: { id: true, name: true, email: true, role: true } } },
    });

    logActivity({
      action: 'admin.requirement.update',
      entityType: 'requirement',
      entityId: requirement.id,
      meta: { title: requirement.title, changedFields: Object.keys(data) },
      req,
    });

    res.status(200).json({ message: 'Requirement updated successfully.', requirement: updated });
  } catch (error) {
    next(error);
  }
};

// Delete requirement (admin) — cascades matches.
const deleteRequirement = async (req, res, next) => {
  const { id } = req.params;

  try {
    const requirement = await prisma.requirement.findUnique({ where: { id } });
    if (!requirement) {
      return res.status(404).json({ message: 'Requirement not found.' });
    }

    await prisma.requirement.delete({ where: { id } });

    logActivity({
      action: 'admin.requirement.delete',
      entityType: 'requirement',
      entityId: id,
      meta: { title: requirement.title },
      req,
    });

    res.status(200).json({ message: 'Requirement deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

// ── Matches (platform-wide, view + delete only) ───────────────────────────
const getAllMatches = async (req, res, next) => {
  try {
    const { type, status } = req.query;
    const where = {};

    if (type) where.type = type;
    if (status) where.status = status;

    const { page, limit, skip, take } = parseAdminPagination(req);
    const [matches, total] = await Promise.all([
      prisma.match.findMany({
        where,
        include: matchInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.match.count({ where }),
    ]);

    res.status(200).json({
      matches,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
};

// Delete match (admin) — never touches matchmaking logic itself.
const deleteMatch = async (req, res, next) => {
  const { id } = req.params;

  try {
    const match = await prisma.match.findUnique({
      where: { id },
      include: {
        property: { select: { id: true, title: true } },
        requirement: { select: { id: true, title: true } },
      },
    });
    if (!match) {
      return res.status(404).json({ message: 'Match not found.' });
    }

    await prisma.match.delete({ where: { id } });

    logActivity({
      action: 'admin.match.delete',
      entityType: 'match',
      entityId: id,
      meta: {
        propertyTitle: match.property?.title,
        requirementTitle: match.requirement?.title,
        type: match.type,
      },
      req,
    });

    res.status(200).json({ message: 'Match deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

// ── Messages ──────────────────────────────────────────────────────────────
// Get all messages (admin view) — content decrypted for readability.
const getAllMessages = async (req, res, next) => {
  try {
    const { q } = req.query;
    const where = {};

    // Plaintext search requires decrypting — skip server-side text filtering
    // and let the client filter instead. `q` is accepted but unused on purpose.

    const { page, limit, skip, take } = parseAdminPagination(req);
    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        include: {
          sender: { select: { id: true, name: true, email: true, role: true } },
          conversation: { select: { id: true, updatedAt: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.message.count({ where }),
    ]);

    const decrypted = messages.map((m) => ({
      ...m,
      content: decryptMessage(m.content),
    }));

    res.status(200).json({
      messages: decrypted,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
};

// Delete message (admin)
const deleteMessage = async (req, res, next) => {
  const { id } = req.params;

  try {
    const message = await prisma.message.findUnique({ where: { id } });
    if (!message) {
      return res.status(404).json({ message: 'Message not found.' });
    }

    await prisma.message.delete({ where: { id } });

    logActivity({
      action: 'admin.message.delete',
      entityType: 'message',
      entityId: id,
      meta: { conversationId: message.conversationId },
      req,
    });

    res.status(200).json({ message: 'Message deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

// ── Activity logs ─────────────────────────────────────────────────────────
// Full platform activity feed — paged, filterable.
const getActivityLogs = async (req, res, next) => {
  try {
    const { action, entityType, userId, q, days } = req.query;
    const where = {};

    if (action) where.action = action;
    if (entityType) where.entityType = entityType;
    if (userId) where.userId = userId;
    if (days) {
      where.createdAt = { gte: new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000) };
    }
    if (q) {
      where.OR = [
        { userName: { contains: q, mode: 'insensitive' } },
        { userEmail: { contains: q, mode: 'insensitive' } },
        { meta: { path: 'title', string_contains: q } },
      ];
    }

    const { page, limit, skip, take } = parseAdminPagination(req);
    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.activityLog.count({ where }),
    ]);

    res.status(200).json({
      logs,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
};

// One user's full action history.
const getUserActivity = async (req, res, next) => {
  const { userId } = req.params;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true } });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const { page, limit, skip, take } = parseAdminPagination(req);
    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.activityLog.count({ where: { userId } }),
    ]);

    res.status(200).json({
      user,
      logs,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
};

// ── Conversations (admin message review) ───────────────────────────────────
// WhatsApp-style admin view: every conversation, its participants, and the
// latest decrypted message. Sorted newest-first.
const getAllConversations = async (req, res, next) => {
  try {
    const conversations = await prisma.conversation.findMany({
      include: {
        participants: {
          select: { id: true, name: true, email: true, role: true, avatar: true },
        },
        _count: { select: { messages: true } },
      },
    });

    const lastByConv = {};
    await Promise.all(
      conversations.map(async (c) => {
        const last = await prisma.message.findFirst({
          where: { conversationId: c.id },
          orderBy: { createdAt: 'desc' },
          include: {
            sender: { select: { id: true, name: true, email: true, role: true, avatar: true } },
          },
        });
        lastByConv[c.id] = last ? { ...last, content: decryptMessage(last.content) } : null;
      }),
    );

    const enriched = conversations.map((c) => ({
      _id: c.id,
      id: c.id,
      participants: c.participants,
      messageCount: c._count.messages,
      updatedAt: c.updatedAt,
      createdAt: c.createdAt,
      lastMessage: lastByConv[c.id],
    }));

    enriched.sort((a, b) => {
      const ta = a.lastMessage?.createdAt
        ? new Date(a.lastMessage.createdAt).getTime()
        : new Date(a.updatedAt).getTime();
      const tb = b.lastMessage?.createdAt
        ? new Date(b.lastMessage.createdAt).getTime()
        : new Date(b.updatedAt).getTime();
      return tb - ta;
    });

    res.status(200).json(enriched);
  } catch (error) {
    next(error);
  }
};

// Full decrypted message thread for one conversation (admin review, read-only).
const getConversationThread = async (req, res, next) => {
  const { id } = req.params;

  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        participants: {
          select: { id: true, name: true, email: true, role: true, avatar: true },
        },
      },
    });
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found.' });
    }

    const messages = await prisma.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: { select: { id: true, name: true, email: true, role: true, avatar: true } },
      },
    });

    const decrypted = messages.map((m) => ({
      ...m,
      _id: m.id,
      content: decryptMessage(m.content),
    }));

    res.status(200).json({ conversation: { ...conversation, _id: conversation.id }, messages: decrypted });
  } catch (error) {
    next(error);
  }
};

// Delete a whole conversation (chat) and all its messages (admin).
const deleteConversation = async (req, res, next) => {
  const { id } = req.params;

  try {
    const conversation = await prisma.conversation.findUnique({ where: { id } });
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found.' });
    }

    // Messages cascade via the FK.
    await prisma.conversation.delete({ where: { id } });

    logActivity({
      action: 'admin.conversation.delete',
      entityType: 'conversation',
      entityId: id,
      req,
    });

    res.status(200).json({ message: 'Conversation deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPlatformStats,
  getAllUsers,
  createUser,
  getUserById,
  updateUser,
  deleteUser,
  manageUser,
  verifyUser,
  suspendUser,
  getAllProperties,
  updateProperty,
  deleteProperty,
  approveProperty,
  rejectProperty,
  getAllListings,
  updateListing,
  deleteListing,
  getAllRequirements,
  updateRequirement,
  deleteRequirement,
  getAllMatches,
  deleteMatch,
  getAllMessages,
  deleteMessage,
  getAllConversations,
  getConversationThread,
  deleteConversation,
  getActivityLogs,
  getUserActivity,
};