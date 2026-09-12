/* ─── i18n ───
 * English + Urdu, powered by i18next/react-i18next.
 *
 * Two deliberate choices:
 *
 * 1. ENGLISH IS BUNDLED, URDU IS LAZY.
 *    English ships with the app because every visitor needs it (it is also the
 *    fallback for any key Urdu has not translated yet). Urdu is fetched with a
 *    dynamic import the first time someone selects it, so an English visitor
 *    never downloads a language they will not read. Vite code-splits the
 *    ./locales/ur/*.json imports into their own chunk automatically.
 *
 * 2. LAYOUT STAYS LTR.
 *    Urdu is a right-to-left script, but this app deliberately does NOT set
 *    dir="rtl" — the responsive layout is tuned for LTR across 38 stylesheets
 *    and mirroring it would risk the lot. Only the <html lang> attribute
 *    changes, which is what screen readers and the font stack key off.
 *    See applyLanguageSideEffects in utils/language.js.
 */
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enCommon from "./locales/en/common.json";
import enHome from "./locales/en/home.json";
import enAccount from "./locales/en/account.json";
import enDashboard from "./locales/en/dashboard.json";
import enProperty from "./locales/en/property.json";
import enVisit from "./locales/en/visit.json";
import enListing from "./locales/en/listing.json";
import enRequirement from "./locales/en/requirement.json";

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English", shortLabel: "EN", nativeLabel: "English" },
  { code: "ur", label: "Urdu", shortLabel: "اردو", nativeLabel: "اردو" },
];

export const DEFAULT_LANGUAGE = "en";

export const isSupportedLanguage = (code) =>
  SUPPORTED_LANGUAGES.some((lang) => lang.code === code);

/* Namespaces exist so each area of the app can be translated (and loaded)
   independently. Add a namespace here and a matching JSON file per language;
   nothing else needs to change. */
export const NAMESPACES = [
  "common",
  "home",
  "account",
  "dashboard",
  "property",
  "visit",
  "listing",
  "requirement",
];

i18n.use(initReactI18next).init({
  resources: {
    en: {
      common: enCommon,
      home: enHome,
      account: enAccount,
      dashboard: enDashboard,
      property: enProperty,
      visit: enVisit,
      listing: enListing,
      requirement: enRequirement,
    },
  },
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  defaultNS: "common",
  ns: NAMESPACES,
  // A missing Urdu key falls back to the English string rather than rendering
  // the raw key — a half-translated page is still a usable page.
  returnEmptyString: false,
  interpolation: {
    // React escapes for us; double-escaping mangles apostrophes.
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

/* Loaders for the languages that are NOT bundled. Written out per language
   rather than as a template-literal import: a computed path would also match
   the English files, which are already statically imported above, and Vite
   would refuse to split them ("dynamically imported but also statically
   imported"). Adding a language means adding one entry here.

   The import order must match NAMESPACES. */
const LAZY_BUNDLES = {
  ur: () =>
    Promise.all([
      import("./locales/ur/common.json"),
      import("./locales/ur/home.json"),
      import("./locales/ur/account.json"),
      import("./locales/ur/dashboard.json"),
      import("./locales/ur/property.json"),
      import("./locales/ur/visit.json"),
      import("./locales/ur/listing.json"),
      import("./locales/ur/requirement.json"),
    ]),
};

/* Tracks which languages have been fetched, so switching back and forth does
   not re-import a bundle that is already registered. */
const loaded = new Set([DEFAULT_LANGUAGE]);

/* Pulls a language's namespace files in and registers them with i18next.
   Resolves once the bundle is live, so callers can await it before flipping
   the UI and avoid a flash of English. */
export const loadLanguage = async (code) => {
  if (!isSupportedLanguage(code) || loaded.has(code)) return;

  const load = LAZY_BUNDLES[code];
  if (!load) return;

  const bundles = await load();

  NAMESPACES.forEach((ns, index) => {
    i18n.addResourceBundle(code, ns, bundles[index].default, true, true);
  });

  loaded.add(code);
};

export default i18n;
