/* Ranking rules for "similar properties" on the property detail page.
 *
 * Pure functions, no database — the scoring is what decides whether the row
 * is useful, and it is the part most likely to drift when weights are tuned.
 *
 * Run with: npm test (node --test tests)
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  scorePrice,
  scoreBedrooms,
  scoreRelatedProperty,
  rankRelatedProperties,
  buildCandidateTiers,
  VISIBLE_STATUSES,
} = require('../utils/relatedProperties');

const property = (over = {}) => ({
  id: over.id || 'base',
  price: 20000000,
  purpose: 'sale',
  category: 'home',
  propertyType: 'house',
  size: 10,
  sizeUnit: 'Marla',
  bedrooms: 4,
  createdAt: new Date('2026-01-01'),
  location: { city: 'Lahore', area: 'DHA' },
  ...over,
});

test('scorePrice: identical price scores full marks, distance decays to zero', () => {
  assert.equal(scorePrice(1000, 1000), 25);
  assert.ok(scorePrice(1000, 1100) > scorePrice(1000, 1300));
  // Half again as expensive is not a comparable property.
  assert.equal(scorePrice(1000, 1500), 0);
  assert.equal(scorePrice(1000, 500), 0);
  // Missing or nonsensical prices must not throw or score.
  assert.equal(scorePrice(0, 1000), 0);
  assert.equal(scorePrice(1000, undefined), 0);
});

test('scoreBedrooms: exact beats off-by-one beats unrelated', () => {
  assert.equal(scoreBedrooms({ bedrooms: 4 }, { bedrooms: 4 }), 10);
  assert.equal(scoreBedrooms({ bedrooms: 4 }, { bedrooms: 5 }), 5);
  assert.equal(scoreBedrooms({ bedrooms: 4 }, { bedrooms: 7 }), 0);
  // A plot has no bedrooms; that must score 0, not NaN.
  assert.equal(scoreBedrooms({ bedrooms: null }, { bedrooms: 4 }), 0);
});

test('same area outranks same city', () => {
  const base = property();
  const sameArea = property({ id: 'a' });
  const sameCityOnly = property({ id: 'b', location: { city: 'Lahore', area: 'Gulberg' } });

  assert.ok(
    scoreRelatedProperty(base, sameArea) > scoreRelatedProperty(base, sameCityOnly),
    'a listing in the same area should rank above one merely in the same city',
  );
});

test('same property type outranks same category', () => {
  const base = property();
  const sameType = property({ id: 'a' });
  const sameCategoryOnly = property({ id: 'b', propertyType: 'flat' });

  assert.ok(scoreRelatedProperty(base, sameType) > scoreRelatedProperty(base, sameCategoryOnly));
});

test('size is compared after unit conversion, not as a raw number', () => {
  const base = property({ size: 20, sizeUnit: 'Marla' });
  // 1 Kanal = 20 Marla — the same area written a different way.
  const sameSizeOtherUnit = property({ id: 'a', size: 1, sizeUnit: 'Kanal' });
  const genuinelySmaller = property({ id: 'b', size: 5, sizeUnit: 'Marla' });

  assert.ok(
    scoreRelatedProperty(base, sameSizeOtherUnit) > scoreRelatedProperty(base, genuinelySmaller),
    '1 Kanal should be treated as equal to 20 Marla',
  );
});

test('ranking is deterministic and excludes the property being viewed', () => {
  const base = property();
  const candidates = [
    property({ id: 'far', location: { city: 'Karachi', area: 'Clifton' }, price: 40000000 }),
    property({ id: 'near' }),
    property({ id: 'base' }), // the property itself
    property({ id: 'mid', location: { city: 'Lahore', area: 'Gulberg' } }),
  ];

  const first = rankRelatedProperties(base, candidates, 6).map((p) => p.id);
  const second = rankRelatedProperties(base, candidates, 6).map((p) => p.id);

  assert.deepEqual(first, second, 'the same inputs must always produce the same order');
  assert.ok(!first.includes('base'), 'the current property must never appear in its own row');
  assert.deepEqual(first, ['near', 'mid', 'far']);
});

test('ranking respects the requested limit', () => {
  const base = property();
  const many = Array.from({ length: 20 }, (_, i) => property({ id: `p${i}` }));
  assert.equal(rankRelatedProperties(base, many, 6).length, 6);
});

test('candidate tiers never mix sale with rent, and only show visible listings', () => {
  const tiers = buildCandidateTiers(property({ purpose: 'rent' }));
  assert.ok(tiers.length > 1, 'there should be a fallback tier for thin markets');

  for (const tier of tiers) {
    assert.equal(tier.purpose, 'rent', 'purpose must never be relaxed');
    assert.deepEqual(tier.status, { in: VISIBLE_STATUSES });
    assert.deepEqual(tier.id, { not: 'base' });
  }

  // Sold, pending and rejected listings are dead ends for a browser.
  assert.ok(!VISIBLE_STATUSES.includes('sold'));
  assert.ok(!VISIBLE_STATUSES.includes('pending'));
  assert.ok(!VISIBLE_STATUSES.includes('rejected'));
});

test('tiers widen: the first is the narrowest, the last has no location filter', () => {
  const tiers = buildCandidateTiers(property());
  assert.ok(tiers[0].location, 'the first tier should be area-scoped');
  assert.ok(tiers[0].price, 'the first tier should also band the price');
  assert.ok(!tiers[tiers.length - 1].location, 'the last tier should drop the location filter');
});

test('a property with no area or city still produces a usable tier', () => {
  const orphan = property({ location: {} });
  const tiers = buildCandidateTiers(orphan);
  assert.ok(tiers.length >= 1, 'there must always be at least one query to run');
  assert.equal(tiers[0].purpose, 'sale');
});
