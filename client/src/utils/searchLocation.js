/* ─── searchLocation — matching and ordering cities by the visitor's location ───
   Pure helpers for the home page: which search city a detected IP location
   belongs to, and the one "nearest first" ordering used for the search City
   list and the "Popular homes in <city>" rows. No network, no storage and no
   React here (see utils/locationDetection for the request), so every rule is
   unit-testable.
   ─────────────────────────────────────────────── */

// Towns further than this from every search city get no matching city.
export const NEAREST_CITY_MAX_KM = 100;
// Cities within this distance of the visitor count as "nearby" and are listed
// right after their own city, closest first.
export const NEARBY_CITY_KM = 150;

/* The shape the API returns; anything else is treated as "not detected". */
export const isGeo = (geo) =>
  !!geo && typeof geo === "object" && Boolean(geo.country || geo.countryCode);

const normName = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");

/* Same city regardless of case, accents, spaces or punctuation. */
export const sameCity = (a, b) => {
  const left = normName(a);
  return left !== "" && left === normName(b);
};

export const inCountry = (geo, countryCode) =>
  isGeo(geo) && String(geo.countryCode || "").toUpperCase() === countryCode;

export const distanceKm = (a, b) => {
  const rad = (deg) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
};

/* The search city a detected location belongs to, or "".
   1. Same name as a search city (case / accent / punctuation insensitive).
   2. Otherwise the nearest search city by coordinates, within
      NEAREST_CITY_MAX_KM — IP providers often name a small nearby town.
   Only inside `countryCode`, the country every search city belongs to. */
export const resolveSearchCity = (geo, { cities, centers, countryCode }) => {
  if (!inCountry(geo, countryCode)) return "";

  const exact = cities.find((c) => sameCity(c, geo.city));
  if (exact) return exact;

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
  if (!inCountry(geo, match.countryCode)) return null;
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
   Ties keep the input order. With no origin only step 3 applies. */
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

/* What the home page property area should show for this visitor:
     { kind: "undetected" }                     location unknown → message only
     { kind: "no-country", country }            detected outside the listings'
                                                country, or none there → message only
     { kind: "rows", rows, missingCity }        rows nearest first; missingCity
                                                is the visitor's city when it has
                                                no row (message shown above rows)
   `cities` are the server's [{ city, total, properties }]. */
export const planPropertyRows = (geo, cities, { centers, countryCode, searchCities }) => {
  if (!isGeo(geo)) return { kind: "undetected" };
  const country = geo.country || geo.countryCode;
  if (!inCountry(geo, countryCode)) return { kind: "no-country", country };
  const list = Array.isArray(cities) ? cities.filter((c) => c?.total > 0) : [];
  if (list.length === 0) return { kind: "no-country", country };

  const match = { cities: searchCities, centers, countryCode };
  const origin = locationOrigin(geo, match);
  const ownCity = origin?.city || geo.city || "";
  const rows = orderByProximity(list, {
    nameOf: (row) => row.city,
    countOf: (row) => row.total,
    origin,
    centers,
  });
  const hasOwnRow = ownCity ? rows.some((row) => sameCity(row.city, ownCity)) : true;
  return { kind: "rows", rows, missingCity: hasOwnRow ? "" : ownCity };
};
