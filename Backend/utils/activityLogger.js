/* ActivityLogger — append-only audit trail for admin.
 *
 * Every tracked action on the platform writes one ActivityLog row so the
 * admin panel can show exactly who did what, to which entity, when, and
 * from where. Fire-and-forget: failures are logged to console and never
 * break the underlying request.
 *
 * Usage: logActivity({ action, entityType, entityId, meta, req })
 *   req is optional; when given we snapshot actor identity from req.user
 *   and record the request IP.
 */

const prisma = require('../db/prisma');

const getIp = (req) => {
  if (!req) return null;
  const fwd = req.headers?.['x-forwarded-for'];
  if (typeof fwd === 'string') return fwd.split(',')[0].trim();
  return req.ip || req.socket?.remoteAddress || null;
};

const logActivity = async ({ action, entityType = 'system', entityId = null, meta = null, req = null }) => {
  try {
    const actor = req?.user || null;
    const userSnapshot = actor
      ? { userId: actor.id, userRole: actor.role || null }
      : { userId: null, userRole: null };

    // For anonymous/system writes there's nothing to snapshot; for actor
    // writes we grab a live snapshot of the profile (name/email) so the log
    // stays readable even if the user is later renamed/deleted.
    let userName = null;
    let userEmail = null;
    if (actor?.id) {
      const u = await prisma.user.findUnique({
        where: { id: actor.id },
        select: { name: true, email: true },
      });
      userName = u?.name || null;
      userEmail = u?.email || null;
    }

    await prisma.activityLog.create({
      data: {
        ...userSnapshot,
        userName,
        userEmail,
        action,
        entityType,
        entityId,
        meta: meta === undefined ? null : meta,
        ip: getIp(req),
      },
    });
  } catch (error) {
    console.error('ActivityLog write failed:', error.message);
  }
};

module.exports = { logActivity };