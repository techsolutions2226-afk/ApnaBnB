/* Browser-side location fallback — used when the server cannot see the
 * visitor's IP. Fetch is stubbed; no real calls.
 *
 * Run with: node --test tests/browser-geolocation.test.js
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { locateFromBrowser, shapeBrowserGeo, BROWSER_PROVIDERS } = await import('../src/utils/browserGeolocation.js');

const ok = (body) => ({ ok: true, json: async () => body });

test('uses the first service that answers (ipwho.is)', async () => {
  const urls = [];
  const geo = await locateFromBrowser(async (url) => {
    urls.push(url);
    return ok({ success: true, country: 'Pakistan', country_code: 'PK', region: 'Punjab', city: 'Lahore', latitude: 31.55, longitude: 74.35 });
  });
  assert.deepEqual(geo, { country: 'Pakistan', countryCode: 'PK', region: 'Punjab', city: 'Lahore', latitude: 31.55, longitude: 74.35 });
  assert.equal(urls.length, 1);
});

test('falls back through services, including geojs string coordinates', async () => {
  const geo = await locateFromBrowser(async (url) => {
    if (url.includes('ipwho.is')) throw new Error('blocked');
    if (url.includes('freeipapi')) return { ok: false, json: async () => ({}) };
    return ok({ country: 'United States', country_code: 'US', region: 'California', city: 'Mountain View', latitude: '37.42', longitude: '-122.08' });
  });
  assert.equal(geo.city, 'Mountain View');
  assert.equal(geo.latitude, 37.42);
});

test('every service failing resolves null, never throws', async () => {
  assert.equal(await locateFromBrowser(async () => { throw new Error('offline'); }), null);
  assert.equal(BROWSER_PROVIDERS.length, 3);
  assert.equal(shapeBrowserGeo({ city: 'Lahore' }), null);
});
