// Backend unit smoke tests — run with: npm test (node --test tests)
// No external test framework; uses Node's built-in node:test runner.
const { test } = require('node:test');
const assert = require('node:assert/strict');

process.env.MESSAGE_ENC_KEY = 'a'.repeat(64); // 32-byte key for messageCrypto

const {
  calculateMatchScore,
  determineMatchType,
  isMatchCandidate,
  normalizeSupply,
  normalizeDemand,
} = require('../utils/matchScore');
const { encryptMessage, decryptMessage } = require('../utils/messageCrypto');
const { withIds } = require('../utils/serializeIds');
const { filterPersonalInfo } = require('../utils/personalInfo');
const { parsePagination, paginated } = require('../utils/pagination');

test('matchScore: perfect pair scores 100', () => {
  const property = {
    price: 10000000,
    location: { area: 'Gulberg' },
    bedrooms: 4,
    bathrooms: 3,
    size: 10,
  };
  const requirement = {
    budget: { min: 9000000, max: 11000000 },
    location: { area: 'Gulberg' },
    bedrooms: 4,
    bathrooms: 3,
    size: 10,
  };
  assert.equal(calculateMatchScore(property, requirement), 100);
});

test('matchScore: budget outside band but within 10% still scores', () => {
  const property = { price: 12000000, location: {}, bedrooms: 0, bathrooms: 0 };
  const requirement = { budget: { min: 9000000, max: 11000000 }, location: {} };
  const score = calculateMatchScore(property, requirement);
  assert.ok(score > 0 && score <= 100);
});

test('isMatchCandidate: purpose mismatch is rejected', () => {
  const property = { purpose: 'sale', location: { city: 'Lahore' }, propertyType: 'house', price: 10000000 };
  const requirement = { purpose: 'rent', location: { city: 'Lahore' }, propertyType: 'house', budget: { min: 9000000, max: 11000000 } };
  assert.equal(isMatchCandidate(property, requirement), false);
});

test('isMatchCandidate: matching pair is accepted', () => {
  const property = { purpose: 'sale', location: { city: 'Lahore', area: 'Gulberg' }, propertyType: 'house', price: 10000000 };
  const requirement = { purpose: 'sale', location: { city: 'Lahore', area: 'Gulberg' }, propertyType: 'house', budget: { min: 9000000, max: 11000000 } };
  assert.equal(isMatchCandidate(property, requirement), true);
});

test('match types derive from acting roles', () => {
  assert.equal(determineMatchType('seller', 'buyer'), 'seller-buyer');
  assert.equal(determineMatchType('dealer', 'buyer'), 'dealer-buyer');
  assert.equal(determineMatchType('dealer', 'dealer'), 'dealer-dealer');
  assert.equal(determineMatchType('admin', 'buyer'), null);
  assert.equal(normalizeSupply('dealer'), 'dealer');
  assert.equal(normalizeSupply('buyer'), 'seller');
  assert.equal(normalizeDemand('dealer'), 'dealer');
  assert.equal(normalizeDemand('seller'), 'buyer');
});

test('messageCrypto: encrypt → decrypt round-trips', () => {
  const blob = encryptMessage('hello 03001234567');
  assert.ok(blob.startsWith('v1:'));
  assert.equal(decryptMessage(blob), 'hello 03001234567');
});

test('messageCrypto: plaintext passes through untouched', () => {
  assert.equal(decryptMessage('legacy plaintext'), 'legacy plaintext');
});

test('messageCrypto: tampered blob never crashes', () => {
  const blob = encryptMessage('secret');
  const tampered = blob.slice(0, -4) + 'beef';
  assert.equal(decryptMessage(tampered), '[unable to decrypt message]');
});

test('serializeIds: injects _id recursively without mutating dates', () => {
  const out = withIds({
    id: 'a',
    when: new Date('2026-01-01'),
    nested: { id: 'b', list: [{ id: 'c' }] },
  });
  assert.equal(out._id, 'a');
  assert.equal(out.nested._id, 'b');
  assert.equal(out.nested.list[0]._id, 'c');
  assert.ok(out.when instanceof Date);
});

test('personalInfo: filters phone, email and URL', () => {
  const filtered = filterPersonalInfo('Call 03001234567, mail me@x.com, see https://example.com');
  assert.ok(!filtered.includes('03001234567'));
  assert.ok(!filtered.includes('me@x.com'));
  assert.ok(!filtered.includes('example.com'));
  assert.ok(filtered.includes('[filtered]'));
});

test('pagination: disabled by default, enabled only with page/limit', () => {
  assert.equal(parsePagination({ query: {} }).enabled, false);
  const p = parsePagination({ query: { page: '2', limit: '10' } });
  assert.deepEqual({ page: p.page, limit: p.limit, skip: p.skip, take: p.take }, { page: 2, limit: 10, skip: 10, take: 10 });
  assert.equal(paginated([1, 2], 25, 2, 10).pages, 3);
  assert.equal(paginated([], 0, 1, 10).pages, 1);
});
