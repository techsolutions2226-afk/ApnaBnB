/* ─── relatedProperties ───
   "Similar properties" ranking for the property detail page.

   No AI: similarity here is fully described by the structured fields we
   already validate on every listing (city, area, type, price, size, beds).
   A weighted score over those is both cheaper and more precise than an
   embedding over the free-text description, and it is deterministic — the
   same listing always produces the same row, which is what makes it
   cacheable.

   Mirrors the shape of utils/matchScore.js (property ↔ requirement) but scores
   property ↔ property, and reuses its unit handling so Marla / Kanal / sq ft
   compare correctly.

   Weights (0-100):
     area       30  (same area)          10  (same city only)
     type       25  (same propertyType)  10  (same category only)
     price      25  sliding, by how close the price is
     size       10  via scoreSizePoints (±10% → 10, ±20% → 5)
     bedrooms   10  (exact)               5  (off by one)
   ─────────────────────────────────────────────── */

const { scoreSizePoints } = require('./sizeUnits');

/* Only these are worth showing. `pending` and `rejected` are not public, and
   a sold/rented listing is a dead end for someone browsing. */
const VISIBLE_STATUSES = ['active', 'featured'];

/* How far from the base price a candidate may sit and still be a candidate.
   Wide enough to survive a thin market, narrow enough that a 5-crore house
   never sits under a 50-lakh flat. */
const PRICE_BAND = { min: 0.6, max: 1.6 };

const norm = (value) => String(value || '').trim().toLowerCase();

/* Location is a JSON column, so read it defensively — older rows predate some
   of these keys. */
const cityOf = (property) => norm(property?.location?.city);
const areaOf = (property) => norm(property?.location?.area);

/* 0-25, falling off smoothly with relative price distance. A candidate at the
   same price scores 25; one 50% away scores 0. Smooth rather than banded so
   ordering stays stable when two candidates are close. */
const scorePrice = (basePrice, candidatePrice) => {
  const base = Number(basePrice);
  const other = Number(candidatePrice);
  if (!base || !other || base <= 0) return 0;
  const distance = Math.abs(other - base) / base;
  if (distance >= 0.5) return 0;
  return Math.round((1 - distance / 0.5) * 25);
};

const scoreBedrooms = (base, candidate) => {
  if (base?.bedrooms == null || candidate?.bedrooms == null) return 0;
  const diff = Math.abs(base.bedrooms - candidate.bedrooms);
  if (diff === 0) return 10;
  if (diff === 1) return 5;
  return 0;
};

/* Score one candidate against the property being viewed. */
const scoreRelatedProperty = (base, candidate) => {
  let score = 0;

  const baseArea = areaOf(base);
  const candidateArea = areaOf(candidate);
  if (baseArea && candidateArea && baseArea === candidateArea) score += 30;
  else if (cityOf(base) && cityOf(base) === cityOf(candidate)) score += 10;

  if (norm(base.propertyType) && norm(base.propertyType) === norm(candidate.propertyType)) {
    score += 25;
  } else if (norm(base.category) && norm(base.category) === norm(candidate.category)) {
    score += 10;
  }

  score += scorePrice(base.price, candidate.price);
  // scoreSizePoints takes (property, requirement) but only reads size/sizeUnit
  // off each side, so a property↔property comparison is the same operation.
  score += scoreSizePoints(candidate, base);
  score += scoreBedrooms(base, candidate);

  return score;
};

/* Rank and trim. Ties break on price closeness, then on recency, so the order
   is fully determined — no shuffling between requests for the same listing. */
const rankRelatedProperties = (base, candidates, limit) =>
  candidates
    .filter((c) => c.id !== base.id)
    .map((c) => ({ property: c, score: scoreRelatedProperty(base, c) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const aPrice = Math.abs(Number(a.property.price) - Number(base.price));
      const bPrice = Math.abs(Number(b.property.price) - Number(base.price));
      if (aPrice !== bPrice) return aPrice - bPrice;
      return new Date(b.property.createdAt) - new Date(a.property.createdAt);
    })
    .slice(0, limit)
    .map((entry) => entry.property);

/* The candidate queries, widest-useful-first. Each tier is tried in order and
   we stop as soon as enough candidates are found, so a listing in a thin
   market still fills the row instead of rendering an empty section.

   purpose is never relaxed: a rental must not appear under a property for
   sale, however similar it looks. */
const buildCandidateTiers = (base) => {
  const city = base?.location?.city;
  const area = base?.location?.area;
  const price = Number(base.price) || 0;

  const shared = {
    id: { not: base.id },
    status: { in: VISIBLE_STATUSES },
    purpose: base.purpose,
  };

  const priceBand = price > 0
    ? { price: { gte: price * PRICE_BAND.min, lte: price * PRICE_BAND.max } }
    : {};

  const tiers = [];

  // 1. Same area, comparable price — the strongest signal.
  if (area) {
    tiers.push({
      ...shared,
      ...priceBand,
      location: { path: ['area'], equals: area },
    });
  }

  // 2. Same city, comparable price.
  if (city) {
    tiers.push({
      ...shared,
      ...priceBand,
      location: { path: ['city'], equals: city },
    });
    // 3. Same city, any price — thin markets where the band is too strict.
    tiers.push({ ...shared, location: { path: ['city'], equals: city } });
  }

  // 4. Same purpose and category anywhere — last resort, still never mixes
  //    sale with rent.
  tiers.push({ ...shared, category: base.category });

  return tiers;
};

module.exports = {
  VISIBLE_STATUSES,
  PRICE_BAND,
  scorePrice,
  scoreBedrooms,
  scoreRelatedProperty,
  rankRelatedProperties,
  buildCandidateTiers,
};
