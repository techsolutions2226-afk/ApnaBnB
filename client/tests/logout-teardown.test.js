/* Logout teardown — the client half of the session fixes.
 *
 * Signing out has to tear down three things, not one:
 *   1. localStorage  (auth_token + current_user)
 *   2. the socket    (authenticated once at handshake time, so a live socket
 *                     outlives a dead session and keeps delivering to a
 *                     signed-out browser)
 *   3. requestCache  (30s TTL, and not every key is user-scoped, so the next
 *                     account to sign in on this tab could be served the
 *                     previous one's data)
 *
 * Only (1) was happening on every path. These tests drive the REAL modules —
 * no reimplementation — and assert that the two primitives actually do their
 * job, then that every logout path in the app calls both.
 *
 * Run with: node --test tests/logout-teardown.test.js
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { registerHooks } from 'node:module';

const SRC = path.join(import.meta.dirname, '..', 'src');

/* The app is built by Vite, so `import.meta.env` is a build-time construct
   Node knows nothing about. Rewrite it to a plain global on load so the real
   source can be imported unmodified. */
registerHooks({
  /* Vite resolves extensionless relative imports ("../utils/requestCache");
     Node's ESM resolver does not. Add the extension the bundler would. */
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) {
      for (const ext of ['.js', '.jsx']) {
        try { return nextResolve(specifier + ext, context); } catch { /* try next */ }
      }
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    const result = nextLoad(url, context);
    if (url.includes('/src/') && result.source) {
      return {
        ...result,
        source: result.source.toString().replaceAll('import.meta.env', 'globalThis.__VITE_ENV__'),
      };
    }
    return result;
  },
});

globalThis.__VITE_ENV__ = { VITE_API_URL: 'http://localhost:5000/api' };

// Minimal browser surface the modules touch at import/teardown time.
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
globalThis.window = { location: { pathname: '/dashboard/buyer', href: '/dashboard/buyer' } };

test('clearRequestCache: actually empties a populated cache', async () => {
  const { cachedRequest, clearRequestCache } = await import('../src/utils/requestCache.js');

  let calls = 0;
  const loader = async () => {
    calls += 1;
    return { secret: `user-A-listing-${calls}` };
  };

  const first = await cachedRequest('listings/mine', loader);
  assert.equal(first.secret, 'user-A-listing-1');

  // Proves the entry really is cached: a second read must not hit the loader.
  const second = await cachedRequest('listings/mine', loader);
  assert.equal(calls, 1, 'second read should have been served from cache');
  assert.equal(second.secret, 'user-A-listing-1');

  // This is the fix: after a logout the next reader must reach the network,
  // not inherit the previous account's rows.
  clearRequestCache();

  const afterLogout = await cachedRequest('listings/mine', loader);
  assert.equal(calls, 2, 'cache was not cleared — the loader should have re-run');
  assert.equal(afterLogout.secret, 'user-A-listing-2');
});

test('disconnectSocket: drops the live socket so it cannot outlive the session', async () => {
  const { getSocket, disconnectSocket } = await import('../src/api/socket.js');

  // No token → nothing to connect, and calling it while logged out is safe.
  assert.equal(getSocket(), null, 'a signed-out caller should get no socket');

  localStorage.setItem('auth_token', 'fake.jwt.value');
  const socket = getSocket();
  assert.ok(socket, 'a signed-in caller should get a socket');

  // Same instance while the session lasts (it is a singleton).
  assert.equal(getSocket(), socket, 'getSocket should reuse the live socket');

  disconnectSocket();
  assert.equal(socket.connected, false, 'the socket should be disconnected');

  // And the singleton must be released, not merely disconnected — otherwise
  // the next user on this tab would reuse a socket authenticated as the last.
  localStorage.setItem('auth_token', 'another.jwt.value');
  assert.notEqual(getSocket(), socket, 'a new session must get a new socket');
  disconnectSocket();
  localStorage.removeItem('auth_token');
});

test('apiClient: a session-death response tears down storage, socket and cache', async () => {
  const { cachedRequest, clearRequestCache } = await import('../src/utils/requestCache.js');
  const apiClient = (await import('../src/api/apiClient.js')).default;

  clearRequestCache();

  localStorage.setItem('auth_token', 'fake.jwt.value');
  localStorage.setItem('current_user', JSON.stringify({ id: 'user-a' }));
  localStorage.setItem('dash_view_role:user-a', 'seller');

  let calls = 0;
  await cachedRequest('matches/mine', async () => { calls += 1; return { owner: 'user-a' }; });
  assert.equal(calls, 1);

  // Reach the interceptor the way axios would on a failed response.
  const rejected = apiClient.interceptors.response.handlers[0].rejected;
  await assert.rejects(() =>
    rejected({
      config: { url: '/matches/mine' },
      response: { status: 401, data: { message: 'Token expired.' } },
    }),
  );

  assert.equal(localStorage.getItem('auth_token'), null, 'token should be cleared');
  assert.equal(localStorage.getItem('current_user'), null, 'cached user should be cleared');
  assert.equal(
    localStorage.getItem('dash_view_role:user-a'), null,
    "the user's Viewing-as hat must not survive a forced logout",
  );

  await cachedRequest('matches/mine', async () => { calls += 1; return { owner: 'user-b' }; });
  assert.equal(calls, 2, 'the forced-logout path did not clear the request cache');
});

/* The three tests above prove the primitives work. This one proves they are
   actually wired into EVERY place that ends a session — the original bug was
   not a broken primitive but a path that forgot to call them. */
test('every logout path tears down socket and cache', () => {
  const read = (p) => fs.readFileSync(path.join(SRC, p), 'utf8');

  const authContext = read('context/AuthContext.jsx');

  // Manual logout.
  const manual = authContext.slice(
    authContext.indexOf('const logout = ()'),
    authContext.indexOf('/* ── Idle auto-logout ──'),
  );
  assert.match(manual, /disconnectSocket\(\)/, 'manual logout must disconnect the socket');
  assert.match(manual, /clearRequestCache\(\)/, 'manual logout must clear the request cache');

  // 30-minute idle logout.
  const idle = authContext.slice(
    authContext.indexOf('const triggerLogout = ()'),
    authContext.indexOf('const resetTimer'),
  );
  assert.match(idle, /disconnectSocket\(\)/, 'idle logout must disconnect the socket');
  assert.match(idle, /clearRequestCache\(\)/, 'idle logout must clear the request cache');

  // Session-invalid-on-mount (GET /auth/me rejected).
  const onMount = authContext.slice(
    authContext.indexOf('if (err?.status === 401'),
    authContext.indexOf('// Network/host error'),
  );
  assert.match(onMount, /disconnectSocket\(\)/, 'dead-session restore must disconnect the socket');
  assert.match(onMount, /clearRequestCache\(\)/, 'dead-session restore must clear the request cache');

  // Forced logout from any 401 / session-death 403.
  const client = read('api/apiClient.js');
  const forced = client.slice(
    client.indexOf('const clearLocalSession'),
    client.indexOf('// Response interceptor'),
  );
  assert.match(forced, /disconnectSocket\(\)/, 'forced logout must disconnect the socket');
  assert.match(forced, /clearRequestCache\(\)/, 'forced logout must clear the request cache');
  assert.match(forced, /clearViewRole\(/, 'forced logout must drop the Viewing-as hat');

  // authService.logout owns local session storage for the ordinary paths.
  const service = read('services/authService.js');
  const logoutFn = service.slice(
    service.indexOf('  logout: () => {'),
    service.indexOf('// Get current user from localStorage'),
  );
  assert.match(logoutFn, /clearViewRole\(/, 'logout must drop the Viewing-as hat');

  // Server-pushed revocation (admin suspended/deleted the account).
  const socket = read('api/socket.js');
  const revoked = socket.slice(
    socket.indexOf('const handleSessionRevoked'),
    socket.indexOf('export const getSocket'),
  );
  assert.match(revoked, /clearRequestCache\(\)/, 'revoked push must clear the request cache');
  assert.match(revoked, /clearViewRole\(/, 'revoked push must drop the Viewing-as hat');
  assert.match(revoked, /socket\.disconnect\(\)/, 'revoked push must disconnect the socket');

  // Post-verification sign-out.
  const verify = read('pages/VerifyEmail.jsx');
  assert.match(verify, /authService\.logout\(\)/, 'verify-email must go through the real logout');
  assert.match(verify, /disconnectSocket\(\)/, 'verify-email must disconnect the socket');
  assert.match(verify, /clearRequestCache\(\)/, 'verify-email must clear the request cache');
});

/* Guards the class of bug rather than the instances: any NEW code that clears
   auth_token by hand is a logout path that will forget the teardown again. */
test('no logout path clears auth_token without going through the teardown', () => {
  const allowed = new Set([
    // The one place that owns local session storage.
    'services/authService.js',
    // Both call disconnectSocket + clearRequestCache alongside (asserted above).
    'api/apiClient.js',
    'api/socket.js',
  ]);

  const offenders = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!/\.jsx?$/.test(entry.name)) continue;
      const rel = path.relative(SRC, full).split(path.sep).join('/');
      if (allowed.has(rel)) continue;
      if (/removeItem\(\s*["']auth_token["']\s*\)/.test(fs.readFileSync(full, 'utf8'))) {
        offenders.push(rel);
      }
    }
  };
  walk(SRC);

  assert.deepEqual(
    offenders, [],
    `these files end a session by hand and will skip the teardown: ${offenders.join(', ')}`,
  );
});
