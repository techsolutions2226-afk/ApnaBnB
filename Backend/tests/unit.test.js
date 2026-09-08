// Backend unit smoke tests — run with: npm test (node --test tests)
// No external test framework; uses Node's built-in node:test runner.
const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  calculateMatchScore,
  determineMatchType,
  isMatchCandidate,
  normalizeSupply,
  normalizeDemand,
} = require('../utils/matchScore');
const {
  resolveSizeSqFt,
  scoreSizePoints,
  MARLA_TO_SQFT,
} = require('../utils/sizeUnits');
const { withIds } = require('../utils/serializeIds');
const { parsePagination, paginated } = require('../utils/pagination');

test('matchScore: perfect pair scores 100', () => {
  const property = {
    price: 10000000,
    location: { area: 'Gulberg' },
    bedrooms: 4,
    bathrooms: 3,
    size: 10,
    sizeUnit: 'Marla',
  };
  const requirement = {
    budget: { min: 9000000, max: 11000000 },
    location: { area: 'Gulberg' },
    bedrooms: 4,
    bathrooms: 3,
    size: '10 Marla',
  };
  assert.equal(calculateMatchScore(property, requirement), 100);
});

test('sizeUnits: 272 Sq. Ft. equals 1 Marla (Rawalpindi standard)', () => {
  const listingSqFt = resolveSizeSqFt(272, 'Sq. Ft.');
  const requirementMarla = resolveSizeSqFt('1 Marla');
  assert.ok(listingSqFt);
  assert.ok(requirementMarla);
  // Federal / ISB-RWP marla is 272.25 sq ft — 272 is within 0.1%.
  assert.ok(Math.abs(listingSqFt - requirementMarla) / requirementMarla < 0.01);
  assert.equal(scoreSizePoints(
    { size: 272, sizeUnit: 'Sq. Ft.' },
    { size: '1 Marla' },
  ), 10);
  assert.equal(MARLA_TO_SQFT, 272.25);
});

test('sizeUnits: legacy aliases normalize (sq ft, Sq Ft)', () => {
  assert.equal(resolveSizeSqFt(272, 'sq ft'), 272);
  assert.equal(resolveSizeSqFt(272, 'Sq Ft'), 272);
  assert.equal(resolveSizeSqFt('1 kanal'), resolveSizeSqFt(20, 'Marla'));
});

test('matchScore: Rawalpindi commercial shop — 272 sq ft listing ↔ 1 marla requirement', () => {
  const property = {
    price: 5000000,
    purpose: 'sale',
    propertyType: 'shop',
    location: { city: 'Rawalpindi', area: 'Commercial Market' },
    bedrooms: 0,
    bathrooms: 0,
    size: 272,
    sizeUnit: 'Sq. Ft.',
  };
  const requirement = {
    purpose: 'sale',
    propertyType: 'shop',
    budget: { min: 4000000, max: 6000000 },
    location: { city: 'Rawalpindi', area: 'Commercial Market' },
    bedrooms: 0,
    bathrooms: 0,
    size: '1 Marla',
  };

  assert.equal(isMatchCandidate(property, requirement), true);
  const score = calculateMatchScore(property, requirement);
  // budget 40 + area 20 + beds 20 + baths 10 + size 10 = 100
  assert.equal(score, 100);
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

test('pagination: disabled by default, enabled only with page/limit', () => {
  assert.equal(parsePagination({ query: {} }).enabled, false);
  const p = parsePagination({ query: { page: '2', limit: '10' } });
  assert.deepEqual({ page: p.page, limit: p.limit, skip: p.skip, take: p.take }, { page: 2, limit: 10, skip: 10, take: 10 });
  assert.equal(paginated([1, 2], 25, 2, 10).pages, 3);
  assert.equal(paginated([], 0, 1, 10).pages, 1);
});
