/* Shared Google Maps loader options — ALL map components must call
   `useJsApiLoader` with the SAME options.

   @googlemaps/js-api-loader keeps a global singleton keyed by (id + options).
   Calling it again with the same id but different options (e.g. one component
   with `libraries: []` and another with the library default `['maps']`) throws
   "Loader must not be called again with different options" and crashes the
   page. That failure is order-dependent (only when the two different-option
   loaders run in the same session), which is why it appears intermittently and
   disappears on refresh.

   Import and spread this constant in every component that loads the map so no
   future edit can silently drift the options apart again. */
export const GOOGLE_MAPS_LOADER_OPTIONS = {
  id: "google-map-script",
  libraries: ["maps"],
};
