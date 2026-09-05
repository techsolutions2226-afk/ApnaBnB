/* ─── notifier — writes in-app notifications ───
 *
 * A sibling of utils/activityLogger, not a wrapper around it. logActivity
 * records who ACTED; a notification is addressed to a RECIPIENT and carries
 * read state. For most events the recipient is not req.user, so the two cannot
 * share a call.
 *
 * Every entry point is fire-and-forget: failures are logged and swallowed, so a
 * notification write can never fail the request that triggered it. Same contract
 * as utils/matchNotifier, whose notifyInBackground/appUrl helpers are reused
 * rather than reimplemented.
 * ─────────────────────────────────────────────── */

const prisma = require('../db/prisma');
const { appUrl } = require('./matchNotifier');
const { emitToUser } = require('../sockets');

/* Notification types. Keeping them in one place stops the client and server
   drifting on string literals, and gives the bell a known icon per type. */
const TYPES = {
  MATCH_CREATED: 'match.created',
  MATCH_ACCEPTED: 'match.accepted',
  MATCH_REJECTED: 'match.rejected',
  LISTING_CREATED: 'listing.created',
  PROPERTY_CREATED: 'property.created',
  PROPERTY_APPROVED: 'property.approved',
  PROPERTY_REJECTED: 'property.rejected',
  REQUIREMENT_CREATED: 'requirement.created',
  PAYMENT_APPROVED: 'payment.approved',
  PAYMENT_REJECTED: 'payment.rejected',
  PLAN_ACTIVATED: 'plan.activated',
  VISIT_BOOKED: 'visit.booked',
  VISIT_PROPOSED: 'visit.proposed',
  VISIT_SCHEDULE_REQUESTED: 'visit.schedule_requested',
  VISIT_CONFIRMED: 'visit.confirmed',
  VISIT_CANCELLED: 'visit.cancelled',
  REVIEW_RECEIVED: 'review.received',
  ACCOUNT_VERIFIED: 'account.verified',
  ACCOUNT_SUSPENDED: 'account.suspended',
  ACCOUNT_REACTIVATED: 'account.reactivated',
};

/* Build one row. Returns null when the notification should be skipped, which is
   how self-notification is suppressed — you are never told about your own
   action. Same rule as matchNotifier's self-match skip. */
const buildRow = ({
  recipientId,
  actorId = null,
  type,
  title,
  body,
  link = null,
  entityType = null,
  entityId = null,
  meta = null,
  allowSelf = false,
}) => {
  if (!recipientId || !type || !title) return null;
  if (!allowSelf && actorId && actorId === recipientId) return null;
  return {
    recipientId,
    actorId,
    type,
    title,
    body: body || '',
    link,
    entityType,
    entityId,
    meta,
  };
};

/* Write a single notification and push it to any live socket for that user.
   Awaitable, but callers should normally hand it to notifyInBackground. */
const notifyUser = async (input) => {
  const row = buildRow(input);
  if (!row) return null;
  const created = await prisma.notification.create({ data: row });
  emitToUser(row.recipientId, 'notification:new', created);
  return created;
};

/* Batch variant. createMany does not return rows, so the socket payload is a
   lightweight nudge — the client refetches on it. Avoids N inserts when a new
   listing matches a dozen requirements at once. */
const notifyUsers = async (inputs = []) => {
  const rows = inputs.map(buildRow).filter(Boolean);
  if (!rows.length) return 0;
  await prisma.notification.createMany({ data: rows });
  for (const recipientId of new Set(rows.map((r) => r.recipientId))) {
    emitToUser(recipientId, 'notification:refresh', { reason: 'batch' });
  }
  return rows.length;
};

/* Fire-and-forget forms — the shape controllers should use. Never reject. */
const notifyUserInBackground = (input) => {
  notifyUser(input).catch((err) =>
    console.error('Notification write failed:', err.message),
  );
};

const notifyUsersInBackground = (inputs) => {
  notifyUsers(inputs).catch((err) =>
    console.error('Notification batch write failed:', err.message),
  );
};

module.exports = {
  TYPES,
  appUrl,
  notifyUser,
  notifyUsers,
  notifyUserInBackground,
  notifyUsersInBackground,
};
