/* Device-local language preference, plus the side effects of choosing one.
 *
 * Deliberately NOT namespaced per user and NOT cleared on logout — unlike the
 * "Viewing as" hat in viewRoleStore. A visitor who has never signed in must be
 * able to read the home page in Urdu, and someone who signs out should not be
 * thrown back into English mid-sentence. Same reasoning as apnabnb_last_login.
 *
 * The chosen language is applied by setting <html lang>, which drives:
 *   • the Urdu font stack in index.css (:lang(ur) / [lang="ur"])
 *   • screen-reader pronunciation
 *   • the browser's own hyphenation and font fallback
 * The layout direction is left alone on purpose — see i18n/index.js.
 */
import { DEFAULT_LANGUAGE, isSupportedLanguage } from "../i18n";

const KEY = "apnabnb_lang";

/* Urdu needs a font that joins its letters; the default system stack renders
   it as disconnected glyphs. Loaded on demand so English visitors never pay
   for it. Naskh rather than Nastaliq: Nastaliq is the more beautiful Urdu
   face but needs roughly double the line-height, which would stretch every
   card and table in the app. */
const URDU_FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;500;600;700&display=swap";
const URDU_FONT_ID = "apnabnb-urdu-font";

export const readStoredLanguage = () => {
  try {
    const stored = localStorage.getItem(KEY);
    return isSupportedLanguage(stored) ? stored : DEFAULT_LANGUAGE;
  } catch {
    // Private mode / blocked storage — fall back rather than throwing at boot.
    return DEFAULT_LANGUAGE;
  }
};

export const writeStoredLanguage = (code) => {
  if (!isSupportedLanguage(code)) return;
  try {
    localStorage.setItem(KEY, code);
  } catch {
    /* the preference simply will not survive a reload */
  }
};

/* Injects the Urdu webfont once, the first time it is needed. */
const ensureUrduFont = () => {
  if (typeof document === "undefined") return;
  if (document.getElementById(URDU_FONT_ID)) return;

  const link = document.createElement("link");
  link.id = URDU_FONT_ID;
  link.rel = "stylesheet";
  link.href = URDU_FONT_HREF;
  document.head.appendChild(link);
};

/* Everything that has to happen outside React when the language changes.
   Safe to call repeatedly. */
export const applyLanguageSideEffects = (code) => {
  if (typeof document === "undefined") return;

  document.documentElement.lang = code;
  // Direction is pinned: this app renders Urdu in an LTR layout by design.
  document.documentElement.dir = "ltr";

  if (code === "ur") ensureUrduFont();
};

export default { readStoredLanguage, writeStoredLanguage, applyLanguageSideEffects };
