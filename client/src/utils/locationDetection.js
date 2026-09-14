/* ─── locationDetection — one IP lookup per page load, started at boot ───
   main.jsx calls startLocationDetection() before React renders, so the
   request runs while the app is still mounting and the home search bar can
   appear with its city already filled. Everything else reads the same promise.

   A fresh cached result (utils/searchLocation) answers synchronously, which is
   what makes repeat visits instant; a stale one is still used but refreshed in
   the background for next time. */

import locationService from "../services/locationService";
import {
  readDetected,
  writeDetected,
  markNotDetected,
  wasNotDetected,
} from "./searchLocation";

/* How long the home search bar may wait for a first-ever detection, counted
   from app boot. Past this it renders with an empty city as it always has. */
export const DETECTION_WAIT_MS = 2000;

let startedAt = 0;
let promise = null;
let resolved; // undefined = not settled yet; geo object or null once settled

const toGeo = (data) => {
  if (!data?.detected) return null;
  const { country, countryCode, region, city, latitude, longitude } = data;
  return { country, countryCode, region, city, latitude, longitude };
};

const fetchAndStore = () =>
  locationService.detect().then((data) => {
    const geo = toGeo(data);
    if (geo) writeDetected(geo);
    else markNotDetected();
    return geo;
  });

export const startLocationDetection = () => {
  if (promise) return promise;
  startedAt = Date.now();

  const cached = readDetected();
  if (cached) {
    resolved = cached.geo;
    promise = Promise.resolve(cached.geo);
    if (cached.stale) fetchAndStore();
    return promise;
  }
  if (wasNotDetected()) {
    resolved = null;
    promise = Promise.resolve(null);
    return promise;
  }

  promise = fetchAndStore().then((geo) => {
    resolved = geo;
    return geo;
  });
  return promise;
};

/* geo object | null (known: not detected) | undefined (still waiting). */
export const getLocationSync = () => {
  startLocationDetection();
  return resolved;
};

/* Resolves with the detection, or with undefined once DETECTION_WAIT_MS since
   boot has passed — never rejects. */
export const waitForLocation = () => {
  const pending = startLocationDetection();
  const remaining = Math.max(0, DETECTION_WAIT_MS - (Date.now() - startedAt));
  return Promise.race([
    pending,
    new Promise((resolve) => setTimeout(() => resolve(undefined), remaining)),
  ]);
};
