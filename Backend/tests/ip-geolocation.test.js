/* IP geolocation — address filtering, response shaping and failure handling.
 *
 * The provider is never called for real: global fetch is stubbed per test, so
 * these run offline and prove the "always resolves, never throws" contract.
 *
 * Run with: npm test (node --test tests)
 */
const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

const cache = require('../utils/cache');
const {
  isPublicIp,
  normalizeGeo,
  lookupIp,
  detectLocation,
} = require('../utils/ipGeolocation');

const realFetch = globalThis.fetch;
const realWarn = console.warn;
let calls;

const IPAPI_LAHORE = {
  ip: '203.0.113.7',
  city: 'Lahore',
  region: 'Punjab',
  region_code: 'PB',
  country_code: 'PK',
  country_name: 'Pakistan',
  latitude: 31.558,
  longitude: 74.3507,
};

const stubFetch = (impl) => {
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return impl(url, options);
  };
};

const jsonResponse = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

beforeEach(() => {
  calls = [];
  cache.clear();
  delete process.env.GEO_DEV_IP;
  delete process.env.IPAPI_KEY;
  console.warn = () => {};
});

afterEach(() => {
  globalThis.fetch = realFetch;
  console.warn = realWarn;
});

test('isPublicIp: private, loopback and link-local addresses are rejected', () => {
  for (const ip of [
    '', null, 'not-an-ip', '127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255',
    '192.168.1.10', '169.254.1.1', '100.64.0.1', '0.0.0.0', '999.1.1.1',
    '::1', '::', 'fe80::1', 'fd12:3456::1', '::ffff:192.168.0.1',
  ]) {
    assert.equal(isPublicIp(ip), false, `${ip} should not be public`);
  }
});

test('isPublicIp: public IPv4, IPv4-mapped and IPv6 addresses are accepted', () => {
  for (const ip of ['39.32.10.5', '172.32.0.1', '8.8.8.8', '::ffff:39.32.10.5', '2400:adc1::1']) {
    assert.equal(isPublicIp(ip), true, `${ip} should be public`);
  }
});

test('normalizeGeo: maps ipapi fields and rounds coordinates to 2 dp', () => {
  assert.deepEqual(normalizeGeo(IPAPI_LAHORE), {
    country: 'Pakistan',
    countryCode: 'PK',
    region: 'Punjab',
    city: 'Lahore',
    latitude: 31.56,
    longitude: 74.35,
  });
});

test('normalizeGeo: partial data keeps what exists and nulls the rest', () => {
  assert.deepEqual(normalizeGeo({ country_name: 'Pakistan', country_code: 'PK', latitude: 'x' }), {
    country: 'Pakistan',
    countryCode: 'PK',
    region: null,
    city: null,
    latitude: null,
    longitude: null,
  });
});

test('normalizeGeo: provider errors and country-less payloads are unusable', () => {
  assert.equal(normalizeGeo(null), null);
  assert.equal(normalizeGeo({ error: true, reason: 'RateLimited' }), null);
  assert.equal(normalizeGeo({ city: 'Lahore' }), null);
});

test('lookupIp: success returns the shaped location and sends a timeout signal', async () => {
  stubFetch(() => jsonResponse(IPAPI_LAHORE));
  const geo = await lookupIp('39.32.10.5');
  assert.equal(geo.city, 'Lahore');
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /^https:\/\/ipapi\.co\/39\.32\.10\.5\/json\/$/);
  assert.ok(calls[0].options.signal, 'request must be abortable');
});

test('lookupIp: IPAPI_KEY is passed as a query parameter when set', async () => {
  process.env.IPAPI_KEY = 'k 1';
  stubFetch(() => jsonResponse(IPAPI_LAHORE));
  await lookupIp('39.32.10.5');
  assert.match(calls[0].url, /\?key=k%201$/);
});

test('lookupIp: error payload, HTTP 429, HTML body and network failures resolve null', async () => {
  stubFetch(() => jsonResponse({ error: true, reason: 'RateLimited' }));
  assert.equal(await lookupIp('39.32.10.5'), null);

  stubFetch(() => jsonResponse({}, 429));
  assert.equal(await lookupIp('39.32.10.5'), null);

  // ipapi.co sits behind Cloudflare and can answer with an HTML challenge page.
  stubFetch(() => ({
    ok: true,
    status: 200,
    json: async () => JSON.parse('<!DOCTYPE html><title>Just a moment...</title>'),
  }));
  assert.equal(await lookupIp('39.32.10.5'), null);

  stubFetch(() => {
    const err = new Error('timed out');
    err.name = 'TimeoutError';
    throw err;
  });
  assert.equal(await lookupIp('39.32.10.5'), null);
});

test('detectLocation: a private request IP never calls the provider', async () => {
  stubFetch(() => jsonResponse(IPAPI_LAHORE));
  assert.equal(await detectLocation({ ip: '127.0.0.1' }), null);
  assert.equal(await detectLocation({ ip: '::ffff:10.0.0.4' }), null);
  assert.equal(calls.length, 0);
});

test('detectLocation: caches per IP and never puts the raw IP in the cache key', async () => {
  stubFetch(() => jsonResponse(IPAPI_LAHORE));
  const first = await detectLocation({ ip: '39.32.10.5' });
  const second = await detectLocation({ ip: '39.32.10.5' });
  assert.equal(first.city, 'Lahore');
  assert.deepEqual(second, first);
  assert.equal(calls.length, 1, 'second lookup must come from cache');
  assert.ok(cache.get('geo:39.32.10.5') === undefined);
});

test('detectLocation: concurrent requests share one provider call', async () => {
  stubFetch(() => jsonResponse(IPAPI_LAHORE));
  const results = await Promise.all([
    detectLocation({ ip: '39.32.10.6' }),
    detectLocation({ ip: '39.32.10.6' }),
  ]);
  assert.equal(calls.length, 1);
  assert.equal(results[1].city, 'Lahore');
});

test('detectLocation: a failure is cached briefly instead of retried per request', async () => {
  stubFetch(() => jsonResponse({}, 429));
  assert.equal(await detectLocation({ ip: '39.32.10.7' }), null);
  assert.equal(await detectLocation({ ip: '39.32.10.7' }), null);
  assert.equal(calls.length, 1);
});

test('detectLocation: GEO_DEV_IP overrides loopback outside production only', async () => {
  stubFetch(() => jsonResponse(IPAPI_LAHORE));
  const env = process.env.NODE_ENV;
  process.env.GEO_DEV_IP = '39.32.10.8';
  try {
    process.env.NODE_ENV = 'production';
    assert.equal(await detectLocation({ ip: '127.0.0.1' }), null);
    assert.equal(calls.length, 0);

    process.env.NODE_ENV = 'development';
    const geo = await detectLocation({ ip: '127.0.0.1' });
    assert.equal(geo.city, 'Lahore');
    assert.equal(calls.length, 1);
  } finally {
    if (env === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = env;
  }
});
