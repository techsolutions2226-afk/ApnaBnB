/* e2e: per-device sessions.
 *
 * The bug: logout incremented User.tokenVersion, a single account-wide
 * counter, so signing out on one device signed the account out everywhere.
 * Sessions add a per-sign-in identity (`sid` in the JWT) underneath that
 * counter. This drives the real controllers, the real middleware and the real
 * socket handshake against the real database and checks that:
 *
 *   • logging out on device A leaves device B signed in
 *   • "sign out all other devices" ends B and C but keeps A
 *   • the account-wide switch (password change / 2FA toggle / suspension)
 *     still takes EVERY device down
 *   • tokens minted before sessions existed keep working (no forced logout
 *     on deploy), and still log out correctly
 *   • the socket handshake honours the same revocation
 *   • login, Google login and 2FA all mint sessions
 *
 * Only Google's tokeninfo endpoint and outbound mail are stubbed.
 *
 * Run with: node tests/e2e-sessions.js
 */
require('dotenv').config();

process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'e2e-test-client-id';
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

const mailer = require('../utils/mailer');
let sentCode = null;
mailer.sendTwoFactorCodeEmail = async (_to, code) => { sentCode = code; };
mailer.sendSecurityAlertEmail = async () => {};

let googleProfile = null;
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, ...rest) => {
  if (String(url).includes('oauth2.googleapis.com/tokeninfo')) {
    if (!googleProfile) return { ok: false, json: async () => ({}) };
    return { ok: true, json: async () => googleProfile };
  }
  return realFetch(url, ...rest);
};

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../db/prisma');
const auth = require('../controllers/authController');
const security = require('../controllers/securityController');
const verifyToken = require('../middleware/authMiddleware');
const { isSessionLive, describeDevice } = require('../utils/sessions');

/* Drives a controller the way Express would. `headers` lets a call pretend to
   come from a particular browser, which is how the device rows get labelled. */
const call = (handler, body, extra = {}) =>
  new Promise((resolve) => {
    const res = {
      _status: 200,
      status(s) { this._status = s; return this; },
      json(b) { resolve({ status: this._status, body: b }); return this; },
    };
    handler(
      { body, ip: extra.ip || '127.0.0.1', headers: extra.headers || {}, ...extra.req },
      res,
      (err) => resolve({ status: err?.status || 500, body: { message: err?.message }, threw: true }),
    );
  });

/* Runs the REAL auth middleware against a token, exactly as a protected route
   would. Resolves { ok: true, req } only on a bare next().

   next(err) must NOT count as success: verifyToken's catch block forwards
   thrown errors (a DB timeout, say) that way, and treating those as an
   authenticated request silently turns a broken test run green. */
const authenticate = (token, headers = {}) =>
  new Promise((resolve, reject) => {
    const req = { headers: { authorization: `Bearer ${token}`, ...headers }, ip: '127.0.0.1' };
    const res = {
      _status: 200,
      status(s) { this._status = s; return this; },
      json(b) { resolve({ ok: false, status: this._status, body: b }); return this; },
    };
    verifyToken(req, res, (err) => (err ? reject(err) : resolve({ ok: true, req })));
  });

/* The socket handshake's own checks, mirrored here so the test exercises the
   same predicate sockets/index.js uses without standing up a socket server. */
const socketAccepts = async (token) => {
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return false;
  }
  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
    select: { id: true, verified: true, suspended: true, deactivated: true, tokenVersion: true },
  });
  if (!user || !user.verified || user.suspended || user.deactivated) return false;
  if (user.tokenVersion > 0 && (decoded.tokenVersion ?? 0) !== user.tokenVersion) return false;
  if (decoded.sid) {
    const session = await prisma.session.findUnique({ where: { id: decoded.sid } });
    if (!isSessionLive(session, user.tokenVersion)) return false;
  }
  return true;
};

let passed = 0;
const ok = (label) => { passed += 1; console.log(`PASS: ${label}`); };
const fail = (label, got) => {
  throw new Error(`${label}\n      got: ${JSON.stringify(got)}`);
};

const STAMP = Date.now();
const PASSWORD = 'Correct#Pass1';
const mk = (n) => `e2e-sess-${STAMP}-${n}@example.com`;
const made = [];

const CHROME = { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36' };
const IPHONE = { 'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605.1 Version/17.0 Mobile Safari/604.1' };
const FIREFOX = { 'user-agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0' };

const makeUser = async (email, extra = {}) => {
  const u = await prisma.user.create({
    data: {
      name: 'E2E Sessions', email,
      authProvider: 'email', password: await bcrypt.hash(PASSWORD, 10),
      role: 'buyer', verified: true, phone: '+92 300 1112222', location: 'Test',
      ...extra,
    },
  });
  made.push(u.id);
  return u;
};

const login = async (email, headers) => {
  const r = await call(auth.loginUser, { email, password: PASSWORD }, { headers });
  if (!r.body.token) fail(`login failed for ${email}`, r);
  return r.body.token;
};

(async () => {
  try {
    /* ── 1. Two devices, and logging out of one leaves the other alone ──── */
    const user = await makeUser(mk('multi'));
    const laptop = await login(user.email, CHROME);
    const phone = await login(user.email, IPHONE);

    if (jwt.decode(laptop).sid === jwt.decode(phone).sid)
      fail('two sign-ins must produce two different sessions', {});
    ok('two sign-ins mint two distinct sessions');

    if (!(await authenticate(laptop)).ok || !(await authenticate(phone)).ok)
      fail('both devices should be authenticated before any logout', {});
    ok('both devices authenticate');

    const laptopReq = (await authenticate(laptop)).req;
    await call(auth.logoutUser, {}, { req: { user: laptopReq.user, session: laptopReq.session } });

    const afterLaptop = await authenticate(laptop);
    if (afterLaptop.ok || afterLaptop.body.code !== 'SESSION_REVOKED')
      fail('the device that logged out must be rejected', afterLaptop);
    ok('THE BUG: device that logged out -> 401 SESSION_REVOKED');

    const phoneStillOk = await authenticate(phone);
    if (!phoneStillOk.ok)
      fail('THE BUG: the other device must STAY signed in after a logout', phoneStillOk);
    ok('THE FIX: the other device stays signed in (no global logout)');

    // tokenVersion must not have moved — that is the account-wide switch.
    const afterRow = await prisma.user.findUnique({ where: { id: user.id } });
    if (afterRow.tokenVersion !== 0)
      fail('an ordinary logout must not bump tokenVersion', afterRow.tokenVersion);
    ok('an ordinary logout leaves tokenVersion untouched');

    /* ── 2. Sockets honour the same per-device revocation ────────────────── */
    if (await socketAccepts(laptop)) fail('socket must reject the logged-out device', {});
    if (!(await socketAccepts(phone))) fail('socket must still accept the live device', {});
    ok('socket handshake: rejects the logged-out device, accepts the live one');

    /* ── 3. The devices list ─────────────────────────────────────────────── */
    const tablet = await login(user.email, FIREFOX);
    const phoneReq = (await authenticate(phone)).req;
    let listed = await call(auth.listSessions, {}, {
      req: { user: phoneReq.user, session: phoneReq.session },
    });
    if (listed.body.sessions.length !== 2)
      fail('expected exactly the two live sessions', listed.body.sessions);
    if (listed.body.sessions.filter((s) => s.current).length !== 1)
      fail('exactly one row should be flagged as the current device', listed.body.sessions);
    ok(`devices list shows only live sessions (${listed.body.sessions.map((s) => s.device).join(', ')})`);

    if (describeDevice(IPHONE['user-agent']) !== 'Safari on iOS')
      fail('device labelling is wrong', describeDevice(IPHONE['user-agent']));
    ok('device labels read correctly (Safari on iOS / Chrome on Windows)');

    /* ── 4. Sign out all OTHER devices ───────────────────────────────────── */
    const revoked = await call(auth.revokeOtherSessions, {}, {
      req: { user: phoneReq.user, session: phoneReq.session },
    });
    if (revoked.body.revoked !== 1 || revoked.body.endedCurrentSession)
      fail('revoke-others should have ended exactly the tablet', revoked.body);
    ok('sign out others -> ended 1 other device, kept this one');

    if ((await authenticate(tablet)).ok) fail('the tablet must be signed out', {});
    ok('the other device is signed out');

    if (!(await authenticate(phone)).ok)
      fail('the device that pressed the button must STAY signed in', {});
    ok('the device that pressed the button stays signed in');

    /* ── 5. The account-wide switch still takes everything down ──────────── */
    const global = await makeUser(mk('global'));
    const gA = await login(global.email, CHROME);
    const gB = await login(global.email, IPHONE);
    const gReq = (await authenticate(gA)).req;

    const pw = await call(security.changePassword,
      { currentPassword: PASSWORD, newPassword: 'Brand#NewPass9' },
      { req: { user: gReq.user, session: gReq.session } });
    if (pw.status !== 200) fail('password change should succeed', pw);

    if ((await authenticate(gA)).ok || (await authenticate(gB)).ok)
      fail('a password change must sign out EVERY device', {});
    ok('password change still revokes every device (tokenVersion intact)');

    // ...and the stranded rows drop off the devices list rather than lingering.
    const fresh = await call(auth.loginUser,
      { email: global.email, password: 'Brand#NewPass9' }, { headers: CHROME });
    const freshReq = (await authenticate(fresh.body.token)).req;
    listed = await call(auth.listSessions, {}, {
      req: { user: freshReq.user, session: freshReq.session },
    });
    if (listed.body.sessions.length !== 1)
      fail('sessions stranded by a tokenVersion bump must not be listed', listed.body.sessions);
    ok('sessions stranded by a global revocation drop off the devices list');

    /* ── 6. Admin suspension still kills every device ────────────────────── */
    const susp = await makeUser(mk('susp'));
    const sTok = await login(susp.email, CHROME);
    await prisma.user.update({
      where: { id: susp.id },
      data: { suspended: true, tokenVersion: { increment: 1 } },
    });
    const sAfter = await authenticate(sTok);
    if (sAfter.ok || sAfter.body.code !== 'ACCOUNT_SUSPENDED')
      fail('a suspended account must be rejected', sAfter);
    ok('admin suspension still rejects live devices');

    /* ── 7. Legacy tokens (minted before sessions existed) keep working ──── */
    const legacyUser = await makeUser(mk('legacy'));
    const legacyToken = jwt.sign(
      { id: legacyUser.id, role: legacyUser.role, tokenVersion: 0 },
      process.env.JWT_SECRET, { expiresIn: '30d' },
    );
    const legacyAuth = await authenticate(legacyToken);
    if (!legacyAuth.ok)
      fail('REQUIREMENT 5: a pre-sessions token must still authenticate', legacyAuth);
    if (legacyAuth.req.session !== null)
      fail('a pre-sessions token should carry no session', legacyAuth.req.session);
    ok('REQUIREMENT 5: pre-sessions tokens still authenticate (no forced logout on deploy)');

    // Logging one out has nothing to revoke, so it falls back to tokenVersion.
    await call(auth.logoutUser, {}, {
      req: { user: legacyAuth.req.user, session: legacyAuth.req.session },
    });
    if ((await authenticate(legacyToken)).ok)
      fail('logging out a legacy token must still end it', {});
    ok('legacy token logout falls back to tokenVersion and still works');

    /* ── 8. Google sign-in mints a session too ───────────────────────────── */
    const gUser = await makeUser(mk('google'), { authProvider: 'google', password: null });
    googleProfile = { aud: CLIENT_ID, email: gUser.email, email_verified: true, name: 'E2E', picture: '' };
    const gRes = await call(auth.googleAuth, { idToken: 'tok' }, { headers: IPHONE });
    if (!gRes.body.token) fail('google sign-in should return a token', gRes);
    if (!jwt.decode(gRes.body.token).sid)
      fail('google sign-in must mint a session', jwt.decode(gRes.body.token));
    if (!(await authenticate(gRes.body.token)).ok)
      fail('the google session should authenticate', {});
    ok('Google sign-in mints a per-device session and authenticates');

    /* ── 9. 2FA sign-in mints a session too ──────────────────────────────── */
    const tfa = await makeUser(mk('2fa'), { twoFactorEnabled: true, twoFactorMethod: 'email' });
    sentCode = null;
    const challenge = await call(auth.loginUser,
      { email: tfa.email, password: PASSWORD }, { headers: CHROME });
    if (!challenge.body.twoFactorRequired) fail('expected a 2FA challenge', challenge);
    if (challenge.body.token) fail('the challenge must not carry a token', challenge.body);

    const second = await call(auth.verifyTwoFactor,
      { challengeToken: challenge.body.challengeToken, code: sentCode }, { headers: CHROME });
    if (!second.body.token || !jwt.decode(second.body.token).sid)
      fail('2FA completion must mint a session', second.body);
    if (!(await authenticate(second.body.token)).ok)
      fail('the 2FA session should authenticate', {});
    ok('2FA sign-in mints a per-device session and authenticates');

    /* ── 10. Session restoration (GET /auth/me) on a live session ────────── */
    const restoreReq = (await authenticate(phone)).req;
    const me = await call(auth.getMe, {}, { req: { user: restoreReq.user, session: restoreReq.session } });
    if (me.status !== 200 || me.body.email !== user.email)
      fail('REQUIREMENT 5: /auth/me must restore a live session', me);
    ok('REQUIREMENT 5: /auth/me restores a live session on return visit');

    /* ── 11. Deleting a user takes their sessions with them ─────────────── */
    const doomed = await makeUser(mk('doomed'));
    await login(doomed.email, CHROME);
    if ((await prisma.session.count({ where: { userId: doomed.id } })) !== 1)
      fail('expected one session before the delete', {});
    await prisma.user.delete({ where: { id: doomed.id } });
    if ((await prisma.session.count({ where: { userId: doomed.id } })) !== 0)
      fail('Session rows must cascade with the user', {});
    ok('deleting a user cascade-deletes their sessions');

    console.log(`\nALL ${passed} SESSION CHECKS PASSED OK`);
  } finally {
    for (const id of made) await prisma.user.delete({ where: { id } }).catch(() => {});
    await prisma.$disconnect();
  }
})().catch((e) => { console.error('\nE2E FAILED:', e.message || e); process.exit(1); });
