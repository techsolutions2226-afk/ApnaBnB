/* AuditActivity — global, additive audit of every mutating API action.
 *
 * Mounted ONCE in index.js. It listens to the response stream and writes one
 * ActivityLog row per successful (2xx/3xx) mutating request (POST/PUT/PATCH/
 * DELETE) on /api/*, deriving a readable action name from the path:
 *
 *   POST   /api/properties          -> property.create
 *   PUT    /api/properties/:id      -> property.update
 *   DELETE /api/properties/:id      -> property.delete
 *   PUT    /api/matches/:id/accept  -> match.accept
 *   POST   /api/auth/login          -> auth.login
 *
 * Skipped intentionally so we never double-log:
 *   - /api/admin   — adminController explicitly logs rich admin.* rows.
 *   - /api/auth/register — authController already logs auth.register.
 *   - GET/HEAD/OPTIONS (reads, not actions).
 *
 * Fire-and-forget: a failed log write never breaks the underlying request.
 */

const { logActivity } = require('../utils/activityLogger');

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const METHOD_VERBS = { POST: 'create', PUT: 'update', PATCH: 'update', DELETE: 'delete' };

// Sub-actions that appear as a trailing path segment (e.g. .../accept).
const SUB_ACTIONS = new Set([
  'accept', 'reject', 'close', 'verify', 'suspend', 'manage',
  'approve', 'complete', 'resend', 'read', 'hidden', 'report',
  'delete', 'archive', 'cancel', 'upgrade', 'owner-of',
]);

const parsePath = (path) => {
  const segs = path.split('/').filter(Boolean);
  // Strip the leading "api" segment (middleware is mounted at root, so
  // req.path includes /api).
  if (segs[0] === 'api') return segs.slice(1);
  return segs;
};

const deriveAction = (method, path) => {
  const [entity = 'system', seg1, seg2] = parsePath(path);
  if (seg2 && SUB_ACTIONS.has(seg2)) return `${entity}.${seg2}`;   // /:id/action
  if (seg1 && SUB_ACTIONS.has(seg1)) return `${entity}.${seg1}`;   // direct sub-action
  if (seg1 && /^[a-f0-9-]+$/i.test(seg1)) return `${entity}.${METHOD_VERBS[method] || 'update'}`;
  if (seg1) return `${entity}.${seg1}`;                            // e.g. auth.login, search
  return `${entity}.${METHOD_VERBS[method] || 'update'}`;
};

const deriveEntity = (path) => parsePath(path)[0] || 'system';

const deriveEntityId = (path) => {
  const [, seg1, seg2] = parsePath(path);
  if (seg2 && /^[a-f0-9-]+$/i.test(seg2)) return seg2;             // /:id/action
  if (seg1 && /^[a-f0-9-]+$/i.test(seg1) && !SUB_ACTIONS.has(seg1)) return seg1;
  return null;
};

const auditActivity = (req, res, next) => {
  if (!MUTATING_METHODS.has(req.method)) return next();
  const { path } = req;

  if (path.startsWith('/api/admin')) return next();
  if (path === '/api/auth/register') return next();

  res.on('finish', () => {
    if (res.statusCode >= 400) return; // only successful actions

    const actionName = deriveAction(req.method, req.path);
    logActivity({
      action: actionName,
      entityType: deriveEntity(req.path),
      entityId: deriveEntityId(req.path),
      ip: null,
      req,
    });
  });

  next();
};

module.exports = auditActivity;