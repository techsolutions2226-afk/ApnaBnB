/* ─── ipGeolocation — approximate visitor location from the request IP ───
   Powers the home page's default search city. The result is a GUESS, never
   the user's real location: it is not written to the database, and the raw
   IP never leaves this module (not in responses, logs or cache keys).

   Provider: ipapi.co over HTTPS with Node's built-in fetch. Works without a
   key at low volume; IPAPI_KEY raises the quota. Every lookup is cached per
   IP (hashed) so a visitor costs one provider call, and failures are cached
   briefly so a provider outage or 429 cannot turn into a request storm.

   Always resolves — null means "unknown", which callers treat as normal.
   ─────────────────────────────────────────────── */

const crypto = require('crypto');
const cache = require('./cache');
const { clientIp } = require('./sessions');

const PROVIDER_URL = 'https://ipapi.co';
// Kept short: the home search bar waits on this before it renders.
const LOOKUP_TIMEOUT_MS = 1500;
const SUCCESS_TTL_MS = 6 * 60 * 60 * 1000;
const FAILURE_TTL_MS = 5 * 60 * 1000;

/* ── Public-address check ──
   Loopback, private, link-local and CGNAT ranges have no geography, so they
   never reach the provider (this is also what a local dev request looks like). */
const IPV4_PRIVATE = [
  [10, 0, 8],
  [127, 0, 8],
  [169, 254, 16],
  [172, 16, 12],
  [192, 168, 16],
  [100, 64, 10],
  [0, 0, 8],
];

const ipv4ToInt = (ip) => {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  const nums = parts.map((p) => (/^\d{1,3}$/.test(p) ? Number(p) : NaN));
  if (nums.some((n) => Number.isNaN(n) || n > 255)) return null;
  return ((nums[0] << 24) >>> 0) + (nums[1] << 16) + (nums[2] << 8) + nums[3];
};

const isPublicIpv4 = (ip) => {
  const value = ipv4ToInt(ip);
  if (value === null) return false;
  return !IPV4_PRIVATE.some(([a, b, bits]) => {
    const base = ((a << 24) >>> 0) + (b << 16);
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return ((value & mask) >>> 0) === ((base & mask) >>> 0);
  });
};

const isPublicIp = (rawIp) => {
  let ip = String(rawIp || '').trim().toLowerCase();
  if (!ip) return false;
  // IPv4-mapped IPv6 (how Node reports IPv4 on a dual-stack socket).
  if (ip.startsWith('::ffff:') && ip.includes('.')) ip = ip.slice(7);
  if (ip.includes('.')) return isPublicIpv4(ip);
  if (!ip.includes(':')) return false;
  if (ip === '::' || ip === '::1') return false;
  // fc00::/7 unique-local, fe80::/10 link-local.
  if (/^f[cd]/.test(ip) || /^fe[89ab]/.test(ip)) return false;
  return true;
};

/* ── Response shaping ── */
const text = (value) => {
  const s = typeof value === 'string' ? value.trim() : '';
  return s ? s.slice(0, 100) : null;
};

// 2 dp (~1 km) — the IP guess is city-level anyway, so extra precision would
// only suggest an accuracy we do not have.
const coord = (value, limit) => {
  const n = Number(value);
  if (value === null || value === undefined || value === '' || !Number.isFinite(n)) return null;
  if (Math.abs(n) > limit) return null;
  return Math.round(n * 100) / 100;
};

const normalizeGeo = (raw) => {
  if (!raw || typeof raw !== 'object' || raw.error) return null;
  const geo = {
    country: text(raw.country_name),
    countryCode: text(raw.country_code || raw.country),
    region: text(raw.region),
    city: text(raw.city),
    latitude: coord(raw.latitude, 90),
    longitude: coord(raw.longitude, 180),
  };
  // Without a country there is nothing useful to personalise with.
  return geo.country || geo.countryCode ? geo : null;
};

/* ── Provider call ── */
const lookupIp = async (ip) => {
  const key = process.env.IPAPI_KEY;
  const url = `${PROVIDER_URL}/${encodeURIComponent(ip)}/json/${key ? `?key=${encodeURIComponent(key)}` : ''}`;
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'ApnaBnB/1.0' },
      signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
    });
    if (!response.ok) {
      console.warn(`IP geolocation: provider returned HTTP ${response.status}`);
      return null;
    }
    const geo = normalizeGeo(await response.json());
    if (!geo) console.warn('IP geolocation: provider returned no usable location');
    return geo;
  } catch (error) {
    console.warn(`IP geolocation: lookup failed (${error.name})`);
    return null;
  }
};

/* ── Entry point ── */
const cacheKeyFor = (ip) =>
  `geo:${crypto.createHash('sha256').update(ip).digest('hex').slice(0, 32)}`;

const inFlight = new Map();

/* GEO_DEV_IP lets a developer test with a real public address locally, where
   every request otherwise arrives from loopback. Ignored in production. */
const resolveIp = (req) => {
  const devIp = process.env.NODE_ENV !== 'production' && process.env.GEO_DEV_IP;
  return devIp ? devIp.trim() : clientIp(req);
};

const detectLocation = async (req) => {
  const ip = resolveIp(req);
  if (!isPublicIp(ip)) return null;

  const key = cacheKeyFor(ip);
  const hit = cache.get(key);
  if (hit !== undefined) return hit.geo;

  // Concurrent requests from one visitor share a single provider call.
  if (inFlight.has(key)) return inFlight.get(key);
  const pending = lookupIp(ip)
    .then((geo) => {
      cache.set(key, { geo }, geo ? SUCCESS_TTL_MS : FAILURE_TTL_MS);
      return geo;
    })
    .finally(() => inFlight.delete(key));
  inFlight.set(key, pending);
  return pending;
};

module.exports = {
  LOOKUP_TIMEOUT_MS,
  isPublicIp,
  normalizeGeo,
  lookupIp,
  detectLocation,
};
