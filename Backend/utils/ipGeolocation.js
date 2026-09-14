/* ─── ipGeolocation — approximate visitor location from the request IP ───
   Powers the home page's location-ordered property rows. The result is a
   GUESS, never the user's real location: it is not written to the database,
   and the raw IP never leaves this module (not in responses, logs or cache
   keys). Behind a VPN the request IP is the VPN's, so that is what is located.

   Providers are tried in order until one answers, so one service being down,
   slow or rate-limited does not stop detection. All are HTTPS via Node's
   built-in fetch; ipapi.co also takes an optional IPAPI_KEY for more quota.
   Every lookup is cached per IP (hashed) so a visitor costs one provider call,
   and a total failure is cached briefly so an outage cannot become a request
   storm.

   Always resolves — null means "unknown", which callers treat as normal.
   ─────────────────────────────────────────────── */

const crypto = require('crypto');
const cache = require('./cache');
const { clientIp } = require('./sessions');

/* Per provider. Generous enough that a normally-slow answer still counts:
   a provider timing out used to cost the visitor their location for the whole
   failure-cache window, which showed up as "no properties found". */
const LOOKUP_TIMEOUT_MS = 3000;
const SUCCESS_TTL_MS = 6 * 60 * 60 * 1000;
/* Short: a failure is usually a blip (slow provider, momentary quota), so the
   next page load should try again rather than keep the visitor location-less. */
const FAILURE_TTL_MS = 20 * 1000;

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
  // Some providers use "-" for an unknown field.
  return s && s !== '-' ? s.slice(0, 100) : null;
};

// 2 dp (~1 km) — the IP guess is city-level anyway, so extra precision would
// only suggest an accuracy we do not have.
const coord = (value, limit) => {
  const n = Number(value);
  if (value === null || value === undefined || value === '' || !Number.isFinite(n)) return null;
  if (Math.abs(n) > limit) return null;
  return Math.round(n * 100) / 100;
};

/* Provider fields → { country, countryCode, region, city, latitude, longitude }. */
const shapeGeo = (fields) => {
  if (!fields) return null;
  const countryCode = text(fields.countryCode);
  const geo = {
    country: text(fields.country),
    countryCode: countryCode ? countryCode.toUpperCase() : null,
    region: text(fields.region),
    city: text(fields.city),
    latitude: coord(fields.latitude, 90),
    longitude: coord(fields.longitude, 180),
  };
  // Without a country there is nothing useful to personalise with.
  return geo.country || geo.countryCode ? geo : null;
};

/* ── Providers, tried in this order ──
   `url(ip)` — with ip = null the provider locates the CALLER, i.e. this
   server's own public IP (used for local development, see detectLocation).
   `map` returns the provider's fields in our names, or null when the body
   says the lookup failed (reserved range, quota, bad input). */
const PROVIDERS = [
  {
    name: 'ipapi.co',
    url: (ip) => {
      const key = process.env.IPAPI_KEY;
      const path = ip ? `${encodeURIComponent(ip)}/json/` : 'json/';
      return `https://ipapi.co/${path}${key ? `?key=${encodeURIComponent(key)}` : ''}`;
    },
    map: (raw) =>
      raw.error
        ? null
        : { country: raw.country_name, countryCode: raw.country_code, region: raw.region, city: raw.city, latitude: raw.latitude, longitude: raw.longitude },
  },
  {
    name: 'ipwho.is',
    url: (ip) => `https://ipwho.is/${ip ? encodeURIComponent(ip) : ''}`,
    map: (raw) =>
      raw.success === false
        ? null
        : { country: raw.country, countryCode: raw.country_code, region: raw.region, city: raw.city, latitude: raw.latitude, longitude: raw.longitude },
  },
  {
    name: 'freeipapi.com',
    url: (ip) => `https://freeipapi.com/api/json/${ip ? encodeURIComponent(ip) : ''}`,
    map: (raw) => ({ country: raw.countryName, countryCode: raw.countryCode, region: raw.regionName, city: raw.cityName, latitude: raw.latitude, longitude: raw.longitude }),
  },
];

/* A provider that refuses us (403 blocked, 429 rate limited) keeps refusing
   for a while, so it is skipped for this long instead of being asked — and
   logged — on every lookup. */
const REFUSED_COOLDOWN_MS = 10 * 60 * 1000;
const refusedUntil = new Map(); // provider name -> timestamp

/* One provider: the shaped location, or null (logged without the IP). */
const queryProvider = async (provider, ip) => {
  if ((refusedUntil.get(provider.name) || 0) > Date.now()) return null;
  try {
    const response = await fetch(provider.url(ip), {
      headers: { Accept: 'application/json', 'User-Agent': 'ApnaBnB/1.0' },
      signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
    });
    if (!response.ok) {
      if (response.status === 403 || response.status === 429) {
        refusedUntil.set(provider.name, Date.now() + REFUSED_COOLDOWN_MS);
        console.warn(`IP geolocation: ${provider.name} refused (HTTP ${response.status}); using the next provider for 10 minutes`);
      } else {
        console.warn(`IP geolocation: ${provider.name} returned HTTP ${response.status}`);
      }
      return null;
    }
    const raw = await response.json();
    const geo = raw && typeof raw === 'object' ? shapeGeo(provider.map(raw)) : null;
    if (!geo) console.warn(`IP geolocation: ${provider.name} returned no usable location`);
    return geo;
  } catch (error) {
    console.warn(`IP geolocation: ${provider.name} failed (${error.name})`);
    return null;
  }
};

/* First provider that answers wins. */
const lookupIp = async (ip, providers = PROVIDERS) => {
  for (const provider of providers) {
    const geo = await queryProvider(provider, ip);
    if (geo) return geo;
  }
  return null;
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

/* Local development: the site is opened on this machine, so the request comes
   from loopback / the LAN and has no location. Locate this machine's own
   public IP instead — which is the developer's real connection, and changes
   when they switch VPN. Never in production, where a private request IP means
   a misconfigured proxy and must not be replaced by the server's location. */
const SELF_KEY = 'geo:self';
// Short, so switching VPN shows up within a minute.
const SELF_TTL_MS = 60 * 1000;
const useMachineIp = (ip) => process.env.NODE_ENV !== 'production' && !isPublicIp(ip);

const cachedLookup = (key, ip, successTtl) => {
  const hit = cache.get(key);
  if (hit !== undefined) return Promise.resolve(hit.geo);

  // Concurrent requests from one visitor share a single provider call.
  if (inFlight.has(key)) return inFlight.get(key);
  const pending = lookupIp(ip)
    .then((geo) => {
      cache.set(key, { geo }, geo ? successTtl : FAILURE_TTL_MS);
      return geo;
    })
    .finally(() => inFlight.delete(key));
  inFlight.set(key, pending);
  return pending;
};

const detectLocation = async (req) => {
  const ip = resolveIp(req);
  if (isPublicIp(ip)) return cachedLookup(cacheKeyFor(ip), ip, SUCCESS_TTL_MS);
  if (useMachineIp(ip)) return cachedLookup(SELF_KEY, null, SELF_TTL_MS);
  return null;
};

/* Why detection did or did not work, WITHOUT revealing the address.
   `publicIp: false` behind a proxy means the app is not trusting that proxy
   (see TRUST_PROXY in index.js) — the usual cause of every visitor appearing
   to be in the same city. */
const describeRequestIp = (req) => {
  const ip = resolveIp(req);
  return {
    publicIp: isPublicIp(ip),
    proxyTrusted: Boolean(req?.app?.get?.('trust proxy')),
    forwardedHeader: Boolean(req?.headers?.['x-forwarded-for']),
    usingDevIp: Boolean(process.env.NODE_ENV !== 'production' && process.env.GEO_DEV_IP),
    usingMachineIp: useMachineIp(ip),
    nodeEnv: process.env.NODE_ENV || 'development',
  };
};

/* Test hook: forget provider cooldowns. */
const resetProviderCooldowns = () => refusedUntil.clear();

module.exports = {
  LOOKUP_TIMEOUT_MS,
  resetProviderCooldowns,
  PROVIDERS,
  isPublicIp,
  shapeGeo,
  lookupIp,
  detectLocation,
  describeRequestIp,
};
