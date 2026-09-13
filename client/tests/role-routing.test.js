/* Role routing and the "Viewing as" hat.
 *
 * The bug: signed in as admin, opening /account rendered the SELLER dashboard.
 * Three things combined —
 *   1. /account/* is mounted only under DashboardShell, behind a ProtectedRoute
 *      with no `roles` prop, so an admin walks in;
 *   2. DashboardShell resolved `ROLES.includes(role) ? role : "buyer"`, so an
 *      admin silently became a buyer;
 *   3. the hat was cached in a browser-global "dash_view_role" key that was
 *      never namespaced per user and never cleared on logout, so the admin
 *      inherited whatever hat the last person on that browser left.
 *
 * Run with: node --test tests/role-routing.test.js
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { registerHooks } from 'node:module';

const SRC = path.join(import.meta.dirname, '..', 'src');

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) {
      for (const ext of ['.js', '.jsx']) {
        try { return nextResolve(specifier + ext, context); } catch { /* try next */ }
      }
    }
    return nextResolve(specifier, context);
  },
});

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

test('memberRole: an admin is not a member role', async () => {
  const { memberRole, ROLES } = await import('../src/components/dashboard/dashboardNav.js');

  assert.equal(memberRole('seller'), 'seller');
  assert.equal(memberRole('buyer'), 'buyer');
  assert.equal(memberRole('dealer'), 'dealer');

  // THE BUG: this used to be coerced to "buyer" at each call site.
  assert.equal(memberRole('admin'), null, 'an admin must not resolve to a member role');
  assert.equal(memberRole(undefined), null);
  assert.equal(memberRole('nonsense'), null);

  assert.ok(!ROLES.includes('admin'), 'ROLES is member-only by design');
});

test('clampViewRole: an admin can never be given a member hat', async () => {
  const { clampViewRole, allowedViewRoles } = await import('../src/components/dashboard/dashboardNav.js');

  assert.deepEqual(allowedViewRoles('admin'), []);
  assert.equal(clampViewRole('admin', 'seller'), null);
  assert.equal(clampViewRole('admin', 'dealer'), null);

  // Unchanged for members.
  assert.equal(clampViewRole('buyer', 'seller'), 'seller');
  assert.equal(clampViewRole('dealer', 'seller'), 'dealer', 'dealers stay dealer-only');
});

test('viewRoleStore: a hat is scoped to its user and cannot leak across accounts', async () => {
  const { readViewRole, writeViewRole, clearViewRole } = await import('../src/utils/viewRoleStore.js');

  writeViewRole('user-seller', 'seller');
  assert.equal(readViewRole('user-seller'), 'seller');

  // THE BUG: a different account must not inherit it.
  assert.equal(readViewRole('user-admin'), null, "another user's hat leaked");
  assert.equal(readViewRole('user-buyer'), null);

  // Logout drops only the departing user's hat.
  clearViewRole('user-seller');
  assert.equal(readViewRole('user-seller'), null, 'the hat should not survive logout');

  // Anonymous callers get nothing rather than a shared bucket read.
  assert.equal(readViewRole(null), null);
  assert.equal(readViewRole(undefined), null);
});

test('viewRoleStore: the pre-fix browser-global key is retired on contact', async () => {
  const { readViewRole, clearViewRole } = await import('../src/utils/viewRoleStore.js');

  // Exactly the state that produced the report: a stale global key left by an
  // earlier seller session, with no per-user hat for the account signing in.
  localStorage.setItem('dash_view_role', 'seller');

  assert.equal(readViewRole('user-admin'), null, 'the legacy global key must not be honoured');
  assert.equal(localStorage.getItem('dash_view_role'), null, 'the legacy key should be removed');

  localStorage.setItem('dash_view_role', 'seller');
  clearViewRole(null);
  assert.equal(localStorage.getItem('dash_view_role'), null);
});

test('DashboardShell redirects admins out of the member shell', () => {
  const shell = fs.readFileSync(
    path.join(SRC, 'components/dashboard/DashboardShell.jsx'), 'utf8',
  );

  const guard = shell.slice(
    shell.indexOf('export default function DashboardShell()'),
    shell.indexOf('function MemberDashboardShell()'),
  );

  assert.match(guard, /role === "admin"/, 'the shell must recognise an admin');
  assert.match(guard, /\/admin\$\{location\.pathname\}/, '/account/* must map to /admin/account/*');
  assert.match(guard, /Navigate to=\{target\} replace/, 'the redirect must replace history');

  /* Rules of hooks: the guard returns early, so it may only call hooks that
     run on EVERY render. useAuth + useLocation, nothing else. */
  const hookCalls = guard.match(/use[A-Z]\w*\(/g) || [];
  assert.deepEqual(
    hookCalls.sort(), ['useAuth(', 'useLocation('],
    'the guard must call only useAuth and useLocation before its early return',
  );
});

test('no module reads the un-namespaced dash_view_role key directly', () => {
  const offenders = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!/\.jsx?$/.test(entry.name)) continue;
      const rel = path.relative(SRC, full).split(path.sep).join('/');
      // The store itself owns the key, legacy retirement included.
      if (rel === 'utils/viewRoleStore.js') continue;
      const src = fs.readFileSync(full, 'utf8');
      if (/localStorage\.\w+\(\s*["'`]dash_view_role/.test(src) || /"dash_view_role"/.test(src)) {
        offenders.push(rel);
      }
    }
  };
  walk(SRC);

  assert.deepEqual(
    offenders, [],
    `these read the shared hat key directly instead of the per-user store: ${offenders.join(', ')}`,
  );
});
