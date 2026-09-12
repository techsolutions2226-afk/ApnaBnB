/* ─── LanguageContext ───
 * One place that owns "which language is the UI in".
 *
 * Wraps i18next rather than replacing it: components still call useTranslation()
 * for strings. This exists so the switcher, the sidebar control and Global
 * Preferences all change the language the same way — loading the bundle,
 * persisting the choice and applying the <html lang>/font side effects — instead
 * of each doing two of the three.
 */
import { createContext, useContext, useCallback, useEffect, useMemo, useState } from "react";
import i18n, { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, loadLanguage, isSupportedLanguage } from "../i18n";
import {
  readStoredLanguage,
  writeStoredLanguage,
  applyLanguageSideEffects,
} from "../utils/language";

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  // Seeded synchronously so the first paint is already in the right language
  // for a returning Urdu reader — no flash of English.
  const [language, setLanguageState] = useState(readStoredLanguage);
  const [switching, setSwitching] = useState(false);

  /* On mount, make i18next agree with the stored choice. For Urdu this means
     fetching the bundle, which is why the initial paint may briefly show
     English fallbacks on a cold load — acceptable, and far cheaper than
     bundling Urdu for everyone. */
  useEffect(() => {
    let cancelled = false;
    applyLanguageSideEffects(language);

    if (language === i18n.language && language === DEFAULT_LANGUAGE) return undefined;

    loadLanguage(language)
      .then(() => {
        if (!cancelled) i18n.changeLanguage(language);
      })
      .catch(() => {
        // Bundle failed to load (offline, bad deploy). Staying on English is a
        // working page; a blank one is not.
        if (!cancelled) setLanguageState(DEFAULT_LANGUAGE);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLanguage = useCallback(
    async (code) => {
      if (!isSupportedLanguage(code) || code === language) return;
      setSwitching(true);
      try {
        // Load BEFORE switching so the UI never renders half-translated.
        await loadLanguage(code);
        await i18n.changeLanguage(code);
        writeStoredLanguage(code);
        applyLanguageSideEffects(code);
        setLanguageState(code);
      } catch {
        /* keep the current language rather than stranding the user */
      } finally {
        setSwitching(false);
      }
    },
    [language],
  );

  const value = useMemo(
    () => ({ language, setLanguage, switching, languages: SUPPORTED_LANGUAGES }),
    [language, setLanguage, switching],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}

export default LanguageContext;
