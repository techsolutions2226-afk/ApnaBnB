/* IP geolocation — address filtering, provider fallback, response shaping and
 * failure handling.
 *
 * No provider is called for real: global fetch is stubbed per test (by URL),
 * so these run offline and prove the "always resolves, never throws" contract.
 *
 * Run with: npm test (node --test tests)
 */
const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

const cache = require('../utils/cache');
const {
  PROVIDERS,
  isPublicIp,
  shapeGeo,
  lookupIp,
  detectLocation,
} = require('../utils/ipGeolocation');

const realFetch = globalThis.fetch;
const realWarn = console.warn;
let calls;

// Real response shapes captured from each provider for a PTCL (Pakistan) IP.
const BODIES = {
  'ipapi.co': { ip: '39.32.0.1', city: 'Aman Garh', region: 'Khyber Pakhtunkhwa', country: 'PK', country_name: 'Pakistan', country_code: 'PK', latitude: 34.00583, longitude: 71.93 },
  'ipwho.is': { ip: '39.32.0.1', success: true, country: 'Pakistan', country_code: 'PK', region: 'Khyber Pakhtunkhwa', city: 'Peshawar', latitude: 34.0076944, longitude: 71.5784923 },
  'freeipapi.com': { ipAddress: '39.32.0.1', latitude: 33.6844, longitude: 73.0479, countryName: 'Pakistan', countryCode: 'PK', cityName: 'Islamabad', regionName: 'Islamabad', zipCode: '22511' },
};
const FAILED_BODIES = {
  'ipapi.co': { ip: '10.0.0.1', error: true, reason: 'Reserved IP Address' },
  'ipwho.is': { ip: '10.0.0.1', success: false, message: 'Reserved range' },
  'freeipapi.com': { ipAddress: null, countryName: null, countryCode: null, cityName: null, zipCode: '-' },
};

const jsonResponse = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

// Exact hostname — "freeipapi.com" contains the text "ipapi.co".
const providerOf = (url) => PROVIDERS.find((p) => new URL(url).hostname === p.name).name;

/* behaviour: { 'ipapi.co': 'ok' | 'fail' | 429 | 'throw' | 'html', ... } */
const stubProviders = (behaviour) => {
  globalThis.fetch = async (url, options) => {
    const name = providerOf(url);
    calls.push({ name, url, options });
    const mode = behaviour[name] ?? 'ok';
    if (mode === 'throw') {
      const err = new Error('timed out');
      err.name = 'TimeoutError';
      throw err;
    }
    if (mode === 'html') {
      return { ok: true, status: 200, json: async () => JSON.parse('<!DOCTYPE html><title>Just a moment...</title>') };
    }
    if (typeof mode === 'number') return jsonResponse({}, mode);
    return jsonResponse(mode === 'fail' ? FAILED_BODIES[name] : BODIES[name]);
  };
};

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

test('providers are tried in order: ipapi.co, ipwho.is, freeipapi.com', () => {
  assert.deepEqual(PROVIDERS.map((p) => p.name), ['ipapi.co', 'ipwho.is', 'freeipapi.com']);
  for (const p of PROVIDERS) assert.match(p.url('1.2.3.4'), /^https:\/\//);
});

test('every provider body maps to the same shape, coordinates rounded to 2 dp', () => {
  const shaped = Object.fromEntries(PROVIDERS.map((p) => [p.name, shapeGeo(p.map(BODIES[p.name]))]));
  assert.deepEqual(shaped['ipapi.co'], { country: 'Pakistan', countryCode: 'PK', region: 'Khyber Pakhtunkhwa', city: 'Aman Garh', latitude: 34.01, longitude: 71.93 });
  assert.deepEqual(shaped['ipwho.is'], { country: 'Pakistan', countryCode: 'PK', region: 'Khyber Pakhtunkhwa', city: 'Peshawar', latitude: 34.01, longitude: 71.58 });
  assert.deepEqual(shaped['freeipapi.com'], { country: 'Pakistan', countryCode: 'PK', region: 'Islamabad', city: 'Islamabad', latitude: 33.68, longitude: 73.05 });
});

test('every provider failure body is unusable', () => {
  for (const p of PROVIDERS) {
    assert.equal(shapeGeo(p.map(FAILED_BODIES[p.name])), null, `${p.name} failure must be null`);
  }
});

test('shapeGeo: partial data keeps what exists; "-" and junk become null', () => {
  assert.deepEqual(shapeGeo({ country: 'Pakistan', countryCode: 'pk', city: '-', latitude: 'x' }), {
    country: 'Pakistan', countryCode: 'PK', region: null, city: null, latitude: null, longitude: null,
  });
  assert.equal(shapeGeo(null), null);
  assert.equal(shapeGeo({ city: 'Lahore' }), null);
});

test('lookupIp: first provider answering wins and later ones are not called', async () => {
  stubProviders({});
  const geo = await lookupIp('39.32.10.5');
  assert.equal(geo.city, 'Aman Garh');
  assert.deepEqual(calls.map((c) => c.name), ['ipapi.co']);
  assert.ok(calls[0].options.signal, 'request must be abortable');
});

test('lookupIp: falls back when a provider is down, rate limited or blocked', async () => {
  stubProviders({ 'ipapi.co': 429, 'ipwho.is': 'throw' });
  const geo = await lookupIp('39.32.10.5');
  assert.equal(geo.city, 'Islamabad');
  assert.deepEqual(calls.map((c) => c.name), ['ipapi.co', 'ipwho.is', 'freeipapi.com']);

  calls = [];
  stubProviders({ 'ipapi.co': 'html' });
  assert.equal((await lookupIp('39.32.10.5')).city, 'Peshawar');
  assert.deepEqual(calls.map((c) => c.name), ['ipapi.co', 'ipwho.is']);
});

test('lookupIp: all providers failing resolves null', async () => {
  stubProviders({ 'ipapi.co': 'fail', 'ipwho.is': 503, 'freeipapi.com': 'throw' });
  assert.equal(await lookupIp('39.32.10.5'), null);
  assert.equal(calls.length, 3);
});

test('lookupIp: IPAPI_KEY is passed to ipapi.co only', async () => {
  process.env.IPAPI_KEY = 'k 1';
  stubProviders({ 'ipapi.co': 'fail' });
  await lookupIp('39.32.10.5');
  assert.match(calls[0].url, /ipapi\.co\/39\.32\.10\.5\/json\/\?key=k%201$/);
  assert.ok(!calls[1].url.includes('key='));
});

test('detectLocation: in production a private request IP never calls a provider', async () => {
  stubProviders({});
  const env = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    assert.equal(await detectLocation({ ip: '127.0.0.1' }), null);
    assert.equal(await detectLocation({ ip: '::ffff:10.0.0.4' }), null);
    assert.equal(calls.length, 0);
  } finally {
    if (env === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = env;
  }
});

test('detectLocation: in development a local request locates this machine\'s public IP', async () => {
  stubProviders({});
  const env = process.env.NODE_ENV;
  process.env.NODE_ENV = 'development';
  try {
    const geo = await detectLocation({ ip: '127.0.0.1' });
    assert.equal(geo.city, 'Aman Garh');
    assert.equal(calls.length, 1);
    // No IP in the URL: the provider locates the caller.
    assert.equal(calls[0].url, 'https://ipapi.co/json/');
    await detectLocation({ ip: '::1' });
    assert.equal(calls.length, 1, 'cached briefly');
  } finally {
    if (env === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = env;
  }
});

test('detectLocation: caches per IP and never puts the raw IP in the cache key', async () => {
  stubProviders({});
  const first = await detectLocation({ ip: '39.32.10.5' });
  const second = await detectLocation({ ip: '39.32.10.5' });
  assert.equal(first.city, 'Aman Garh');
  assert.deepEqual(second, first);
  assert.equal(calls.length, 1, 'second lookup must come from cache');
  assert.ok(cache.get('geo:39.32.10.5') === undefined);
});

test('detectLocation: a different IP (e.g. a VPN) is looked up on its own', async () => {
  stubProviders({});
  await detectLocation({ ip: '39.32.10.5' });
  await detectLocation({ ip: '8.8.4.4' });
  assert.equal(calls.length, 2);
});

test('detectLocation: concurrent requests share one lookup', async () => {
  stubProviders({});
  const results = await Promise.all([
    detectLocation({ ip: '39.32.10.6' }),
    detectLocation({ ip: '39.32.10.6' }),
  ]);
  assert.equal(calls.length, 1);
  assert.equal(results[1].city, 'Aman Garh');
});

test('detectLocation: a total failure is cached briefly instead of retried per request', async () => {
  stubProviders({ 'ipapi.co': 429, 'ipwho.is': 429, 'freeipapi.com': 429 });
  assert.equal(await detectLocation({ ip: '39.32.10.7' }), null);
  assert.equal(await detectLocation({ ip: '39.32.10.7' }), null);
  assert.equal(calls.length, 3, 'one pass through the chain, then cached');
});

test('detectLocation: GEO_DEV_IP overrides loopback outside production only', async () => {
  stubProviders({});
  const env = process.env.NODE_ENV;
  process.env.GEO_DEV_IP = '39.32.10.8';
  try {
    process.env.NODE_ENV = 'production';
    assert.equal(await detectLocation({ ip: '127.0.0.1' }), null);
    assert.equal(calls.length, 0);

    process.env.NODE_ENV = 'development';
    const geo = await detectLocation({ ip: '127.0.0.1' });
    assert.equal(geo.city, 'Aman Garh');
    assert.equal(calls.length, 1);
  } finally {
    if (env === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = env;
  }
});
