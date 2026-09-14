import { useCallback, useEffect, useMemo, useState } from "react";
import {
  SEARCH_CITIES,
  CITY_CENTERS,
  SEARCH_COUNTRY_CODE,
} from "../config/locations";
import { getLocationSync, waitForLocation } from "../utils/locationDetection";
import {
  getManualCity,
  setManualCity,
  resolveSearchCity,
  locationOrigin,
} from "../utils/searchLocation";

const MATCH = {
  cities: SEARCH_CITIES,
  centers: CITY_CENTERS,
  countryCode: SEARCH_COUNTRY_CODE,
};

/* Apply a settled detection. A manual pick always keeps its city. */
const applyDetection = (prev, geo) => ({
  ...prev,
  settled: true,
  ready: true,
  detected: geo,
  city: prev.isManual ? prev.city : resolveSearchCity(geo, MATCH),
});

const initialState = () => {
  const manual = getManualCity();
  const base = {
    city: manual ?? "",
    isManual: manual !== null,
    detected: null,
    settled: false,
    // A manual pick needs no detection before the search bar can show.
    ready: manual !== null,
  };
  const geo = getLocationSync();
  return geo === undefined ? base : applyDetection(base, geo);
};

/* ═════════════════════════════════════════════════════════
   useSearchLocation — the home search's City value, defaulted from the
   visitor's IP location (Buyer and Tenant share it).

   `ready` is false only while a first-ever detection is still in flight
   (capped, see DETECTION_WAIT_MS). Home keeps the search bar hidden until
   then, so the visitor never sees an empty City that fills in afterwards;
   the city and `ready` flip in the same state update.

   A detection landing after the cap is ignored for this view (the field would
   change under the user). It is cached, so the next visit gets it instantly.

   `origin` is where the visitor is ({ city, lat, lng } or null) — what the
   page sorts cities by. It follows detection only: picking a city in the
   search changes the search, not the order of the home page.
   ═════════════════════════════════════════════════════════ */
export default function useSearchLocation() {
  const [state, setState] = useState(initialState);
  const { settled } = state;

  useEffect(() => {
    if (settled) return undefined;
    let cancelled = false;
    waitForLocation().then((geo) => {
      if (cancelled) return;
      setState((prev) => {
        if (prev.settled) return prev;
        if (geo !== undefined) return applyDetection(prev, geo);
        return prev.ready ? prev : { ...prev, ready: true }; // cap reached
      });
    });
    return () => {
      cancelled = true;
    };
  }, [settled]);

  /* The setter the search fields use — any change is the user's choice. */
  const setCity = useCallback((value) => {
    setManualCity(value);
    setState((prev) => ({ ...prev, city: value, isManual: true, ready: true }));
  }, []);

  const origin = useMemo(() => locationOrigin(state.detected, MATCH), [state.detected]);

  return {
    city: state.city,
    setCity,
    detected: state.detected,
    origin,
    isManual: state.isManual,
    ready: state.ready,
  };
}
