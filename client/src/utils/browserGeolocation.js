/* ─── browserGeolocation — locate the visitor from their own browser ───
   Fallback for when the server cannot (a proxy hides the visitor's IP, or the
   location services block requests from the hosting data centre). A request
   straight from the browser always carries the visitor's real IP — VPN
   included — so it works however the site is hosted.

   Only services that allow browser calls (CORS `*`) and need no key. Mirrors
   the server's provider list in Backend/utils/ipGeolocation.js; both must
   return the same { country, countryCode, region, city, latitude, longitude }.
   Never throws: resolves null when every service fails. */

const TIMEOUT_MS = 4000;

const text = (v) => {
  const s = typeof v === "string" ? v.trim() : "";
  return s && s !== "-" ? s : null;
};
const num = (v) => {
  const n = Number(v);
  return v === null || v === undefined || v === "" || !Number.isFinite(n) ? null : n;
};

const PROVIDERS = [
  {
    url: "https://ipwho.is/",
    map: (r) =>
      r.success === false
        ? null
        : { country: r.country, countryCode: r.country_code, region: r.region, city: r.city, latitude: r.latitude, longitude: r.longitude },
  },
  {
    url: "https://freeipapi.com/api/json/",
    map: (r) => ({ country: r.countryName, countryCode: r.countryCode, region: r.regionName, city: r.cityName, latitude: r.latitude, longitude: r.longitude }),
  },
  {
    url: "https://get.geojs.io/v1/ip/geo.json",
    map: (r) => ({ country: r.country, countryCode: r.country_code, region: r.region, city: r.city, latitude: r.latitude, longitude: r.longitude }),
  },
];

export const shapeBrowserGeo = (fields) => {
  if (!fields) return null;
  const code = text(fields.countryCode);
  const geo = {
    country: text(fields.country),
    countryCode: code ? code.toUpperCase() : null,
    region: text(fields.region),
    city: text(fields.city),
    latitude: num(fields.latitude),
    longitude: num(fields.longitude),
  };
  return geo.country || geo.countryCode ? geo : null;
};

export const BROWSER_PROVIDERS = PROVIDERS;

export const locateFromBrowser = async (fetchImpl = fetch) => {
  for (const provider of PROVIDERS) {
    try {
      const res = await fetchImpl(provider.url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) continue;
      const geo = shapeBrowserGeo(provider.map(await res.json()));
      if (geo) return geo;
    } catch {
      /* this service failed — try the next one */
    }
  }
  return null;
};
