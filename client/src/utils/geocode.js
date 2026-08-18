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

/**
 * Google Maps Geocoder wrapper — used when the Maps JS script is already loaded
 * (window.google.maps). Nominatim can be blocked/rate-limited, so prefer this
 * on pages that already render a map. Polls briefly for the script so it also
 * works if the map mounts a moment later. Resolves null on failure.
 */
export const forwardGeocodeWithGoogle = (query, { waitMs = 5000 } = {}) => {
  if (!query || !query.trim()) return Promise.resolve(null);

  return new Promise((resolve) => {
    const run = () => {
      const Geocoder = window.google?.maps?.Geocoder;
      if (!Geocoder) {
        resolve(null);
        return;
      }
      try {
        const geocoder = new Geocoder();
        geocoder.geocode(
          { address: query.trim() },
          (results, status) => {
            if (status === "OK" && results?.[0]?.geometry?.location) {
              const loc = results[0].geometry.location;
              resolve({
                lat: loc.lat(),
                lng: loc.lng(),
                displayName: results[0].formatted_address || null,
              });
            } else {
              resolve(null);
            }
          },
        );
      } catch {
        resolve(null);
      }
    };

    if (window.google?.maps?.Geocoder) {
      run();
      return;
    }

    // The Maps script loads lazily — poll briefly, then give up.
    const started = Date.now();
    const poll = setInterval(() => {
      if (window.google?.maps?.Geocoder) {
        clearInterval(poll);
        run();
      } else if (Date.now() - started > waitMs) {
        clearInterval(poll);
        resolve(null);
      }
    }, 150);
  });
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
