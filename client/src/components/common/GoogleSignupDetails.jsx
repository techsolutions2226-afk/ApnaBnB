/* ─── GoogleSignupDetails — role + phone + address step for new Google accounts ───
   Google's ID token carries only name / email / picture — no phone number and
   no address — so we collect those here, in the same step where the user picks
   their role, rather than leaving the fields empty in the database.

   The address offers the same three options as the Create Listing page:
     • "detect"  — browser geolocation, reverse-geocoded to a readable area
     • "select"  — City + Area dropdowns (shared CITIES / AREAS_BY_CITY)
     • "manual"  — free-text, for anything the lists don't cover

   Props:
     profile   — { name, email, avatar } from the Google token (display only)
     submitting — disables the form while the account is being created
     onSubmit  — ({ role, phone, location }) => void
   ─────────────────────────────────────────────── */

import { useCallback, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { FiCrosshair, FiList, FiEdit3 } from "react-icons/fi";
import { CITIES, AREAS_BY_CITY } from "../../config/locations";
import { reverseGeocode } from "../../utils/geocode";
import "../../styles/GoogleSignupDetails.css";

const ROLE_OPTIONS = [
  { value: "buyer", label: "Buyer", icon: "🏠", description: "I'm looking to buy or rent a property" },
  { value: "seller", label: "Seller", icon: "🔑", description: "I own properties and want to list them" },
  { value: "dealer", label: "Dealer / Agent", icon: "🤝", description: "I'm a real estate broker connecting buyers and sellers" },
];

const MODES = [
  { key: "detect", label: "Use my location", icon: FiCrosshair },
  { key: "select", label: "Pick city & area", icon: FiList },
  { key: "manual", label: "Type address", icon: FiEdit3 },
];

/* Mirrors the server-side check in authController.googleComplete. */
const PHONE_RE = /^[+(\d][\d\s()-]{6,19}$/;

const GoogleSignupDetails = ({ profile, submitting = false, onSubmit }) => {
  const [role, setRole] = useState("");
  const [phone, setPhone] = useState("");
  const [mode, setMode] = useState("select");

  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [manual, setManual] = useState("");
  const [detected, setDetected] = useState("");
  const [detecting, setDetecting] = useState(false);

  const [errors, setErrors] = useState({});

  const areas = useMemo(() => AREAS_BY_CITY[city] || [], [city]);

  /* The single address string that gets stored on the user record. */
  const composedLocation = useMemo(() => {
    if (mode === "detect") return detected.trim();
    if (mode === "manual") return manual.trim();
    if (!city) return "";
    return area && area !== "Other" ? `${area}, ${city}` : city;
  }, [mode, detected, manual, city, area]);

  const handleDetect = useCallback(() => {
    if (!("geolocation" in navigator)) {
      toast.error("Your browser does not support geolocation.");
      return;
    }
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        try {
          const addr = await reverseGeocode(coords);
          const label =
            [addr.area, addr.city].filter(Boolean).join(", ") ||
            addr.displayName ||
            `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`;
          setDetected(label);
          setErrors((prev) => ({ ...prev, location: undefined }));
          toast.success("Location detected");
        } catch {
          // Reverse geocoding is best-effort; keep the coordinates so the
          // signup can still complete rather than failing the whole step.
          setDetected(`${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`);
          toast.info("Saved your coordinates — you can edit this later.");
        } finally {
          setDetecting(false);
        }
      },
      (err) => {
        setDetecting(false);
        const msg =
          err.code === 1
            ? "Permission denied. Allow location access, or pick your city instead."
            : err.code === 3
              ? "Timed out while fetching your location. Try again."
              : err.message || "Could not fetch your location.";
        toast.error(msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }, []);

  const validate = () => {
    const next = {};
    if (!role) next.role = "Please choose how you'll use the platform.";
    const trimmedPhone = phone.trim();
    if (!trimmedPhone) next.phone = "Phone number is required.";
    else if (!PHONE_RE.test(trimmedPhone))
      next.phone = "Enter a valid phone number, e.g. +92 300 1234567.";
    if (!composedLocation) {
      next.location =
        mode === "detect"
          ? "Detect your location, or switch to picking a city."
          : mode === "manual"
            ? "Enter your business address."
            : "Select your city.";
    }
    return next;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) return;
    onSubmit({ role, phone: phone.trim(), location: composedLocation });
  };

  return (
    <form className="gsd-form" onSubmit={handleSubmit} noValidate>
      {profile?.name && (
        <p className="gsd-intro">
          Welcome to ApnaBnB, {profile.name}. A few details finish setting up
          your account.
        </p>
      )}

      {/* ── Role ── */}
      <fieldset className="gsd-fieldset">
        <legend className="gsd-legend">How will you use the platform?</legend>
        <div className="signup-role-grid">
          {ROLE_OPTIONS.map((r) => (
            <button
              key={r.value}
              type="button"
              className={`signup-role-card ${role === r.value ? "signup-role-card--active" : ""}`}
              onClick={() => {
                setRole(r.value);
                setErrors((prev) => ({ ...prev, role: undefined }));
              }}
              aria-pressed={role === r.value}
            >
              <span className="signup-role-icon">{r.icon}</span>
              <span className="signup-role-label">{r.label}</span>
              <span className="signup-role-desc">{r.description}</span>
              {role === r.value && (
                <span className="signup-role-check">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
              )}
            </button>
          ))}
        </div>
        {errors.role && <p className="gsd-error">{errors.role}</p>}
      </fieldset>

      {/* ── Phone ── */}
      <div className="gsd-field">
        <label className="gsd-label" htmlFor="gsd-phone">
          Phone number
        </label>
        <input
          id="gsd-phone"
          type="tel"
          className={`gsd-input ${errors.phone ? "gsd-input--error" : ""}`}
          placeholder="+92 300 1234567"
          value={phone}
          autoComplete="tel"
          onChange={(e) => {
            setPhone(e.target.value);
            if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
          }}
        />
        {errors.phone && <p className="gsd-error">{errors.phone}</p>}
      </div>

      {/* ── Business address ── */}
      <div className="gsd-field">
        <span className="gsd-label">Business address</span>

        <div className="gsd-modes" role="group" aria-label="How to set your address">
          {MODES.map((m) => {
            const Icon = m.icon;
            const { key, label } = m;
            return (
            <button
              key={key}
              type="button"
              className={`gsd-mode ${mode === key ? "gsd-mode--active" : ""}`}
              onClick={() => {
                setMode(key);
                setErrors((prev) => ({ ...prev, location: undefined }));
              }}
              aria-pressed={mode === key}
            >
              <Icon size={14} />
              {label}
            </button>
            );
          })}
        </div>

        {mode === "detect" && (
          <div className="gsd-detect">
            <button
              type="button"
              className="gsd-detect-btn"
              onClick={handleDetect}
              disabled={detecting}
            >
              <FiCrosshair size={14} />
              {detecting ? "Detecting…" : "Detect my location"}
            </button>
            {detected && <p className="gsd-detected">{detected}</p>}
          </div>
        )}

        {mode === "select" && (
          <div className="gsd-row">
            <div>
              <label className="gsd-sublabel" htmlFor="gsd-city">City</label>
              <select
                id="gsd-city"
                className={`gsd-input ${errors.location ? "gsd-input--error" : ""}`}
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  setArea("");
                  setErrors((prev) => ({ ...prev, location: undefined }));
                }}
              >
                <option value="">Select city</option>
                {CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="gsd-sublabel" htmlFor="gsd-area">Area</label>
              <select
                id="gsd-area"
                className="gsd-input"
                value={area}
                disabled={!areas.length}
                onChange={(e) => setArea(e.target.value)}
              >
                <option value="">
                  {areas.length ? "Select area" : "Select a city first"}
                </option>
                {areas.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {mode === "manual" && (
          <input
            className={`gsd-input ${errors.location ? "gsd-input--error" : ""}`}
            placeholder="e.g. Office 4, Main Boulevard, Gulberg III, Lahore"
            value={manual}
            maxLength={200}
            aria-label="Business address"
            onChange={(e) => {
              setManual(e.target.value);
              if (errors.location) setErrors((prev) => ({ ...prev, location: undefined }));
            }}
          />
        )}

        {errors.location && <p className="gsd-error">{errors.location}</p>}
        {composedLocation && !errors.location && mode !== "detect" && (
          <p className="gsd-preview">Saving as: {composedLocation}</p>
        )}
      </div>

      <button type="submit" className="gsd-submit" disabled={submitting}>
        {submitting ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
};

export default GoogleSignupDetails;
