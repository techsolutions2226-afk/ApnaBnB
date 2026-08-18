// Score a property↔requirement pair on a 0-100 scale. Shared by
// propertyController, requirementController, and matchController so the
// auto-generated matches and the manual-match preview use identical scoring.
//
// Weights:
//   budget    40   (or 25 if price is within 10% above max)
//   area      20   (exact) or 10 (substring)
//   bedrooms  20   (or 10 if off by 1)
//   bathrooms 10   (or  5 if off by 1)
//   size      10   (matchController only; ignored if either side missing)

const calculateMatchScore = (property, requirement) => {
  let score = 0;

  // Budget
  const min = requirement.budget?.min || 0;
  const max = requirement.budget?.max || Infinity;
  if (property.price >= min && property.price <= max) {
    score += 40;
  } else if (property.price <= max * 1.1) {
    score += 25;
  }

  // Area
  if (property.location?.area && requirement.location?.area) {
    if (property.location.area === requirement.location.area) {
      score += 20;
    } else if (
      property.location.area.includes(requirement.location.area) ||
      requirement.location.area.includes(property.location.area)
    ) {
      score += 10;
    }
  }

  // Bedrooms
  if (!requirement.bedrooms || property.bedrooms === requirement.bedrooms) {
    score += 20;
  } else if (Math.abs(property.bedrooms - requirement.bedrooms) === 1) {
    score += 10;
  }

  // Bathrooms
  if (!requirement.bathrooms || property.bathrooms === requirement.bathrooms) {
    score += 10;
  } else if (Math.abs(property.bathrooms - requirement.bathrooms) === 1) {
    score += 5;
  }

  // Size (optional — both sides numeric)
  if (typeof property.size === 'number' && typeof requirement.size === 'number' && requirement.size > 0) {
    const sizeDiff = Math.abs(property.size - requirement.size) / requirement.size;
    if (sizeDiff <= 0.1) {
      score += 10;
    } else if (sizeDiff <= 0.2) {
      score += 5;
    }
  }

  return Math.min(score, 100);
};

// Maps (propertyOwnerRole, requirementOwnerRole) → match-type string used
// in Match.type. Returns null for unknown combinations so the caller can
// skip those instead of crashing on an enum validation error.
const MATCH_TYPE_BY_ROLES = {
  'seller:buyer': 'seller-buyer',
  'dealer:buyer': 'dealer-buyer',
  'dealer:dealer': 'dealer-dealer',
  'seller:dealer': 'seller-dealer',
};

const determineMatchType = (propertyOwnerRole, requirementOwnerRole) =>
  MATCH_TYPE_BY_ROLES[`${propertyOwnerRole}:${requirementOwnerRole}`] || null;

// A user can act across roles, so each listing/requirement stores the role the
// user was ACTING AS. These clamp a chosen/selected role to a valid side so a
// match type is always derivable:
//   supply (property) → seller | dealer
//   demand (requirement) → buyer | dealer
// A dealer stays a dealer; anything else falls to the natural side.
const normalizeSupply = (role) => (role === 'dealer' ? 'dealer' : 'seller');
const normalizeDemand = (role) => (role === 'dealer' ? 'dealer' : 'buyer');

// Strict pre-filter: property + requirement only count as a candidate match
// when city + area + propertyType align AND the price falls within ±10% of
// the requirement's budget band.
const isMatchCandidate = (property, requirement) => {
  if (!property || !requirement) return false;

  // Purpose (sale vs rent) — must match exactly. A rent listing should never
  // be offered to a buy requirement and vice versa.
  const pPurpose = (property.purpose || 'sale').toLowerCase();
  const rPurpose = (requirement.purpose || 'sale').toLowerCase();
  if (pPurpose !== rPurpose) return false;

  // City — case-insensitive exact.
  const pCity = (property.location?.city || '').toLowerCase();
  const rCity = (requirement.location?.city || '').toLowerCase();
  if (!pCity || !rCity || pCity !== rCity) return false;

  // Area is NOT a hard filter — two neighbourhoods in the same city can still
  // be a valid match (e.g. "Sadiqabad" requirement vs "Chandni Chowk" listing).
  // It only contributes points via calculateMatchScore, so a mismatched area
  // yields a lower score instead of blocking the match entirely.

  // Property type — case-insensitive exact.
  const pType = (property.propertyType || '').toLowerCase();
  const rType = (requirement.propertyType || '').toLowerCase();
  if (!pType || !rType || pType !== rType) return false;

  // Price — within ±10% of the requirement's budget band. A property
  // priced just below the min or just above the max still counts.
  const min = Number(requirement.budget?.min) || 0;
  const max = Number(requirement.budget?.max) || 0;
  const price = Number(property.price);
  if (!price) return false;
  if (max > 0) {
    const lo = min > 0 ? min * 0.9 : 0;
    const hi = max * 1.1;
    if (price < lo || price > hi) return false;
  }

  return true;
};

module.exports = {
  calculateMatchScore,
  determineMatchType,
  isMatchCandidate,
  normalizeSupply,
  normalizeDemand,
};
