/* Search location defaults — which city a detected IP location preselects,
 * how the hint text reads, and how cached / manual choices are stored.
 *
 * Run with: node --test tests/search-location.test.js
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const makeStorage = () => {
  const store = new Map();
  return {
    store,
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
};
globalThis.localStorage = makeStorage();
globalThis.sessionStorage = makeStorage();

const {
  resolveSearchCity,
  orderByProximity,
  locationOrigin,
  NEARBY_CITY_KM,
  distanceKm,
  readDetected,
  writeDetected,
  markNotDetected,
  wasNotDetected,
  getManualCity,
  setManualCity,
  DETECTED_TTL_MS,
  DETECTED_REFRESH_MS,
} = await import('../src/utils/searchLocation.js');
const { SEARCH_CITIES, CITY_CENTERS, SEARCH_COUNTRY_CODE } = await import(
  '../src/config/locations.js'
);

const MATCH = { cities: SEARCH_CITIES, centers: CITY_CENTERS, countryCode: SEARCH_COUNTRY_CODE };
const pk = (over = {}) => ({ country: 'Pakistan', countryCode: 'PK', region: 'Punjab', ...over });

beforeEach(() => {
  localStorage.store.clear();
  sessionStorage.store.clear();
});

test('every search city has a map centre (needed for nearest-city matching)', () => {
  for (const city of SEARCH_CITIES) {
    assert.ok(CITY_CENTERS[city], `${city} is missing from CITY_CENTERS`);
  }
});

test('resolveSearchCity: exact city name wins, ignoring case, accents and spacing', () => {
  assert.equal(resolveSearchCity(pk({ city: 'Lahore' }), MATCH), 'Lahore');
  assert.equal(resolveSearchCity(pk({ city: '  islamabad ' }), MATCH), 'Islamabad');
  assert.equal(resolveSearchCity(pk({ city: 'Dera Ghāzi Khān' }), MATCH), 'Dera Ghazi Khan');
});

test('resolveSearchCity: unknown town falls back to the nearest search city', () => {
  // Real ipapi answer for a PTCL address: a town ~23 km from Mardan.
  const amanGarh = pk({ city: 'Aman Garh', region: 'Khyber Pakhtunkhwa', latitude: 34.01, longitude: 71.93 });
  assert.equal(resolveSearchCity(amanGarh, MATCH), 'Mardan');
  // A Lahore suburb by coordinates only.
  assert.equal(resolveSearchCity(pk({ city: 'Raiwind', latitude: 31.25, longitude: 74.22 }), MATCH), 'Lahore');
});

test('resolveSearchCity: nothing within range, or no coordinates, gives no city', () => {
  // Middle of Balochistan, far from every search city.
  assert.equal(resolveSearchCity(pk({ city: 'Kharan', latitude: 28.58, longitude: 65.42 }), MATCH), '');
  assert.equal(resolveSearchCity(pk({ city: 'Somewhere' }), MATCH), '');
});

test('resolveSearchCity: other countries never match, even with a shared city name', () => {
  const india = { country: 'India', countryCode: 'IN', city: 'Hyderabad', latitude: 17.38, longitude: 78.49 };
  assert.equal(resolveSearchCity(india, MATCH), '');
  const amritsar = { country: 'India', countryCode: 'IN', city: 'Amritsar', latitude: 31.63, longitude: 74.87 };
  assert.equal(resolveSearchCity(amritsar, MATCH), '');
});

test('resolveSearchCity: missing or failed detection gives no city', () => {
  assert.equal(resolveSearchCity(null, MATCH), '');
  assert.equal(resolveSearchCity(undefined, MATCH), '');
  assert.equal(resolveSearchCity({ detected: false }, MATCH), '');
});

const cityOrigin = (city) => ({ city, ...CITY_CENTERS[city] });

test('orderByProximity: Islamabad visitor sees Islamabad, Rawalpindi, Murree first; Lahore after nearby', () => {
  const order = orderByProximity(SEARCH_CITIES, { origin: cityOrigin('Islamabad'), centers: CITY_CENTERS });
  assert.deepEqual(order.slice(0, 3), ['Islamabad', 'Rawalpindi', 'Murree']);
  assert.equal(order.length, SEARCH_CITIES.length);
  assert.ok(order.indexOf('Lahore') > order.indexOf('Jhelum'), 'Lahore (far) must follow Jhelum (nearby)');
});

test('orderByProximity: follows the rule for every origin — own, nearby by distance, then the rest', () => {
  for (const home of ['Islamabad', 'Lahore', 'Karachi', 'Peshawar', 'Quetta']) {
    const origin = cityOrigin(home);
    const order = orderByProximity(SEARCH_CITIES, { origin, centers: CITY_CENTERS });
    assert.equal(order[0], home);
    const km = order.slice(1).map((c) => distanceKm(origin, CITY_CENTERS[c]));
    const nearCount = km.filter((d) => d <= NEARBY_CITY_KM).length;
    km.slice(0, nearCount).forEach((d, i) => {
      assert.ok(d <= NEARBY_CITY_KM, `${home}: ${order[i + 1]} listed as nearby at ${d} km`);
      if (i > 0) assert.ok(d >= km[i - 1], `${home}: nearby cities must be closest first`);
    });
    km.slice(nearCount).forEach((d) => assert.ok(d > NEARBY_CITY_KM, `${home}: far city inside nearby group`));
    // With no counts, far cities keep the configured (major-first) order.
    const far = order.slice(1 + nearCount);
    assert.deepEqual(far, SEARCH_CITIES.filter((c) => far.includes(c)));
  }
});

test('orderByProximity: city rows — unknown or far cities are ordered by listing count', () => {
  const rows = [
    { city: 'Karachi', total: 3 },
    { city: 'Bahawalnagar', total: 9 }, // not in CITY_CENTERS
    { city: 'rawalpindi', total: 1 }, // backend spelling differs in case
    { city: 'Lahore', total: 5 },
    { city: 'Islamabad', total: 2 },
  ];
  const opts = { nameOf: (r) => r.city, countOf: (r) => r.total, centers: CITY_CENTERS };
  assert.deepEqual(
    orderByProximity(rows, { ...opts, origin: cityOrigin('Islamabad') }).map((r) => r.city),
    ['Islamabad', 'rawalpindi', 'Bahawalnagar', 'Lahore', 'Karachi'],
  );
});

test('orderByProximity: no origin means most listings first, input order on ties', () => {
  const rows = [{ city: 'A', total: 1 }, { city: 'B', total: 4 }, { city: 'C', total: 1 }, { city: 'D', total: 4 }];
  const order = orderByProximity(rows, { nameOf: (r) => r.city, countOf: (r) => r.total, origin: null });
  assert.deepEqual(order.map((r) => r.city), ['B', 'D', 'A', 'C']);
  assert.deepEqual(orderByProximity(SEARCH_CITIES, { origin: null, centers: CITY_CENTERS }), SEARCH_CITIES);
  assert.deepEqual(orderByProximity(null), []);
});

test('locationOrigin: detected coordinates, city fallback, and nothing outside the country', () => {
  const amanGarh = pk({ city: 'Aman Garh', latitude: 34.01, longitude: 71.93 });
  assert.deepEqual(locationOrigin(amanGarh, MATCH), { city: 'Mardan', lat: 34.01, lng: 71.93 });
  assert.deepEqual(locationOrigin(pk({ city: 'Lahore' }), MATCH), { city: 'Lahore', ...CITY_CENTERS.Lahore });
  assert.equal(locationOrigin({ countryCode: 'US', country: 'United States', city: 'Austin', latitude: 30, longitude: -97 }, MATCH), null);
  assert.equal(locationOrigin(null, MATCH), null);
  assert.equal(locationOrigin(pk({ city: 'Nowhere' }), MATCH), null);
});

test('distanceKm: Lahore to Islamabad is about 270 km', () => {
  const km = distanceKm(CITY_CENTERS.Lahore, CITY_CENTERS.Islamabad);
  assert.ok(km > 250 && km < 290, `got ${km}`);
});

test('detected cache: fresh, stale and expired entries', () => {
  const now = 1_000_000_000_000;
  writeDetected(pk({ city: 'Lahore' }), now);
  assert.deepEqual(readDetected(now + 1000), { geo: pk({ city: 'Lahore' }), stale: false });
  assert.equal(readDetected(now + DETECTED_REFRESH_MS + 1).stale, true);
  assert.equal(readDetected(now + DETECTED_TTL_MS + 1), null);
});

test('detected cache: failures are never stored, and corrupt data reads as empty', () => {
  writeDetected(null);
  writeDetected({ detected: false });
  assert.equal(readDetected(), null);
  localStorage.setItem('detected_location_v1', '{not json');
  assert.equal(readDetected(), null);
});

test('not-detected flag is per tab and cleared by a later success', () => {
  assert.equal(wasNotDetected(), false);
  markNotDetected();
  assert.equal(wasNotDetected(), true);
  writeDetected(pk({ city: 'Lahore' }));
  assert.equal(wasNotDetected(), false);
});

test('manual city: null until chosen, and a cleared choice is remembered as ""', () => {
  assert.equal(getManualCity(), null);
  setManualCity('Karachi');
  assert.equal(getManualCity(), 'Karachi');
  setManualCity('');
  assert.equal(getManualCity(), '');
});

test('blocked storage never throws', () => {
  const saved = { local: globalThis.localStorage, session: globalThis.sessionStorage };
  const blocked = {
    getItem: () => { throw new Error('blocked'); },
    setItem: () => { throw new Error('blocked'); },
    removeItem: () => { throw new Error('blocked'); },
  };
  globalThis.localStorage = blocked;
  globalThis.sessionStorage = blocked;
  try {
    assert.equal(readDetected(), null);
    assert.doesNotThrow(() => writeDetected(pk({ city: 'Lahore' })));
    assert.equal(getManualCity(), null);
    assert.doesNotThrow(() => setManualCity('Lahore'));
    assert.equal(wasNotDetected(), false);
  } finally {
    globalThis.localStorage = saved.local;
    globalThis.sessionStorage = saved.session;
  }
});
