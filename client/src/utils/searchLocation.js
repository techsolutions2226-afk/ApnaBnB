/* ─── searchLocation — default search city from IP detection ───
   Pure helpers + storage for the home search's detected location. No network
   and no React here (see utils/locationDetection for the request), so every
   rule is unit-testable.

   Storage, all wrapped because private mode / blocked storage must never
   break the page:
     localStorage   detected_location_v1  { geo, savedAt }  24h — makes repeat
                    visits instant. Only successful detections are kept.
     sessionStorage detected_location_none               — "could not detect"
                    for this tab, so a failing provider isn't re-awaited on
                    every navigation back to Home.
     sessionStorage search_city_manual                   — the city the user
                    picked themselves. Always beats detection for the tab.
   ─────────────────────────────────────────────── */

const DETECTED_KEY = "detected_location_v1";
const NONE_KEY = "detected_location_none";
const MANUAL_KEY = "search_city_manual";

export const DETECTED_TTL_MS = 24 * 60 * 60 * 1000;
// A cached location older than this is still used, but refreshed quietly.
export const DETECTED_REFRESH_MS = 6 * 60 * 60 * 1000;
// Towns further than this from every search city get no default city.
export const NEAREST_CITY_MAX_KM = 100;
// Cities within this distance of the visitor count as "nearby" and are listed
// right after their own city, closest first.
export const NEARBY_CITY_KM = 150;

/* ── Storage ── */
const safe = (fn, fallback) => {
  try {
    return fn();
  } catch {
    return fallback;
  }
};

/* The shape the API returns; anything else is treated as "not detected". */
const isGeo = (geo) =>
  !!geo && typeof geo === "object" && (geo.country || geo.countryCode);

/* → { geo, stale } | null (none cached or expired). */
export const readDetected = (now = Date.now()) =>
  safe(() => {
    const raw = localStorage.getItem(DETECTED_KEY);
    if (!raw) return null;
    const { geo, savedAt } = JSON.parse(raw);
    const age = now - Number(savedAt);
    if (!isGeo(geo) || !(age >= 0) || age > DETECTED_TTL_MS) return null;
    return { geo, stale: age > DETECTED_REFRESH_MS };
  }, null);

export const writeDetected = (geo, now = Date.now()) => {
  if (!isGeo(geo)) return;
  safe(() => {
    localStorage.setItem(DETECTED_KEY, JSON.stringify({ geo, savedAt: now }));
    sessionStorage.removeItem(NONE_KEY);
  });
};

export const markNotDetected = () =>
  safe(() => sessionStorage.setItem(NONE_KEY, "1"));

export const wasNotDetected = () =>
  safe(() => sessionStorage.getItem(NONE_KEY) === "1", false);

/* null = the user has not chosen; "" = they chose to clear the city. */
export const getManualCity = () =>
  safe(() => sessionStorage.getItem(MANUAL_KEY), null);

export const setManualCity = (city) =>
  safe(() => sessionStorage.setItem(MANUAL_KEY, String(city ?? "")));

/* ── Matching ── */
const normName = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");

export const distanceKm = (a, b) => {
  const rad = (deg) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
};

/* The search city to preselect for a detected location, or "".
   1. Same name as a search city (case / accent / punctuation insensitive).
   2. Otherwise the nearest search city by coordinates, within
      NEAREST_CITY_MAX_KM — IP providers often name a small nearby town.
   Only inside `countryCode`, the country every search city belongs to. */
export const resolveSearchCity = (geo, { cities, centers, countryCode }) => {
  if (!isGeo(geo)) return "";
  if (String(geo.countryCode || "").toUpperCase() !== countryCode) return "";

  const wanted = normName(geo.city);
  if (wanted) {
    const exact = cities.find((c) => normName(c) === wanted);
    if (exact) return exact;
  }

  const lat = Number(geo.latitude);
  const lng = Number(geo.longitude);
  if (
    geo.latitude == null ||
    geo.longitude == null ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    return "";
  }

  let best = "";
  let bestKm = NEAREST_CITY_MAX_KM;
  for (const city of cities) {
    const center = centers[city];
    if (!center) continue;
    const km = distanceKm({ lat, lng }, center);
    if (km <= bestKm) {
      best = city;
      bestKm = km;
    }
  }
  return best;
};

/* The visitor's location as an ordering origin — { city, lat, lng } — or null
   when there is nothing usable (not detected, or outside `countryCode`).
   Coordinates are the detected ones when present, else the city's centre. */
export const locationOrigin = (geo, match) => {
  if (!isGeo(geo)) return null;
  if (String(geo.countryCode || "").toUpperCase() !== match.countryCode) return null;
  const city = resolveSearchCity(geo, match);
  const detectedPoint =
    geo.latitude != null &&
    geo.longitude != null &&
    Number.isFinite(Number(geo.latitude)) &&
    Number.isFinite(Number(geo.longitude));
  const point = detectedPoint
    ? { lat: Number(geo.latitude), lng: Number(geo.longitude) }
    : match.centers[city] || null;
  if (!city && !point) return null;
  return { city, lat: point?.lat ?? null, lng: point?.lng ?? null };
};

/* "Nearest first" — the one ordering for everything location-sorted on the
   home page (search City list and the "Popular homes in <city>" rows):
     1. the visitor's own city
     2. cities within `nearbyKm`, closest first
     3. everything else by `countOf` (e.g. listings), highest first
   Ties keep the input order. With no origin only step 3 applies, so a visitor
   whose location is unknown sees the most popular cities first. */
export const orderByProximity = (
  items,
  {
    nameOf = (item) => item,
    countOf = () => 0,
    origin = null,
    centers = {},
    nearbyKm = NEARBY_CITY_KM,
  } = {},
) => {
  const centerByName = new Map(
    Object.entries(centers).map(([name, point]) => [normName(name), point]),
  );
  const originKey = normName(origin?.city);
  const hasPoint =
    origin != null &&
    origin.lat != null &&
    origin.lng != null &&
    Number.isFinite(Number(origin.lat)) &&
    Number.isFinite(Number(origin.lng));

  const own = [];
  const near = [];
  const rest = [];
  (Array.isArray(items) ? items : []).forEach((item, index) => {
    const key = normName(nameOf(item));
    if (originKey && key === originKey) {
      own.push(item);
      return;
    }
    const center = centerByName.get(key);
    if (hasPoint && center) {
      const km = distanceKm({ lat: Number(origin.lat), lng: Number(origin.lng) }, center);
      if (km <= nearbyKm) {
        near.push({ item, km, index });
        return;
      }
    }
    rest.push({ item, count: Number(countOf(item)) || 0, index });
  });

  near.sort((a, b) => a.km - b.km || a.index - b.index);
  rest.sort((a, b) => b.count - a.count || a.index - b.index);
  return [...own, ...near.map((e) => e.item), ...rest.map((e) => e.item)];
};

/* "Lahore, Punjab, Pakistan" — skips blanks and repeats such as
   "Islamabad, Islamabad, Pakistan". `city` is the resolved search city. */
export const formatDetectedPlace = (city, geo) => {
  const parts = [];
  for (const part of [city, geo?.region, geo?.country]) {
    const value = String(part || "").trim();
    if (value && !parts.some((p) => normName(p) === normName(value))) {
      parts.push(value);
    }
  }
  return parts.join(", ");
};
