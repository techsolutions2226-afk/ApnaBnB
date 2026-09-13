/* Listing intent — the Seller/Landlord choice on the home hero must survive
 * the auth hop and send the user to Create Listing (not the dashboard) with
 * the right purpose, exactly once.
 *
 * Also asserts every post-auth redirect path goes through the one helper, so
 * a new auth screen can't quietly skip the intent.
 *
 * Run with: node --test tests/listing-intent.test.js
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const store = new Map();
globalThis.sessionStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

const {
  setListingIntent,
  getListingIntent,
  clearListingIntent,
  getPostAuthRedirect,
  CREATE_LISTING_PATH,
} = await import('../src/utils/listingIntent.js');

beforeEach(() => store.clear());

test('no intent → fallback dashboard path', () => {
  assert.deepEqual(getPostAuthRedirect('/dashboard/buyer'), {
    to: '/dashboard/buyer',
    options: { replace: true },
  });
});

test('seller intent → Create Listing with purpose sale', () => {
  setListingIntent('sale');
  assert.deepEqual(getPostAuthRedirect('/dashboard/buyer'), {
    to: CREATE_LISTING_PATH,
    options: { replace: true, state: { purpose: 'sale' } },
  });
});

test('landlord intent → rent; redirect only peeks until cleared', () => {
  setListingIntent('rent');
  getPostAuthRedirect('/x');
  assert.equal(getPostAuthRedirect('/x').options.state.purpose, 'rent');
  clearListingIntent();
  assert.equal(getPostAuthRedirect('/x').to, '/x');
});

test('invalid purposes are ignored', () => {
  setListingIntent('buyer');
  assert.equal(getListingIntent(), null);
  store.set('listing_intent', 'tampered');
  assert.equal(getListingIntent(), null);
});

test('every post-auth redirect uses getPostAuthRedirect', () => {
  const SRC = path.join(import.meta.dirname, '..', 'src');
  for (const rel of [
    'pages/Login.jsx',
    'pages/Signup.jsx',
    'pages/VerifyTwoFactor.jsx',
    'components/common/GoogleAuthButton.jsx',
  ]) {
    const code = fs.readFileSync(path.join(SRC, rel), 'utf8');
    assert.match(code, /getPostAuthRedirect\(/, `${rel} must use getPostAuthRedirect`);
  }
  const create = fs.readFileSync(path.join(SRC, 'pages/CreateListing.jsx'), 'utf8');
  assert.match(create, /clearListingIntent\(\)/, 'CreateListing must clear the intent');
});
