/* ─── GoogleSignupDetails — role + phone + address step for new Google accounts ───
   Google's ID token carries only name / email / picture — no phone number and
   no address — so we collect those here, in the same step where the user picks
   their role, rather than leaving the fields empty in the database.

   The address offers two options:
     • "detect"  — browser geolocation; stores the reverse-geocoded address
                   AND the raw latitude/longitude
     • "manual"  — free-text, for anything geolocation can't resolve

   Props:
     profile   — { name, email, avatar } from the Google token (display only)
     submitting — disables the form while the account is being created
     onSubmit  — ({ role, phone, location, latitude, longitude }) => void
   ─────────────────────────────────────────────── */

import { useCallback, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { FiCrosshair, FiEdit3 } from "react-icons/fi";
import { reverseGeocode } from "../../utils/geocode";

const ROLE_OPTIONS = [
  { value: "buyer", label: "Buyer", icon: "🏠", description: "I'm looking to buy or rent a property" },
  { value: "seller", label: "Seller", icon: "🔑", description: "I own properties and want to list them" },
  { value: "dealer", label: "Dealer / Agent", icon: "🤝", description: "I'm a real estate broker connecting buyers and sellers" },
];

const MODES = [
  { key: "detect", label: "Use my location", icon: FiCrosshair },
  { key: "manual", label: "Type address", icon: FiEdit3 },
];

/* Mirrors the server-side check in authController.googleComplete. */
const PHONE_RE = /^[+(\d][\d\s()-]{6,19}$/;

const GoogleSignupDetails = ({ profile, submitting = false, onSubmit }) => {
  const [role, setRole] = useState("");
  const [phone, setPhone] = useState("");
  const [mode, setMode] = useState("detect");

  const [manual, setManual] = useState("");
  const [detected, setDetected] = useState("");
  const [coords, setCoords] = useState(null); // { lat, lng } from geolocation
  const [detecting, setDetecting] = useState(false);

  const [errors, setErrors] = useState({});

  /* The single address string that gets stored on the user record. */
  const composedLocation = useMemo(
    () => (mode === "detect" ? detected.trim() : manual.trim()),
    [mode, detected, manual],
  );

  const handleDetect = useCallback(() => {
    if (!("geolocation" in navigator)) {
      toast.error("Your browser does not support geolocation.");
      return;
    }
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(point);
        try {
          const addr = await reverseGeocode(point);
          const label =
            [addr.area, addr.city].filter(Boolean).join(", ") ||
            addr.displayName ||
            `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`;
          setDetected(label);
          setErrors((prev) => ({ ...prev, location: undefined }));
          toast.success("Location detected");
        } catch {
          // Reverse geocoding is best-effort; keep the coordinates so the
          // signup can still complete rather than failing the whole step.
          setDetected(`${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`);
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
          ? "Detect your location, or switch to typing your address."
          : "Enter your business address.";
    }
    return next;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) return;
    onSubmit({
      role,
      phone: phone.trim(),
      location: composedLocation,
      latitude: mode === "detect" ? coords?.lat ?? null : null,
      longitude: mode === "detect" ? coords?.lng ?? null : null,
    });
  };

  const inputBase =
    "w-full h-10 px-3.5 text-sm rounded-lg bg-white text-slate-900 placeholder:text-slate-400 border transition-colors focus:outline-none focus:ring-2 disabled:bg-slate-50 disabled:text-slate-400";
  const inputCls = (hasErr) =>
    `${inputBase} ${
      hasErr
        ? "border-danger-500 focus:border-danger-500 focus:ring-danger-500/20"
        : "border-slate-200 hover:border-slate-300 focus:border-primary-500 focus:ring-primary-500/20"
    }`;

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
      {profile?.name && (
        <p className="text-sm text-slate-600">
          Welcome to ApnaBnB, {profile.name}. A few details finish setting up
          your account.
        </p>
      )}

      {/* ── Role ── */}
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-slate-700">
          How will you use the platform?
        </legend>
        <div className="grid grid-cols-3 gap-2">
          {ROLE_OPTIONS.map((r) => (
            <button
              key={r.value}
              type="button"
              className={`relative flex flex-col items-start gap-1 p-2.5 text-left rounded-xl border transition-colors ${
                role === r.value
                  ? "border-primary-600 bg-primary-50"
                  : "border-slate-200 hover:border-slate-300"
              }`}
              onClick={() => {
                setRole(r.value);
                setErrors((prev) => ({ ...prev, role: undefined }));
              }}
              aria-pressed={role === r.value}
            >
              <span className="text-base leading-none">{r.icon}</span>
              <span className={`text-sm font-semibold ${role === r.value ? "text-primary-700" : "text-slate-800"}`}>
                {r.label}
              </span>
              <span className="text-[11px] leading-tight text-slate-500">
                {r.description}
              </span>
              {role === r.value && (
                <span className="absolute top-1.5 right-1.5 flex items-center justify-center h-4 w-4 rounded-full bg-primary-600 text-white">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
              )}
            </button>
          ))}
        </div>
        {errors.role && <p className="text-xs text-danger-600">{errors.role}</p>}
      </fieldset>

      {/* ── Phone ── */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-700" htmlFor="gsd-phone">
          Phone number
        </label>
        <input
          id="gsd-phone"
          type="tel"
          className={inputCls(!!errors.phone)}
          placeholder="+92 300 1234567"
          value={phone}
          autoComplete="tel"
          onChange={(e) => {
            setPhone(e.target.value);
            if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
          }}
        />
        {errors.phone && <p className="text-xs text-danger-600">{errors.phone}</p>}
      </div>

      {/* ── Business address ── */}
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-slate-700">Business address</span>

        <div className="flex gap-2" role="group" aria-label="How to set your address">
          {MODES.map((m) => {
            const Icon = m.icon;
            const { key, label } = m;
            return (
              <button
                key={key}
                type="button"
                className={`inline-flex items-center gap-1.5 h-9 px-3 text-sm rounded-lg border transition-colors ${
                  mode === key
                    ? "bg-primary-50 text-primary-700 border-primary-500"
                    : "text-slate-600 border-slate-200 hover:border-slate-300"
                }`}
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
          <div className="mt-1">
            <button
              type="button"
              className="inline-flex items-center gap-2 h-9 px-3 text-sm font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
              onClick={handleDetect}
              disabled={detecting}
            >
              <FiCrosshair size={14} />
              {detecting ? "Detecting…" : "Detect my location"}
            </button>
            {detected && (
              <div className="mt-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <p className="text-sm text-slate-700">{detected}</p>
                {coords && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {mode === "manual" && (
          <input
            className={inputCls(!!errors.location)}
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

        {errors.location && <p className="text-xs text-danger-600">{errors.location}</p>}
      </div>

      <button
        type="submit"
        className="flex items-center justify-center h-11 w-full text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        disabled={submitting}
      >
        {submitting ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
};

export default GoogleSignupDetails;
