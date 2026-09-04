import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import useAccountPath from "../hooks/useAccountPath";
import { FiChevronLeft } from "react-icons/fi";
import "../styles/Account.css";

/* ─── Global preferences — FRONTEND ONLY ───
   Language, currency, timezone and measurement units. Selections change on
   screen but are not saved and do not affect the rest of the app yet.
*/

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "ur", label: "اردو (Urdu)" },
  { value: "pa", label: "پنجابی (Punjabi)" },
  { value: "sd", label: "سنڌي (Sindhi)" },
];

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
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { base } = useAccountPath();

  // Local-only mirrors; these do not persist anywhere yet.
  const [prefs, setPrefs] = useState({
    language: "en",
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

  const rows = [
    {
      key: "language",
      label: "Language",
      desc: "The language used across the site.",
      options: LANGUAGES,
    },
    {
      key: "currency",
      label: "Currency",
      desc: "Prices are shown in this currency.",
      options: CURRENCIES,
    },
    {
      key: "timezone",
      label: "Timezone",
      desc: "Used for viewing times and scheduled visits.",
      options: TIMEZONES,
    },
    {
      key: "areaUnit",
      label: "Area units",
      desc: "How property sizes are measured.",
      options: AREA_UNITS,
    },
    {
      key: "dateFormat",
      label: "Date format",
      desc: "How dates appear throughout the site.",
      options: DATE_FORMATS,
    },
  ];

  return (
    <div className="ac-page">
      <div className="ac-container">
        <Link to={base} className="ac-breadcrumb">
          <FiChevronLeft size={18} />
          <span>Account</span>
        </Link>

        <h1 className="ac-title">Global preferences</h1>
        <p className="ac-subtitle-text">
          Set your default language, currency, and timezone.
        </p>

        <div className="ac-preview-note">
          This section is a preview — these controls aren&apos;t connected yet.
        </div>

        <div className="ac-sec-body">
          <section className="ac-sec-block">
            {rows.map((row) => (
              <div key={row.key} className="ac-pref-row">
                <div className="ac-notif-info">
                  <p className="ac-notif-label">{row.label}</p>
                  <p className="ac-notif-desc">{row.desc}</p>
                </div>
                {/* TODO: persist and apply this preference app-wide */}
                <select
                  className="ac-select"
                  value={prefs[row.key]}
                  onChange={set(row.key)}
                  aria-label={row.label}
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

          <div className="ac-sec-form-actions">
            {/* TODO: save the preference set */}
            <button type="button" className="ac-field-save-btn" disabled>
              Save preferences
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
