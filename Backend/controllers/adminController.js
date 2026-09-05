const bcrypt = require('bcrypt');
const prisma = require('../db/prisma');
const { logActivity } = require('../utils/activityLogger');
const { sendSecurityAlertEmail } = require('../utils/mailer');
const { notifyUserInBackground, TYPES } = require('../utils/notifier');
const cache = require('../utils/cache');

const STATS_CACHE_KEY = 'admin:stats:v3';
const STATS_TTL_MS = 60_000;

// ── Shared selectors ──────────────────────────────────────────────────────
const userSelect = { omit: { password: true } };

// Everything the admin Users tab shows per row: profile fields, listing/
// requirement counts and the user's latest APPROVED plan (subscription).
const adminUserListSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  viewRole: true,
  verified: true,
  suspended: true,
  // Self-deactivation, distinct from an admin suspension: the USER did this
  // to themselves, and an admin can reverse it.
  deactivated: true,
  deactivatedAt: true,
  avatar: true,
  phone: true,
  location: true,
  latitude: true,
  longitude: true,
  emergencyContact: true,
  lastSeenAt: true,
  createdAt: true,
  updatedAt: true,

  // Two-factor state. `twoFactorSecret` and `twoFactorRecoveryCodes` are
  // NEVER selected — see withSecretStatus below for why.
  twoFactorEnabled: true,
  twoFactorMethod: true,
  loginAlertsEnabled: true,

  // Expiry/attempt metadata only. The matching *Hash columns hold live
  // credentials and are deliberately absent from this select.
  otpExpiresAt: true,
  otpAttempts: true,
  otpLastSentAt: true,
  resetPasswordExpiresAt: true,
  resetPasswordLastSentAt: true,
  twoFactorChallengeExpiresAt: true,
  twoFactorChallengeAttempts: true,
  twoFactorCodeExpiresAt: true,
  twoFactorCodeLastSentAt: true,

  _count: { select: { listings: true, requirements: true } },
  payments: {
    where: { status: 'approved' },
    orderBy: { createdAt: 'desc' },
    take: 1,
    select: {
      planId: true,
      planName: true,
      billingCycle: true,
      amount: true,
      currency: true,
      createdAt: true,
    },
  },
};

// Attach the latest approved payment as a flat `plan` field (or null).
const withPlan = (u) => ({
  ...u,
  plan: u.payments && u.payments.length > 0 ? u.payments[0] : null,
  payments: undefined,
});

/* Turns credential columns into a STATUS the admin table can render, without
   ever putting the credential itself on the wire.

   These seven columns are the account-takeover set:
     password, twoFactorSecret, twoFactorRecoveryCodes,
     otpHash, resetPasswordTokenHash, twoFactorChallengeHash, twoFactorCodeHash

   `twoFactorSecret` is the sharpest: it is the TOTP seed, so anyone holding
   it can generate valid second-factor codes forever. Shipping it to the
   browser would defeat the very 2FA this panel administers. The others are
   crackable offline or directly replayable.

   So the admin sees "is it set / when does it expire", never the value. The
   raw columns are not even selected from the database, so there is nothing to
   leak through a stray log line or a network trace. */
const liveAt = (expiresAt) => {
  if (!expiresAt) return null;
  return new Date(expiresAt) > new Date() ? 'active' : 'expired';
};

const withSecretStatus = (u) => ({
  ...u,

  // Always present; the column exists to confirm a password is set at all.
  passwordStatus: 'set',

  twoFactorSecretStatus:
    u.twoFactorEnabled && u.twoFactorMethod === 'totp' ? 'set' : null,

  // Pending email-verification OTP.
  otpStatus: liveAt(u.otpExpiresAt),

  // In-flight forgot-password link.
  resetTokenStatus: liveAt(u.resetPasswordExpiresAt),

  // A half-finished 2FA login (password accepted, code not yet entered).
  twoFactorChallengeStatus: liveAt(u.twoFactorChallengeExpiresAt),
  twoFactorCodeStatus: liveAt(u.twoFactorCodeExpiresAt),
});

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
  if (body.emergencyContact !== undefined) data.emergencyContact = body.emergencyContact;
  if (body.avatar !== undefined) data.avatar = body.avatar;
  if (body.verified !== undefined) data.verified = Boolean(body.verified);
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
    /* Live Postgres aggregates. TTL cache keeps the admin dashboard snappy;
       pass ?fresh=1 (Refresh button) to skip it. */
    const forceFresh =
      req.query.fresh === '1' ||
      req.query.fresh === 'true' ||
      String(req.headers['cache-control'] || '').includes('no-cache');

    if (!forceFresh) {
      const cached = cache.get(STATS_CACHE_KEY);
      if (cached) return res.status(200).json(cached);
    } else {
      cache.del(STATS_CACHE_KEY);
    }

    // Parallel batch — these are cheap COUNTs/groupBys. Kept to 7 queries so
    // we stay under the Prisma pool cap (6) with only brief queueing.
    const [
      totalSuspended,
      totalListings,
      totalRequirements,
      totalMatches,
      totalReviews,
      roleGroups,
      statusGroups,
    ] = await Promise.all([
      prisma.user.count({ where: { suspended: true } }),
      prisma.listing.count(),
      prisma.requirement.count(),
      prisma.match.count(),
      prisma.review.count(),
      prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
      prisma.property.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);

    const usersByRole = roleGroups.map((g) => ({ _id: g.role, count: g._count._all }));
    const listingsByStatus = statusGroups.map((g) => ({ _id: g.status, count: g._count._all }));
    const totalUsers = usersByRole.reduce((n, r) => n + r.count, 0);
    const totalProperties = listingsByStatus.reduce((n, s) => n + s.count, 0);
    const totalActiveProperties =
      listingsByStatus.find((s) => s._id === 'active')?.count || 0;

    const payload = {
      totalUsers,
      totalSuspended,
      totalProperties,
      totalActiveProperties,
      totalListings,
      totalRequirements,
      totalMatches,
      totalReviews,
      usersByRole,
      listingsByStatus,
      generatedAt: new Date().toISOString(),
    };
    cache.set(STATS_CACHE_KEY, payload, STATS_TTL_MS);
    res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
};

// ── Users ─────────────────────────────────────────────────────────────────
// Get all users (paged + searchable by name/email)
const getAllUsers = async (req, res, next) => {
  try {
    const { role, verified, suspended, deactivated, q } = req.query;
    const where = {};

    if (role) where.role = role;
    if (verified !== undefined) where.verified = verified === 'true';
    if (suspended !== undefined) where.suspended = suspended === 'true';
    if (deactivated !== undefined) where.deactivated = deactivated === 'true';
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }

    const { page, limit, skip, take } = parseAdminPagination(req);
    const [rows, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: adminUserListSelect,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.user.count({ where }),
    ]);
    const users = rows.map((row) => withSecretStatus(withPlan(row)));

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
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        ...adminUserListSelect,
        // Their listings with enough property context to identify each row.
        // IDs are rendered as clickable links to /listing/:id on the client.
        listings: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            status: true,
            views: true,
            inquiries: true,
            createdAt: true,
            property: {
              select: {
                id: true,
                title: true,
                purpose: true,
                category: true,
                price: true,
                photos: true,
              },
            },
          },
        },
        requirements: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            status: true,
            purpose: true,
            propertyType: true,
            budget: true,
            location: true,
            createdAt: true,
          },
        },
      },
    });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const [matchesCount, activity] = await Promise.all([
      prisma.match.count({ where: { initiatorId: id } }),
      prisma.activityLog.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
    ]);

    res.status(200).json({
      user: withPlan(user),
      activity: {
        listings: user.listings.length,
        requirements: user.requirements.length,
        matches: matchesCount,
        logs: activity,
      },
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

// Edit user (name/email/role/phone/location/avatar/verified + optional
// password reset).
const updateUser = async (req, res, next) => {
  const { id } = req.params;

  try {
    const data = buildUserData(req.body);
    // Optional password reset — admin types a new password to override it.
    if (req.body.password) data.password = await bcrypt.hash(String(req.body.password), 10);
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

    notifyUserInBackground({
      recipientId: user.id,
      type: TYPES.ACCOUNT_VERIFIED,
      title: 'Account verified',
      body: 'Your account has been verified. Everything is unlocked.',
      link: '/dashboard',
      entityType: 'user',
      entityId: user.id,
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

    /* Without this the user is simply locked out at login with no explanation. */
    notifyUserInBackground({
      recipientId: user.id,
      type: TYPES.ACCOUNT_SUSPENDED,
      title: 'Account suspended',
      body: reason
        ? `Your account was suspended: ${reason}`
        : 'Your account has been suspended. Contact support for details.',
      link: '/contact',
      entityType: 'user',
      entityId: user.id,
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

/* Reactivate an account the USER deactivated from Login & security.

   Deliberately separate from verifyUser/unsuspend: an admin suspension and a
   self-deactivation are different states with different causes, and clearing
   one must never silently clear the other. This only lifts `deactivated`. */
const reactivateUser = async (req, res, next) => {
  const { id } = req.params;
  try {
    const existing = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, deactivated: true },
    });
    if (!existing) return res.status(404).json({ message: 'User not found.' });
    if (!existing.deactivated) {
      return res.status(400).json({
        code: 'NOT_DEACTIVATED',
        message: 'This account is not deactivated.',
      });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { deactivated: false, deactivatedAt: null },
      ...userSelect,
    });

    // Tell the account owner their access is back. Never blocks the action.
    sendSecurityAlertEmail(
      user.email,
      'Your account was reactivated',
      'An administrator has reactivated your account. You can sign in again.',
      user.name,
    ).catch(() => {});

    logActivity({
      action: 'admin.user.reactivate',
      entityType: 'user',
      entityId: user.id,
      meta: { email: user.email },
      req,
    });

    res.status(200).json({ message: 'User reactivated successfully.', user });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'User not found.' });
    }
    next(error);
  }
};

/* Lifts an ADMIN suspension, and nothing else.

   Distinct from verifyUser (which also sets `verified`) and from
   reactivateUser (which lifts a self-deactivation). Keeping the three
   separate means an admin action can never silently clear a state it was
   not aimed at. */
const unsuspendUser = async (req, res, next) => {
  const { id } = req.params;
  try {
    const existing = await prisma.user.findUnique({
      where: { id },
      select: { id: true, suspended: true },
    });
    if (!existing) return res.status(404).json({ message: 'User not found.' });
    if (!existing.suspended) {
      return res.status(400).json({
        code: 'NOT_SUSPENDED',
        message: 'This account is not suspended.',
      });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { suspended: false },
      ...userSelect,
    });

    sendSecurityAlertEmail(
      user.email,
      'Your account suspension was lifted',
      'An administrator has lifted the suspension on your account. You can sign in again.',
      user.name,
    ).catch(() => {});

    logActivity({
      action: 'admin.user.unsuspend',
      entityType: 'user',
      entityId: user.id,
      meta: { email: user.email },
      req,
    });

    res.status(200).json({ message: 'Suspension lifted.', user });
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

    cache.del(STATS_CACHE_KEY);

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

    cache.del(STATS_CACHE_KEY);

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

    cache.del(STATS_CACHE_KEY);

    notifyUserInBackground({
      recipientId: property.listedById,
      type: TYPES.PROPERTY_APPROVED,
      title: 'Property approved',
      body: `${property.title} is now live and visible to buyers.`,
      link: '/my-listings',
      entityType: 'property',
      entityId: property.id,
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

    cache.del(STATS_CACHE_KEY);

    notifyUserInBackground({
      recipientId: property.listedById,
      type: TYPES.PROPERTY_REJECTED,
      title: 'Property rejected',
      body: reason
        ? `${property.title} was rejected: ${reason}`
        : `${property.title} was rejected. Please review it and resubmit.`,
      link: '/my-listings',
      entityType: 'property',
      entityId: property.id,
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

// ── Visit overview ─────────────────────────────────────────────────────────
const VISIT_STATUSES = ['upcoming', 'checked_in', 'completed', 'cancelled'];

/* Effective visit outcome — mirrors tripController.effectiveOutcome so the
   admin sees the same classification the user-facing Visits pages apply:
   success after a completed visit, no_show when a confirmed past date passed
   without a check-in, cancelled otherwise. */
const visitOutcome = (trip) => {
  if (trip.outcome && trip.outcome !== 'pending') return trip.outcome;
  if (trip.status === 'cancelled') return 'cancelled';
  if (trip.status === 'completed') return 'success';
  const date =
    trip.visitorProposal?.date || trip.ownerProposal?.date || trip.checkIn || null;
  if (trip.status === 'upcoming' && date) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    if (new Date(`${date}T00:00:00`) < todayStart) return 'no_show';
  }
  return trip.outcome || 'pending';
};

/* Global platform visit counts (across ALL visits, not just the current page),
   chipped into the summary cards on the admin Visits page. */
const summarizeVisits = (rows) => {
  const counts = {
    total: rows.length,
    success: 0,
    unsuccessful: 0,
    upcoming: 0,
    checked_in: 0,
    completed: 0,
    cancelled: 0,
  };
  rows.forEach((trip) => {
    if (trip.status === 'upcoming') counts.upcoming += 1;
    else if (trip.status === 'checked_in') counts.checked_in += 1;
    else if (trip.status === 'completed') counts.completed += 1;
    else if (trip.status === 'cancelled') counts.cancelled += 1;

    const outcome = visitOutcome(trip);
    if (outcome === 'success') counts.success += 1;
    else if (outcome === 'cancelled' || outcome === 'no_show') counts.unsuccessful += 1;
  });
  return counts;
};

// Platform-wide visits — every trip with its buyer (who scheduled the visit),
// the property owner, the property itself, status, schedule and check-in trail.
// Searchable by buyer/owner/property/code, paged, filterable by status.
const getAllTrips = async (req, res, next) => {
  try {
    const { status, q } = req.query;
    const where = {};

    if (status && VISIT_STATUSES.includes(status)) where.status = status;

    if (q && String(q).trim()) {
      const term = String(q).trim();
      where.OR = [
        { user: { name: { contains: term, mode: 'insensitive' } } },
        { user: { email: { contains: term, mode: 'insensitive' } } },
        { user: { phone: { contains: term, mode: 'insensitive' } } },
        { property: { title: { contains: term, mode: 'insensitive' } } },
        { property: { listedBy: { name: { contains: term, mode: 'insensitive' } } } },
        { property: { listedBy: { email: { contains: term, mode: 'insensitive' } } } },
        { confirmationCode: { contains: term, mode: 'insensitive' } },
      ];
    }

    const { page, limit, skip, take } = parseAdminPagination(req);

    const [trips, total, countRows] = await Promise.all([
      prisma.trip.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              role: true,
              avatar: true,
            },
          },
          property: {
            select: {
              id: true,
              title: true,
              photos: true,
              location: true,
              price: true,
              listedById: true,
              listedBy: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                  role: true,
                  avatar: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.trip.count({ where }),
      prisma.trip.findMany({
        select: {
          status: true,
          outcome: true,
          visitorProposal: true,
          ownerProposal: true,
          checkIn: true,
        },
      }),
    ]);

    const shaped = trips.map((trip) => ({
      ...trip,
      effectiveOutcome: visitOutcome(trip),
    }));

    res.status(200).json({
      trips: shaped,
      total,
      page,
      pages: Math.ceil(total / limit),
      counts: summarizeVisits(countRows),
    });
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

// ── Section activity counts (admin sidebar badges) ────────────────────────
/* The admin panel has no notification inbox, so the sidebar badges count
   "newest unviewed items": how many rows were created in a section since the
   admin's most recent visit to it. The `since` epoch ms comes from the client
   (stored per-section in localStorage) and defaults to "all time" when absent.
   Returns { visits, matches } mirrors the sidebar sections. */
const getSectionActivityCounts = async (req, res, next) => {
  try {
    const sinceMatch =
      req.query.matchesSince && !Number.isNaN(Number(req.query.matchesSince))
        ? new Date(Number(req.query.matchesSince))
        : undefined;
    const sinceVisits =
      req.query.visitsSince && !Number.isNaN(Number(req.query.visitsSince))
        ? new Date(Number(req.query.visitsSince))
        : undefined;

    const [newMatches, newVisits] = await Promise.all([
      prisma.match.count({
        where: sinceMatch ? { createdAt: { gt: sinceMatch } } : {},
      }),
      prisma.trip.count({
        where: sinceVisits ? { createdAt: { gt: sinceVisits } } : {},
      }),
    ]);

    res.status(200).json({ matches: newMatches, visits: newVisits });
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
  reactivateUser,
  unsuspendUser,
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
  getAllTrips,
  getActivityLogs,
  getUserActivity,
  getSectionActivityCounts,
};