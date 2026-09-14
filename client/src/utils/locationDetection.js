/* ─── locationDetection — a fresh IP lookup on every page load ───
   main.jsx calls startLocationDetection() before React renders, so the
   request runs while the app is still mounting. Every full page load (a
   refresh, a new tab, a VPN switch followed by a reload) asks the server
   again; nothing is kept in the browser. Moving around inside the app reuses
   this load's answer.

   Never rejects: a failed request resolves null ("not detected"). */

import locationService from "../services/locationService";
import { locateFromBrowser } from "./browserGeolocation";

// Location from earlier versions, which cached it for 24h. Removed so a stored
// guess never outlives the reload that is meant to replace it.
const LEGACY_KEYS = ["detected_location_v1"];

let promise = null;
let resolved; // undefined = still waiting; geo object or null once settled

const toGeo = (data) => {
  if (!data?.detected) return null;
  const { country, countryCode, region, city, latitude, longitude } = data;
  return { country, countryCode, region, city, latitude, longitude };
};

export const startLocationDetection = () => {
  if (promise) return promise;
  try {
    LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
  } catch {
    /* storage blocked — nothing stored to clean */
  }
  // Server first; if it could not locate the visitor, ask from the browser,
  // which always carries the visitor's real IP.
  promise = locationService
    .detect()
    .then((data) => toGeo(data) || locateFromBrowser())
    .catch(() => null)
    .then((geo) => {
      resolved = geo;
      return resolved;
    });
  return promise;
};

/* geo object | null (known: not detected) | undefined (still waiting). */
export const getLocationSync = () => {
  startLocationDetection();
  return resolved;
};
