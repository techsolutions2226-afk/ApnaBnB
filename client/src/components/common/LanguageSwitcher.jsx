/* LanguageSwitcher — English / Urdu.
 *
 * Three variants, because it lives in three places with different chrome:
 *   "menu"      — a globe button that opens a dropdown of the two languages.
 *                 Used in the public navbar, where a segmented pill competed
 *                 with the Log in / Sign up buttons for attention.
 *   "segmented" — a pill with both languages side by side (dashboard sidebar),
 *                 where there is room and no competing call to action.
 *   "inline"    — plain buttons for use inside an existing settings row.
 *
 * Each option is labelled in its OWN language ("English", "اردو"), never
 * translated — someone stuck in the wrong language has to be able to read the
 * way out. The globe icon carries the same idea for people who can read
 * neither: it is the near-universal convention for this control.
 */
import { useEffect, useRef, useState } from "react";
import { FiGlobe, FiCheck, FiChevronDown } from "react-icons/fi";
import { useLanguage } from "../../context/LanguageContext";
import "../../styles/LanguageSwitcher.css";

export default function LanguageSwitcher({
  variant = "segmented",
  className = "",
  size = "md",
  tone = "light",
}) {
  const { language, setLanguage, switching, languages } = useLanguage();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const buttonRef = useRef(null);

  const current = languages.find((l) => l.code === language) || languages[0];

  /* Close on an outside click or Escape — the two ways every other menu in
     the app closes (see DashboardShell's role picker). */
  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      // Return focus to the trigger, or the keyboard user is stranded.
      buttonRef.current?.focus();
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const choose = async (code) => {
    setOpen(false);
    await setLanguage(code);
  };

  /* ── Globe button + dropdown ── */
  if (variant === "menu") {
    return (
      <div
        ref={wrapRef}
        className={`lang-menu lang-menu--${size} lang-menu--${tone} ${className}`}
      >
        <button
          ref={buttonRef}
          type="button"
          className="lang-menu__trigger"
          onClick={() => setOpen((prev) => !prev)}
          disabled={switching}
          aria-haspopup="menu"
          aria-expanded={open}
          // Names the control AND its current value, so a screen reader
          // announces "Language, English" rather than just "button".
          aria-label={`Language: ${current?.nativeLabel || ""}`}
          title={current?.nativeLabel}
        >
          <FiGlobe className="lang-menu__globe" aria-hidden="true" />
          <span className="lang-menu__current" lang={current?.code}>
            {current?.shortLabel}
          </span>
          <FiChevronDown
            className={`lang-menu__caret${open ? " lang-menu__caret--open" : ""}`}
            aria-hidden="true"
          />
        </button>

        {open && (
          <ul className="lang-menu__list" role="menu">
            {languages.map((option) => {
              const active = option.code === language;
              return (
                <li key={option.code} role="none">
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={active}
                    className={`lang-menu__item${active ? " lang-menu__item--active" : ""}`}
                    onClick={() => choose(option.code)}
                    disabled={switching}
                    lang={option.code}
                  >
                    <span className="lang-menu__item-label">{option.nativeLabel}</span>
                    {active && <FiCheck className="lang-menu__tick" aria-hidden="true" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }

  /* ── Segmented / inline ── */
  return (
    <div
      className={`lang-switch lang-switch--${variant} lang-switch--${size} lang-switch--${tone} ${className}`}
      role="group"
      aria-label="Change language"
    >
      {languages.map((option) => {
        const active = option.code === language;
        return (
          <button
            key={option.code}
            type="button"
            className={`lang-switch__option${active ? " lang-switch__option--active" : ""}`}
            onClick={() => setLanguage(option.code)}
            disabled={switching || active}
            // The pressed state is what a screen reader announces; the visible
            // label is the language's own name, so it needs no translation.
            aria-pressed={active}
            lang={option.code}
            title={option.nativeLabel}
          >
            {option.shortLabel}
          </button>
        );
      })}
    </div>
  );
}
