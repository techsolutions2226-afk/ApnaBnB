/* Free geocoding helpers powered by OpenStreetMap Nominatim.
   No API key required. Respect Nominatim usage policy: keep traffic light. */

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";

/** Forward-geocode a free-text query → { lat, lng, displayName } or null. */
export const forwardGeocode = async (query) => {
  if (!query || !query.trim()) return null;
  const url = `${NOMINATIM_BASE}/search?format=json&limit=1&q=${encodeURIComponent(query.trim())}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json", "Accept-Language": "en" },
  });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const data = await res.json();
  const hit = Array.isArray(data) && data[0];
  if (!hit) return null;
  const lat = parseFloat(hit.lat);
  const lng = parseFloat(hit.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng, displayName: hit.display_name || null };
};

/** Reverse-geocode lat/lng → { city, area, displayName } (any field may be null). */
export const reverseGeocode = async ({ lat, lng }) => {
  const url = `${NOMINATIM_BASE}/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`;
  const res = await fetch(url, {
    headers: { Accept: "application/json", "Accept-Language": "en" },
  });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const data = await res.json();
  const a = data.address || {};
  const city =
    a.city ||
    a.town ||
    a.municipality ||
    a.village ||
    a.county ||
    a.state_district ||
    null;
  const area =
    a.neighbourhood ||
    a.suburb ||
    a.quarter ||
    a.residential ||
    a.city_district ||
    a.district ||
    null;
  return { city, area, displayName: data.display_name || null };
};
