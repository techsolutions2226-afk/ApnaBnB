/* e2e: "Continue with Google" must enforce the same account gates as /login.
 *
 * Google proving the email is only the FIRST factor. This drives the real
 * controllers against the real database and asserts that a suspended,
 * deactivated, or 2FA-protected account cannot obtain a JWT through the
 * Google route — and that the ordinary paths still work.
 *
 * Only two things are stubbed, and neither is ours: Google's tokeninfo
 * endpoint (we have no way to mint a real ID token) and outbound mail.
 *
 * Run with: node tests/e2e-google-gate.js
 */
require('dotenv').config();

process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'e2e-test-client-id';
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

// Stub outbound mail BEFORE the controller destructures it.
const mailer = require('../utils/mailer');
let sentCode = null;
const alerts = [];
mailer.sendTwoFactorCodeEmail = async (_to, code) => { sentCode = code; };
mailer.sendSecurityAlertEmail = async (to, subject) => { alerts.push({ to, subject }); };

// Stub Google's tokeninfo endpoint — we cannot mint a real ID token.
let googleProfile = null;
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, ...rest) => {
  if (String(url).includes('oauth2.googleapis.com/tokeninfo')) {
    if (!googleProfile) return { ok: false, json: async () => ({}) };
    return { ok: true, json: async () => googleProfile };
  }
  return realFetch(url, ...rest);
};

const prisma = require('../db/prisma');
const auth = require('../controllers/authController');
const authRoutes = require('../routes/authRoutes');

/* Drives a controller the way Express would and resolves with the status and
   body it produced, or with whatever it handed to next(). */
const call = (handler, body) =>
  new Promise((resolve) => {
    const res = {
      _status: 200,
      status(s) { this._status = s; return this; },
      json(b) { resolve({ status: this._status, body: b }); return this; },
    };
    handler({ body, ip: '127.0.0.1', headers: {} }, res, (err) =>
      resolve({ status: err?.status || 500, body: { message: err?.message }, threw: true }),
    );
  });

let passed = 0;
const ok = (label) => { passed += 1; console.log(`PASS: ${label}`); };
const fail = (label, got) => {
  throw new Error(`${label}\n      got: ${JSON.stringify(got)}`);
};

const STAMP = Date.now();
const mk = (n) => `e2e-ggate-${STAMP}-${n}@example.com`;
const made = [];

const makeUser = async (email, extra = {}) => {
  const u = await prisma.user.create({
    data: {
      name: 'E2E Gate', email, authProvider: 'google', password: null,
      role: 'buyer', verified: true, phone: '+92 300 1112222', location: 'Test',
      ...extra,
    },
  });
  made.push(u.id);
  return u;
};

const asGoogle = (email) => {
  googleProfile = { aud: CLIENT_ID, email, email_verified: true, name: 'E2E Gate', picture: '' };
};

// Location is deliberately not collected at Google signup any more — role
// and phone are the whole payload.
const DETAILS = { phone: '+92 300 1112222' };

(async () => {
  try {
    /* 1. Baseline: an ordinary active account still signs in. */
    const active = await makeUser(mk('active'));
    asGoogle(active.email);
    let r = await call(auth.googleAuth, { idToken: 'tok' });
    if (r.status !== 200 || !r.body.token) fail('active account should get a token', r);
    ok('active account -> JWT issued (happy path intact)');

    /* 2. Suspended is still blocked (regression guard). */
    const susp = await makeUser(mk('susp'), { suspended: true });
    asGoogle(susp.email);
    r = await call(auth.googleAuth, { idToken: 'tok' });
    if (r.status !== 403 || r.body.code !== 'ACCOUNT_SUSPENDED' || r.body.token)
      fail('suspended account must be blocked', r);
    ok('suspended account -> 403 ACCOUNT_SUSPENDED, no token');

    /* 3. FIX: deactivated is blocked, exactly as it is on /login. */
    const deact = await makeUser(mk('deact'), { deactivated: true, deactivatedAt: new Date() });
    asGoogle(deact.email);
    r = await call(auth.googleAuth, { idToken: 'tok' });
    if (r.status !== 403 || r.body.code !== 'ACCOUNT_DEACTIVATED' || r.body.token)
      fail('deactivated account must be blocked on /google', r);
    ok('deactivated account -> 403 ACCOUNT_DEACTIVATED, no token');

    // ...and on /google/complete's race-condition re-check too.
    r = await call(auth.googleComplete, { idToken: 'tok', role: 'buyer', ...DETAILS });
    if (r.status !== 403 || r.body.code !== 'ACCOUNT_DEACTIVATED' || r.body.token)
      fail('deactivated account must be blocked on /google/complete', r);
    ok('deactivated account -> blocked on /google/complete as well');

    /* 4. FIX: 2FA is enforced, not skipped. */
    const tfa = await makeUser(mk('2fa'), { twoFactorEnabled: true, twoFactorMethod: 'email' });
    asGoogle(tfa.email);
    sentCode = null;
    r = await call(auth.googleAuth, { idToken: 'tok' });
    if (r.body.token) fail('2FA account must NOT receive a JWT from /google', r);
    if (!r.body.twoFactorRequired || !r.body.challengeToken)
      fail('2FA account should receive a challenge', r);
    if (!r.body.maskedEmail || r.body.maskedEmail.includes(tfa.email))
      fail('challenge should carry a masked email, not the full address', r);
    ok('2FA account -> no JWT, twoFactorRequired + challengeToken instead');

    if (!sentCode) fail('a 2FA code should have been emailed', { sentCode });
    ok(`2FA code emailed to the account owner (${sentCode.length} digits)`);

    // The challenge must be completable on the SAME screen /login uses.
    const done = await call(auth.verifyTwoFactor, {
      challengeToken: r.body.challengeToken, code: sentCode,
    });
    if (done.status !== 200 || !done.body.token)
      fail('the Google-issued challenge should complete at /verify-2fa', done);
    ok('challenge completes at /verify-2fa -> JWT issued (second factor honoured)');

    // A wrong code must not mint anything.
    sentCode = null;
    const r2 = await call(auth.googleAuth, { idToken: 'tok' });
    const bad = await call(auth.verifyTwoFactor, {
      challengeToken: r2.body.challengeToken, code: '000000',
    });
    if (bad.body.token) fail('a wrong 2FA code must not issue a token', bad);
    ok('wrong 2FA code -> no token');

    // Same gate on /google/complete.
    r = await call(auth.googleComplete, { idToken: 'tok', role: 'buyer', ...DETAILS });
    if (r.body.token || !r.body.twoFactorRequired)
      fail('2FA must be enforced on /google/complete too', r);
    ok('2FA enforced on /google/complete as well');

    /* 5. Brand-new account: the two-step signup is unchanged. */
    const freshEmail = mk('new');
    asGoogle(freshEmail);
    r = await call(auth.googleAuth, { idToken: 'tok' });
    if (!r.body.requiresRole || r.body.token)
      fail('a new email should ask for a role, not create a session', r);
    if (await prisma.user.findUnique({ where: { email: freshEmail } }))
      fail('no row should exist before the role is chosen', { freshEmail });
    ok('new email -> requiresRole, no account created yet');

    r = await call(auth.googleComplete, { idToken: 'tok', role: 'seller', ...DETAILS });
    if (r.status !== 201 || !r.body.token || r.body.role !== 'seller')
      fail('googleComplete should create the account', r);
    const created = await prisma.user.findUnique({ where: { email: freshEmail } });
    made.push(created.id);
    if (created.authProvider !== 'google' || created.password !== null || !created.verified)
      fail('created row has the wrong shape', created);
    ok('googleComplete -> account created (google provider, no password, verified)');

    if (created.location) fail('signup must not store a location', created.location);
    if (created.latitude !== null || created.longitude !== null)
      fail('signup must not store coordinates', { lat: created.latitude, lng: created.longitude });
    ok('signup stores no location or coordinates (only role + phone are asked for)');

    // And the request must succeed with NO location key at all in the body.
    const bare = mk('bare');
    asGoogle(bare);
    await call(auth.googleAuth, { idToken: 'tok' });
    const bareRes = await call(auth.googleComplete, {
      idToken: 'tok', role: 'buyer', phone: '+92 300 9998888',
    });
    if (bareRes.status !== 201 || !bareRes.body.token)
      fail('a payload with no location field must still create the account', bareRes);
    const bareRow = await prisma.user.findUnique({ where: { email: bare } });
    made.push(bareRow.id);
    ok('a payload carrying only role + phone creates the account');

    /* 6. Token verification failures still reject. */
    googleProfile = { aud: 'some-other-app.apps.googleusercontent.com', email: mk('x'), email_verified: true };
    r = await call(auth.googleAuth, { idToken: 'tok' });
    if (r.status !== 401) fail('a token minted for another app must be rejected', r);
    ok('ID token with a foreign aud -> 401');

    googleProfile = { aud: CLIENT_ID, email: mk('y'), email_verified: false };
    r = await call(auth.googleAuth, { idToken: 'tok' });
    if (r.status !== 400) fail('an unverified Google email must be rejected', r);
    ok('unverified Google email -> 400');

    /* 7. FIX: both Google routes sit behind a rate limiter. */
    const layers = authRoutes.stack.filter((l) => l.route?.path?.startsWith('/google'));
    if (layers.length !== 2) fail('expected two /google routes', layers.map((l) => l.route.path));
    for (const l of layers) {
      const handlers = l.route.stack.length;
      if (handlers < 2) fail(`${l.route.path} has no rate limiter in front of it`, { handlers });
      ok(`POST ${l.route.path} -> rate limiter mounted ahead of the controller`);
    }

    /* ...and it actually cuts a caller off. Reload the router under
       NODE_ENV=production so the real production ceiling (30) is the one
       under test, then drive the limiter itself until it refuses. */
    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    delete require.cache[require.resolve('../routes/authRoutes')];
    const prodRoutes = require('../routes/authRoutes');
    process.env.NODE_ENV = prevEnv;

    const limiter = prodRoutes.stack.find((l) => l.route?.path === '/google').route.stack[0].handle;
    const hit = () =>
      new Promise((resolve) => {
        const res = {
          _status: 200,
          setHeader() {}, getHeader() {}, removeHeader() {}, append() {},
          status(s) { this._status = s; return this; },
          json() { resolve(this._status); return this; },
          send() { resolve(this._status); return this; },
        };
        limiter({ ip: '203.0.113.9', method: 'POST', headers: {}, body: {}, app: { get: () => false } },
          res, () => resolve(200));
      });

    let blockedAt = 0;
    for (let i = 1; i <= 40 && !blockedAt; i += 1) {
      if ((await hit()) === 429) blockedAt = i;
    }
    if (!blockedAt) fail('the Google limiter never returned 429', { tried: 40 });
    if (blockedAt <= 2) fail('the limiter is too tight for a real sign-in', { blockedAt });
    ok(`Google limiter refuses a flooding IP with 429 (request #${blockedAt}, prod ceiling 30)`);

    console.log(`\nALL ${passed} GOOGLE AUTH GATE CHECKS PASSED OK`);
  } finally {
    for (const id of made) await prisma.user.delete({ where: { id } }).catch(() => {});
    await prisma.$disconnect();
  }
})().catch((e) => { console.error('\nE2E FAILED:', e.message || e); process.exit(1); });
