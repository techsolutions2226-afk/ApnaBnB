/* Free geocoding helpers powered by OpenStreetMap Nominatim.
   No API key required. Respect Nominatim usage policy: keep traffic light.

   All three lookups are memoized. The query space is tiny and closed —
   config/locations.js defines 9 cities of ~10 areas each, so under ~100
   distinct strings for the whole app — and the same "area, city, Pakistan"
   string is re-geocoded every time a user flips a dropdown. Caching the
   PROMISE (not the result) also dedupes concurrent lookups, so two forms
   resolving the same address share one request.

   Coordinates for a place name don't change, so entries never expire. Results
   persist to localStorage so they survive a reload; a full cache is capped so
   it can't grow without bound. */

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";

const STORE_KEY = "geocode_cache_v1";
const MAX_ENTRIES = 200;

// query -> Promise<result>. Holds in-flight promises as well as settled ones.
const memo = new Map();

const loadPersisted = () => {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return;
    const obj = JSON.parse(raw);
    for (const [k, v] of Object.entries(obj || {})) {
      memo.set(k, Promise.resolve(v));
    }
  } catch {
    /* private mode or corrupt payload — start empty */
  }
};
loadPersisted();

const persist = async (key, value) => {
  // Never persist a null: a transient network failure would be remembered as
  // "this address has no coordinates" forever.
  if (!value) return;
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    const keys = Object.keys(obj);
    if (keys.length >= MAX_ENTRIES) delete obj[keys[0]];
    obj[key] = value;
    localStorage.setItem(STORE_KEY, JSON.stringify(obj));
  } catch {
    /* quota — caching is best-effort */
  }
};

/* Share one promise per key; drop it on failure so the next call retries. */
const memoized = (key, loader) => {
  const hit = memo.get(key);
  if (hit) return hit;
  const promise = loader()
    .then((value) => {
      persist(key, value);
      return value;
    })
    .catch((err) => {
      memo.delete(key);
      throw err;
    });
  memo.set(key, promise);
  return promise;
};

export const clearGeocodeCache = () => {
  memo.clear();
  try {
    localStorage.removeItem(STORE_KEY);
  } catch {
    /* ignore */
  }
};

/** Forward-geocode a free-text query → { lat, lng, displayName } or null. */
export const forwardGeocode = (query) => {
  if (!query || !query.trim()) return Promise.resolve(null);
  return memoized(`fwd:${query.trim().toLowerCase()}`, () => forwardGeocodeUncached(query));
};

const forwardGeocodeUncached = async (query) => {
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
export const forwardGeocodeWithGoogle = (query, opts = {}) => {
  if (!query || !query.trim()) return Promise.resolve(null);
  return memoized(`goog:${query.trim().toLowerCase()}`, () =>
    forwardGeocodeWithGoogleUncached(query, opts),
  );
};

const forwardGeocodeWithGoogleUncached = (query, { waitMs = 5000 } = {}) => {
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
export const reverseGeocode = ({ lat, lng }) => {
  if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
    return Promise.resolve(null);
  }
  // 4dp ~= 11 m; finer precision would defeat the cache without helping anyone.
  const key = `rev:${Number(lat).toFixed(4)},${Number(lng).toFixed(4)}`;
  return memoized(key, () => reverseGeocodeUncached({ lat, lng }));
};

const reverseGeocodeUncached = async ({ lat, lng }) => {
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
