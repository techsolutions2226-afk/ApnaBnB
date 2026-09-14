/* Home page "Popular homes in <city>" rows — grouping and ranking.
 *
 * Pure functions, no database.
 *
 * Run with: npm test (node --test tests)
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { groupPopularByCity } = require('../utils/popularByCity');

let seq = 0;
const prop = (city, over = {}) => ({
  id: over.id || `p${++seq}`,
  title: 'Home',
  status: 'active',
  createdAt: new Date('2026-01-01'),
  listings: [],
  location: { city, area: 'Somewhere' },
  ...over,
});

test('groups by city and orders cities by listing count, then name', () => {
  const rows = groupPopularByCity([
    prop('Lahore'), prop('Islamabad'), prop('Lahore'), prop('Karachi'), prop('Islamabad'), prop('Lahore'),
  ]);
  assert.deepEqual(rows.map((r) => [r.city, r.total]), [
    ['Lahore', 3],
    ['Islamabad', 2],
    ['Karachi', 1],
  ]);
});

test('city names are grouped case- and whitespace-insensitively, keeping the common spelling', () => {
  const rows = groupPopularByCity([prop('Lahore'), prop(' lahore '), prop('Lahore')]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].city, 'Lahore');
  assert.equal(rows[0].total, 3);
});

test('listings without a city are skipped, and bad input returns no rows', () => {
  assert.deepEqual(groupPopularByCity([prop(''), prop('   '), { id: 'x', location: null }]), []);
  assert.deepEqual(groupPopularByCity(null), []);
});

test('within a city: featured first, then most viewed, then newest', () => {
  const rows = groupPopularByCity([
    prop('Lahore', { id: 'old-popular', listings: [{ views: 50 }, { views: 10 }], createdAt: new Date('2025-01-01') }),
    prop('Lahore', { id: 'new-quiet', listings: [{ views: 1 }], createdAt: new Date('2026-06-01') }),
    prop('Lahore', { id: 'featured', status: 'featured', listings: [], createdAt: new Date('2024-01-01') }),
    prop('Lahore', { id: 'newest-no-views', createdAt: new Date('2026-09-01') }),
    prop('Lahore', { id: 'older-no-views', createdAt: new Date('2026-02-01') }),
  ]);
  assert.deepEqual(rows[0].properties.map((p) => p.id), [
    'featured', 'old-popular', 'new-quiet', 'newest-no-views', 'older-no-views',
  ]);
});

test('perCity trims each row but total still counts every listing', () => {
  const many = Array.from({ length: 7 }, () => prop('Murree'));
  const [row] = groupPopularByCity(many, { perCity: 3 });
  assert.equal(row.properties.length, 3);
  assert.equal(row.total, 7);
});

test('the internal listings field never reaches the card payload', () => {
  const [row] = groupPopularByCity([prop('Lahore', { listings: [{ views: 4 }] })]);
  assert.ok(!('listings' in row.properties[0]));
  assert.equal(row.properties[0].location.city, 'Lahore');
});

test('input is not mutated', () => {
  const input = [prop('Lahore', { listings: [{ views: 2 }] }), prop('Lahore')];
  const before = JSON.stringify(input);
  groupPopularByCity(input, { perCity: 1 });
  assert.equal(JSON.stringify(input), before);
});
