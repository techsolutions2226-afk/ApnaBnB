/* ─── matchTier — classify a match as "nearest" or "far" ───
 *
 * Computed server-side and attached to each match so the client can filter
 * instantly without re-running the engine, and without a second copy of these
 * rules living in the UI where the two could drift apart.
 *
 * NEAREST — a tight, high-confidence match. All of:
 *     same city, same area, within 5 km,
 *     bedrooms ±1, bathrooms ±1, price within ±10% of the budget band
 *
 * FAR — a wider net. All of:
 *     same city, bedrooms ±1, bathrooms ±1,
 *     price within ±20% of the budget band
 *   Area and distance are not required, so a different neighbourhood in the
 *   same city still qualifies.
 *
 * Rooms are compared ±1 rather than ±10%: a percentage of a small integer
 * rounds to zero, which would silently mean "exact match" for any normal home.
 * ±1 is also what calculateMatchScore already does, so the tier and the score
 * agree with each other.
 * ─────────────────────────────────────────────── */

const NEAREST_RADIUS_KM = 5;

/* Great-circle distance in km. Returns null when either point is missing, so
   callers can distinguish "far away" from "we don't know". */
const distanceKm = (a, b) => {
  const lat1 = Number(a?.lat);
  const lng1 = Number(a?.lng);
  const lat2 = Number(b?.lat);
  const lng2 = Number(b?.lng);
  if (![lat1, lng1, lat2, lng2].every(Number.isFinite)) return null;

  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const norm = (s) => String(s || '').trim().toLowerCase();

/* Within `tolerance` of the budget band. A band of 0/absent means the buyer
   set no budget, which never blocks a match. */
const priceWithin = (price, budget, tolerance) => {
  const p = Number(price);
  if (!Number.isFinite(p)) return false;
  const min = Number(budget?.min) || 0;
  const max = Number(budget?.max) || 0;
  if (max <= 0) return true;
  const lo = min > 0 ? min * (1 - tolerance) : 0;
  const hi = max * (1 + tolerance);
  return p >= lo && p <= hi;
};

/* Rooms within ±1. A requirement that doesn't specify never blocks. */
const roomsWithin = (propertyRooms, requiredRooms) => {
  if (requiredRooms === null || requiredRooms === undefined) return true;
  const p = Number(propertyRooms);
  const r = Number(requiredRooms);
  if (!Number.isFinite(p) || !Number.isFinite(r)) return true;
  return Math.abs(p - r) <= 1;
};

/* Returns { tier, distanceKm } where tier is 'nearest' | 'far' | 'other'. */
const classifyMatch = (property, requirement) => {
  const result = { tier: 'other', distanceKm: null };
  if (!property || !requirement) return result;

  const pLoc = property.location || {};
  const rLoc = requirement.location || {};

  const sameCity = norm(pLoc.city) && norm(pLoc.city) === norm(rLoc.city);
  const sameArea = norm(pLoc.area) && norm(pLoc.area) === norm(rLoc.area);
  const beds = roomsWithin(property.bedrooms, requirement.bedrooms);
  const baths = roomsWithin(property.bathrooms, requirement.bathrooms);

  const km = distanceKm(pLoc.coordinates, rLoc.coordinates);
  result.distanceKm = km === null ? null : Math.round(km * 10) / 10;

  if (
    sameCity &&
    sameArea &&
    km !== null &&
    km <= NEAREST_RADIUS_KM &&
    beds &&
    baths &&
    priceWithin(property.price, requirement.budget, 0.1)
  ) {
    result.tier = 'nearest';
    return result;
  }

  if (
    sameCity &&
    beds &&
    baths &&
    priceWithin(property.price, requirement.budget, 0.2)
  ) {
    result.tier = 'far';
    return result;
  }

  return result;
};

module.exports = {
  classifyMatch,
  distanceKm,
  priceWithin,
  roomsWithin,
  NEAREST_RADIUS_KM,
};
