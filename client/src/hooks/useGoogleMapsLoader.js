import { useEffect, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import { GOOGLE_MAPS_LOADER_OPTIONS } from "../config/mapsLoader";

const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// ONE Loader for the entire app session, created once at module load. Every
// map component reads the same settled promise instead of each calling
// `useJsApiLoader` (which builds a new Loader + re-runs load() per mount).
//
// Why this matters: when a fresh Loader runs while the Google Maps <script> tag
// is already present in the DOM, `@googlemaps/js-api-loader`'s setScript()
// fires its "done" callback immediately — even if window.google is still
// bootstrapping. The singleton marks itself done, React mounts GoogleMap
// against an incomplete API, and the map silently stops working for the rest
// of the session until a full page refresh. A single module-scope load skips
// that path entirely: the promise only settles once the bootstrap truly
// finishes, and every remount just re-uses the same resolved promise.
const loader = new Loader({ ...GOOGLE_MAPS_LOADER_OPTIONS, apiKey });

let settled = false;
let loadError = null;
let loadPromise = null;

const beginLoad = () => {
  if (loadPromise) return loadPromise;
  loadPromise = loader
    .load()
    .then(() => {
      settled = true;
      return window.google;
    })
    .catch((err) => {
      settled = true;
      loadError = err;
      throw err;
    });
  return loadPromise;
};

/** Shared Google Maps loaded-state hook for all map components. */
export const useGoogleMapsLoader = () => {
  const [state, setState] = useState({
    isLoaded: settled && !loadError,
    loadError,
  });

  useEffect(() => {
    let cancelled = false;
    beginLoad()
      .then(() => {
        if (!cancelled) setState({ isLoaded: true, loadError: null });
      })
      .catch((err) => {
        if (!cancelled) setState({ isLoaded: false, loadError: err });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { isLoaded: state.isLoaded, loadError: state.loadError };
};

export default useGoogleMapsLoader;