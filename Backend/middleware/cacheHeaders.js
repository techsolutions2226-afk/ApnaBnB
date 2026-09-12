/* ─── cacheHeaders — Cache-Control + ETag ───
 *
 * The app sets no cache headers at all today, so every response is a full 200
 * even when nothing changed. This adds two behaviours:
 *
 *   Public GETs      -> short max-age + ETag, so the browser and any edge in
 *                       front of Render can answer repeats with 304.
 *   Everything else  -> private, no-store.
 *
 * The default is the SAFE one: anything not explicitly listed as public is
 * treated as private. A cache header that leaks one user's dashboard to
 * another is far worse than a missing optimisation, so this must never be
 * opt-out.
 * ─────────────────────────────────────────────── */

// Public, identical-for-everyone reads. Prefix match on the path.
// /api/properties is intentionally excluded: listing photos change often via
// admin/seller edits and must not sit in browser/edge caches after updates.
const PUBLIC_GET_PREFIXES = ['/api/plans', '/api/contact'];

const PUBLIC_MAX_AGE = 60; // seconds

const isPublicGet = (req) => {
  if (req.method !== 'GET') return false;
  // An Authorization header means the response may be user-specific even on an
  // otherwise public path — never let that reach a shared cache.
  if (req.headers.authorization) return false;
  return PUBLIC_GET_PREFIXES.some((p) => req.path.startsWith(p));
};

const cacheHeaders = (req, res, nextFn) => {
  if (isPublicGet(req)) {
    res.set(
      'Cache-Control',
      `public, max-age=${PUBLIC_MAX_AGE}, stale-while-revalidate=30`,
    );
  } else {
    res.set('Cache-Control', 'private, no-store');
  }
  nextFn();
};

module.exports = cacheHeaders;
module.exports.PUBLIC_GET_PREFIXES = PUBLIC_GET_PREFIXES;
module.exports.isPublicGet = isPublicGet;
