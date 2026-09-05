/* ─── Notifications — the authenticated user's inbox ───
 *
 * Every handler is scoped to recipientId === req.user.id. The scoping lives in
 * the `where` clause of each query rather than in a check after the fetch, so a
 * foreign id simply matches nothing — there is no path that reads or mutates
 * another user's row.
 * ─────────────────────────────────────────────── */

const prisma = require('../db/prisma');
const { parsePagination, paginated } = require('../utils/pagination');

// GET /api/notifications?page&limit&unread=true
const getNotifications = async (req, res, next) => {
  try {
    const { enabled, page, limit, skip, take } = parsePagination(req);
    const where = { recipientId: req.user.id };
    if (req.query.unread === 'true') where.read = false;

    const [rows, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.notification.count({ where }),
    ]);

    res.status(200).json(enabled ? paginated(rows, total, page, limit) : rows);
  } catch (error) {
    next(error);
  }
};

// GET /api/notifications/unread-count — drives the bell badge.
const getUnreadCount = async (req, res, next) => {
  try {
    const count = await prisma.notification.count({
      where: { recipientId: req.user.id, read: false },
    });
    res.status(200).json({ count });
  } catch (error) {
    next(error);
  }
};

// GET /api/notifications/unread-by-type — unread counts grouped by entityType,
// so sidebar sections (Visits=trip, Matches=match, ...) can each show their own
// dynamic badge that clears when the user views that section.
const getUnreadByType = async (req, res, next) => {
  try {
    const rows = await prisma.notification.groupBy({
      by: ['entityType'],
      where: { recipientId: req.user.id, read: false },
      _count: true,
    });
    const counts = {};
    for (const row of rows) {
      if (row.entityType) counts[row.entityType] = row._count;
    }
    res.status(200).json({ counts });
  } catch (error) {
    next(error);
  }
};

// POST /api/notifications/read-all — clears the badge in one call.
const markAllRead = async (req, res, next) => {
  try {
    const { count } = await prisma.notification.updateMany({
      where: { recipientId: req.user.id, read: false },
      data: { read: true, readAt: new Date() },
    });
    res.status(200).json({ updated: count });
  } catch (error) {
    next(error);
  }
};

/* POST /api/notifications/read — mark a specific set read.
   Used when the bell panel opens: only what the user actually saw is marked,
   rather than silently clearing notifications further down the list. */
const markManyRead = async (req, res, next) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter(Boolean) : [];
    if (!ids.length) return res.status(200).json({ updated: 0 });

    const { count } = await prisma.notification.updateMany({
      // recipientId in the filter is the authorization check.
      where: { id: { in: ids }, recipientId: req.user.id, read: false },
      data: { read: true, readAt: new Date() },
    });
res.status(200).json({ updated: count });
  } catch (error) {
    next(error);
  }
};

// POST /api/notifications/read-by-type — clears one whole section's badge
// (e.g. all unread travel/visit notifications) when the user opens that
// section of the sidebar.
const markTypeRead = async (req, res, next) => {
  try {
    const { entityType } = req.body;
    if (!entityType) return res.status(400).json({ message: 'entityType is required.' });
    const { count } = await prisma.notification.updateMany({
      where: { recipientId: req.user.id, read: false, entityType },
      data: { read: true, readAt: new Date() },
    });
    res.status(200).json({ updated: count });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/notifications/:id/read
const markRead = async (req, res, next) => {
  try {
    const { count } = await prisma.notification.updateMany({
      where: { id: req.params.id, recipientId: req.user.id },
      data: { read: true, readAt: new Date() },
    });
    if (!count) return res.status(404).json({ message: 'Notification not found.' });
    res.status(200).json({ updated: count });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/notifications/:id
const deleteNotification = async (req, res, next) => {
  try {
    const { count } = await prisma.notification.deleteMany({
      where: { id: req.params.id, recipientId: req.user.id },
    });
    if (!count) return res.status(404).json({ message: 'Notification not found.' });
    res.status(200).json({ deleted: count });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  getUnreadByType,
  markAllRead,
  markTypeRead,
  markManyRead,
  markRead,
  deleteNotification,
};

