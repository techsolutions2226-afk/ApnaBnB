import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import useAccountPath from "../hooks/useAccountPath";
import { SUPPORTED_LANGUAGES } from "../i18n";
import { FiChevronLeft } from "react-icons/fi";
import "../styles/Account.css";

/* ─── Global preferences ───
   Language is LIVE: choosing one loads that bundle, re-renders the app and
   persists the choice for this device (see LanguageContext).

   Currency, timezone, area units and date format are still local-only mirrors
   — the labels below say so rather than pretending otherwise. They are kept
   visible because the shape of the page is the deliverable; wiring them needs
   price/date formatting work across the app, not just a control here.
*/

const CURRENCIES = [
  { value: "PKR", label: "PKR — Pakistani Rupee (Rs)" },
  { value: "USD", label: "USD — US Dollar ($)" },
  { value: "GBP", label: "GBP — British Pound (£)" },
  { value: "AED", label: "AED — UAE Dirham (د.إ)" },
  { value: "SAR", label: "SAR — Saudi Riyal (﷼)" },
];

const TIMEZONES = [
  { value: "Asia/Karachi", label: "(GMT+05:00) Pakistan Standard Time" },
  { value: "Asia/Dubai", label: "(GMT+04:00) Gulf Standard Time" },
  { value: "Europe/London", label: "(GMT+00:00) Greenwich Mean Time" },
  { value: "America/New_York", label: "(GMT−05:00) Eastern Time" },
];

const AREA_UNITS = [
  { value: "marla", label: "Marla / Kanal" },
  { value: "sqft", label: "Square feet" },
  { value: "sqm", label: "Square metres" },
];

const DATE_FORMATS = [
  { value: "dmy", label: "DD/MM/YYYY" },
  { value: "mdy", label: "MM/DD/YYYY" },
  { value: "ymd", label: "YYYY-MM-DD" },
];

export default function GlobalPreferences() {
  const { t } = useTranslation("account");
  const { currentUser } = useAuth();
  const { language, setLanguage, switching } = useLanguage();
  const navigate = useNavigate();
  const { base } = useAccountPath();

  // Still local-only mirrors; these do not persist anywhere yet.
  const [prefs, setPrefs] = useState({
    currency: "PKR",
    timezone: "Asia/Karachi",
    areaUnit: "marla",
    dateFormat: "dmy",
  });

  useEffect(() => {
    if (!currentUser) navigate("/login", { replace: true });
  }, [currentUser, navigate]);

  if (!currentUser) return null;

  const set = (key) => (e) => setPrefs((prev) => ({ ...prev, [key]: e.target.value }));

  /* Applied immediately rather than behind a Save button: the whole page
     re-renders in the new language, which IS the confirmation. A Save button
     that changed the UI before you pressed it would be a lie. */
  const onLanguageChange = async (event) => {
    const next = event.target.value;
    if (next === language) return;
    await setLanguage(next);
    toast.success(t("preferences.saved"));
  };

  const previewRows = [
    { key: "currency", options: CURRENCIES },
    { key: "timezone", options: TIMEZONES },
    { key: "areaUnit", options: AREA_UNITS },
    { key: "dateFormat", options: DATE_FORMATS },
  ];

  return (
    <div className="ac-page">
      <div className="ac-container">
        <Link to={base} className="ac-breadcrumb">
          <FiChevronLeft size={18} />
          <span>{t("breadcrumb")}</span>
        </Link>

        <h1 className="ac-title">{t("preferences.title")}</h1>
        <p className="ac-subtitle-text">{t("preferences.subtitle")}</p>

        <div className="ac-sec-body">
          <section className="ac-sec-block">
            {/* ── Language — live ── */}
            <div className="ac-pref-row">
              <div className="ac-notif-info">
                <p className="ac-notif-label">{t("preferences.rows.language.label")}</p>
                <p className="ac-notif-desc">{t("preferences.rows.language.desc")}</p>
              </div>
              <select
                className="ac-select"
                value={language}
                onChange={onLanguageChange}
                disabled={switching}
                aria-label={t("preferences.rows.language.label")}
              >
                {SUPPORTED_LANGUAGES.map((option) => (
                  // Labelled in its own language so someone in the wrong one
                  // can still find their way out.
                  <option key={option.code} value={option.code} lang={option.code}>
                    {option.nativeLabel}
                  </option>
                ))}
              </select>
            </div>
          </section>

          <div className="ac-preview-note">{t("preferences.previewNote")}</div>

          <section className="ac-sec-block">
            {previewRows.map((row) => (
              <div key={row.key} className="ac-pref-row">
                <div className="ac-notif-info">
                  <p className="ac-notif-label">{t(`preferences.rows.${row.key}.label`)}</p>
                  <p className="ac-notif-desc">{t(`preferences.rows.${row.key}.desc`)}</p>
                </div>
                {/* TODO: persist and apply these across the app */}
                <select
                  className="ac-select"
                  value={prefs[row.key]}
                  onChange={set(row.key)}
                  aria-label={t(`preferences.rows.${row.key}.label`)}
                >
                  {row.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}
