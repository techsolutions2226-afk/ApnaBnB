import { useEffect, useMemo, useState } from "react";
import {
  SEARCH_CITIES,
  CITY_CENTERS,
  SEARCH_COUNTRY_CODE,
} from "../config/locations";
import { getLocationSync, startLocationDetection } from "../utils/locationDetection";
import { locationOrigin } from "../utils/searchLocation";

const MATCH = {
  cities: SEARCH_CITIES,
  centers: CITY_CENTERS,
  countryCode: SEARCH_COUNTRY_CODE,
};

/* ═════════════════════════════════════════════════════════
   useVisitorLocation — where this visitor is, detected silently from their IP
   on every page load (see utils/locationDetection).

     detected  { country, countryCode, region, city, latitude, longitude },
               or null when the location could not be detected
     origin    { city, lat, lng } to sort cities nearest first, or null when
               outside the listings' country / not detected
     ready     false until this page load's detection has settled
   ═════════════════════════════════════════════════════════ */
export default function useVisitorLocation() {
  const [detected, setDetected] = useState(getLocationSync);
  const ready = detected !== undefined;

  useEffect(() => {
    if (ready) return undefined;
    let cancelled = false;
    startLocationDetection().then((geo) => {
      if (!cancelled) setDetected(geo);
    });
    return () => {
      cancelled = true;
    };
  }, [ready]);

  const origin = useMemo(() => (ready ? locationOrigin(detected, MATCH) : null), [ready, detected]);

  return { detected: ready ? detected : null, origin, ready };
}
