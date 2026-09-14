/* Visitor location on the home page — which city an IP location belongs to,
 * the nearest-first ordering, what the property area shows (rows or a "No
 * properties found" message), and that the location is never kept in the
 * browser (it is detected again on every page load).
 *
 * Run with: node --test tests/search-location.test.js
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const {
  resolveSearchCity,
  orderByProximity,
  locationOrigin,
  planPropertyRows,
  sameCity,
  NEARBY_CITY_KM,
  distanceKm,
} = await import('../src/utils/searchLocation.js');
const { SEARCH_CITIES, CITY_CENTERS, SEARCH_COUNTRY_CODE } = await import(
  '../src/config/locations.js'
);

const MATCH = { cities: SEARCH_CITIES, centers: CITY_CENTERS, countryCode: SEARCH_COUNTRY_CODE };
const PLAN = { centers: CITY_CENTERS, countryCode: SEARCH_COUNTRY_CODE, searchCities: SEARCH_CITIES };
const pk = (over = {}) => ({ country: 'Pakistan', countryCode: 'PK', region: 'Punjab', ...over });
const row = (city, total = 2) => ({ city, total, properties: [] });

test('every search city has a map centre (needed for nearest-city matching)', () => {
  for (const city of SEARCH_CITIES) {
    assert.ok(CITY_CENTERS[city], `${city} is missing from CITY_CENTERS`);
  }
});

test('sameCity: ignores case, accents, spaces and punctuation; empty never matches', () => {
  assert.equal(sameCity('Dera Ghāzi Khān', 'dera ghazi khan'), true);
  assert.equal(sameCity(' islamabad ', 'Islamabad'), true);
  assert.equal(sameCity('Lahore', 'Karachi'), false);
  assert.equal(sameCity('', ''), false);
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
  assert.equal(resolveSearchCity(pk({ city: 'Raiwind', latitude: 31.25, longitude: 74.22 }), MATCH), 'Lahore');
});

test('resolveSearchCity: nothing within range, other countries, or no detection give no city', () => {
  assert.equal(resolveSearchCity(pk({ city: 'Kharan', latitude: 28.58, longitude: 65.42 }), MATCH), '');
  assert.equal(resolveSearchCity(pk({ city: 'Somewhere' }), MATCH), '');
  assert.equal(resolveSearchCity({ country: 'India', countryCode: 'IN', city: 'Hyderabad', latitude: 17.38, longitude: 78.49 }, MATCH), '');
  assert.equal(resolveSearchCity(null, MATCH), '');
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
    const far = order.slice(1 + nearCount);
    assert.deepEqual(far, SEARCH_CITIES.filter((c) => far.includes(c)));
  }
});

test('orderByProximity: unknown or far cities are ordered by listing count; no origin → count only', () => {
  const rows = [row('Karachi', 3), row('Bahawalnagar', 9), row('rawalpindi', 1), row('Lahore', 5), row('Islamabad', 2)];
  const opts = { nameOf: (r) => r.city, countOf: (r) => r.total, centers: CITY_CENTERS };
  assert.deepEqual(
    orderByProximity(rows, { ...opts, origin: cityOrigin('Islamabad') }).map((r) => r.city),
    ['Islamabad', 'rawalpindi', 'Bahawalnagar', 'Lahore', 'Karachi'],
  );
  assert.deepEqual(
    orderByProximity(rows, { ...opts, origin: null }).map((r) => r.city),
    ['Bahawalnagar', 'Lahore', 'Karachi', 'Islamabad', 'rawalpindi'],
  );
  assert.deepEqual(orderByProximity(null), []);
});

test('locationOrigin: detected coordinates, city fallback, and nothing outside the country', () => {
  const amanGarh = pk({ city: 'Aman Garh', latitude: 34.01, longitude: 71.93 });
  assert.deepEqual(locationOrigin(amanGarh, MATCH), { city: 'Mardan', lat: 34.01, lng: 71.93 });
  assert.deepEqual(locationOrigin(pk({ city: 'Lahore' }), MATCH), { city: 'Lahore', ...CITY_CENTERS.Lahore });
  assert.equal(locationOrigin({ countryCode: 'US', country: 'United States', city: 'Austin', latitude: 30, longitude: -97 }, MATCH), null);
  assert.equal(locationOrigin(null, MATCH), null);
});

test('planPropertyRows: location not detected → message only', () => {
  assert.deepEqual(planPropertyRows(null, [row('Lahore')], PLAN), { kind: 'undetected' });
  assert.deepEqual(planPropertyRows(undefined, [row('Lahore')], PLAN), { kind: 'undetected' });
});

test('planPropertyRows: a country without listings (e.g. VPN in the USA) → country message only', () => {
  const usa = { country: 'United States', countryCode: 'US', city: 'Austin', latitude: 30.27, longitude: -97.74 };
  assert.deepEqual(planPropertyRows(usa, [row('Lahore'), row('Karachi')], PLAN), { kind: 'no-country', country: 'United States' });
});

test('planPropertyRows: listings country with no listings anywhere → country message only', () => {
  assert.deepEqual(planPropertyRows(pk({ city: 'Lahore' }), [], PLAN), { kind: 'no-country', country: 'Pakistan' });
  assert.deepEqual(planPropertyRows(pk({ city: 'Lahore' }), [row('Lahore', 0)], PLAN), { kind: 'no-country', country: 'Pakistan' });
});

test('planPropertyRows: own city has listings → rows nearest first, no message', () => {
  const plan = planPropertyRows(
    pk({ city: 'Islamabad', latitude: 33.72, longitude: 73.06 }),
    [row('Lahore', 7), row('Murree', 2), row('Islamabad', 7), row('Karachi', 2), row('Rawalpindi', 5)],
    PLAN,
  );
  assert.equal(plan.kind, 'rows');
  assert.equal(plan.missingCity, '');
  assert.deepEqual(plan.rows.map((r) => r.city), ['Islamabad', 'Rawalpindi', 'Murree', 'Lahore', 'Karachi']);
});

test('planPropertyRows: own city has no listings → city message, then that country\'s other cities', () => {
  const plan = planPropertyRows(
    pk({ city: 'Gujranwala', latitude: 32.19, longitude: 74.19 }),
    [row('Karachi', 2), row('Lahore', 7), row('Sialkot', 2)],
    PLAN,
  );
  assert.equal(plan.kind, 'rows');
  assert.equal(plan.missingCity, 'Gujranwala');
  // Sialkot (~45 km) and Lahore (~76 km) are nearby, closest first; Karachi is far.
  assert.deepEqual(plan.rows.map((r) => r.city), ['Sialkot', 'Lahore', 'Karachi']);
});

test('planPropertyRows: a town outside every search city is named in the message', () => {
  const plan = planPropertyRows(pk({ city: 'Kharan', latitude: 28.58, longitude: 65.42 }), [row('Quetta', 2)], PLAN);
  assert.equal(plan.kind, 'rows');
  assert.equal(plan.missingCity, 'Kharan');
});

test('the detected location is never stored in the browser (fresh on every page load)', () => {
  const src = fs.readFileSync(path.join(import.meta.dirname, '..', 'src', 'utils', 'locationDetection.js'), 'utf8');
  assert.doesNotMatch(src, /setItem\(/, 'locationDetection must not write storage');
  const hook = fs.readFileSync(path.join(import.meta.dirname, '..', 'src', 'hooks', 'useVisitorLocation.js'), 'utf8');
  assert.doesNotMatch(hook, /localStorage|sessionStorage/, 'useVisitorLocation must not use storage');
});
