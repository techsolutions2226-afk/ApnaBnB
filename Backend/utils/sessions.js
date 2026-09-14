/* ─── sessions ───
   The per-device layer under User.tokenVersion.

   tokenVersion is a single counter, so incrementing it invalidates EVERY JWT
   the account holds. That is the right behaviour for a password change, a 2FA
   toggle or an admin suspension — and the wrong behaviour for an ordinary
   logout, which should only end the session on the device doing the logging
   out. A Session row gives each sign-in its own identity (`sid` in the JWT) so
   the two cases can be told apart.

   A session is live only when all four hold:
     • the row still exists           (not pruned, user not deleted)
     • revokedAt is null              (explicit logout / "sign out others")
     • expiresAt is in the future     (mirrors the JWT's own 30-day life)
     • tokenVersion matches the user  (no global revocation since it was minted)

   That last one is why no other controller had to change: every existing
   tokenVersion bump strands all of the account's session rows automatically.
*/

// Mirrors the JWT's own `expiresIn: '30d'` — the row must not outlive the
// token it describes, or the devices list would show sessions that cannot
// actually be used.
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/* lastSeenAt exists to render "last active 5 minutes ago" on the devices
   list, which does not need per-request precision. Writing on every
   authenticated request would add a DB write to every call in the app, so the
   touch is throttled to this interval. */
const TOUCH_INTERVAL_MS = 5 * 60 * 1000;

/* Best-effort client IP — the one place the app derives it. Express already
   resolves req.ip correctly behind Render's proxy (index.js sets `trust proxy`
   in production), so a client-supplied X-Forwarded-For cannot spoof it. */
const clientIp = (req) => String(req?.ip || req?.socket?.remoteAddress || '').slice(0, 45);

const clientUserAgent = (req) =>
  String(req?.headers?.['user-agent'] || '').slice(0, 255);

/* Opens a session for a sign-in that has already been fully authorised.
   Callers pass the user row they just validated; `tokenVersion` is captured
   so a later global revocation strands this row. */
const createSession = async (prisma, user, req) =>
  prisma.session.create({
    data: {
      userId: user.id,
      tokenVersion: user.tokenVersion ?? 0,
      userAgent: clientUserAgent(req),
      ip: clientIp(req),
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  });

/* The liveness test, shared by the REST middleware and the socket handshake so
   the two can never disagree about whether a session is still usable. */
const isSessionLive = (session, userTokenVersion) =>
  !!session &&
  !session.revokedAt &&
  session.expiresAt > new Date() &&
  session.tokenVersion === (userTokenVersion ?? 0);

/* A human label for the devices list. Deliberately coarse: the point is "is
   this the phone or the laptop I left at the office", not analytics. */
const describeDevice = (userAgent = '') => {
  const ua = String(userAgent);
  if (!ua) return 'Unknown device';

  const browser =
    /Edg\//.test(ua) ? 'Edge'
      : /OPR\/|Opera/.test(ua) ? 'Opera'
        : /Chrome\//.test(ua) && !/Chromium/.test(ua) ? 'Chrome'
          : /Firefox\//.test(ua) ? 'Firefox'
            : /Safari\//.test(ua) ? 'Safari'
              : 'Browser';

  const os =
    /Windows/.test(ua) ? 'Windows'
      : /Android/.test(ua) ? 'Android'
        : /iPhone|iPad|iPod/.test(ua) ? 'iOS'
          : /Mac OS X|Macintosh/.test(ua) ? 'macOS'
            : /Linux/.test(ua) ? 'Linux'
              : '';

  return os ? `${browser} on ${os}` : browser;
};

module.exports = {
  SESSION_TTL_MS,
  TOUCH_INTERVAL_MS,
  clientIp,
  createSession,
  isSessionLive,
  describeDevice,
};
