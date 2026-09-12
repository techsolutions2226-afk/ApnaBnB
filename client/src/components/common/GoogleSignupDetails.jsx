/* ─── GoogleSignupDetails — role + phone step for new Google accounts ───
   Google's ID token carries only name / email / picture — no phone number —
   so we collect one here, in the same step where the user picks their role.

   Address is deliberately NOT asked for: it made the Google flow longer than
   the email signup, which never asks. User.location still exists and users
   fill it in from Personal info when they need it.

   Props:
     profile   — { name, email, avatar } from the Google token (display only)
     submitting — disables the form while the account is being created
     onSubmit  — ({ role, phone }) => void
   ─────────────────────────────────────────────── */

import { useState } from "react";

const ROLE_OPTIONS = [
  { value: "buyer", label: "Buyer", icon: "🏠", description: "I'm looking to buy or rent a property" },
  { value: "seller", label: "Seller", icon: "🔑", description: "I own properties and want to list them" },
  { value: "dealer", label: "Dealer / Agent", icon: "🤝", description: "I'm a real estate broker connecting buyers and sellers" },
];

/* Mirrors the server-side check in authController.googleComplete. */
const PHONE_RE = /^[+(\d][\d\s()-]{6,19}$/;

const GoogleSignupDetails = ({ profile, submitting = false, onSubmit }) => {
  const [role, setRole] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState({});

  const validate = () => {
    const next = {};
    if (!role) next.role = "Please choose how you'll use the platform.";
    const trimmedPhone = phone.trim();
    if (!trimmedPhone) next.phone = "Phone number is required.";
    else if (!PHONE_RE.test(trimmedPhone))
      next.phone = "Enter a valid phone number, e.g. +92 300 1234567.";
    return next;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) return;
    onSubmit({ role, phone: phone.trim() });
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
