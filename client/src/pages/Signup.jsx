import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/common/Logo";
import GoogleAuthButton from "../components/common/GoogleAuthButton";
import {
  validateSignupForm,
  passwordChecks,
  NAME_MAX,
  EMAIL_MAX,
  MIN_YEAR,
} from "../utils/signupValidation";
import "../styles/Auth.css";

/* ── Role options for the selector ── */
const ROLES = [
  {
    value: "buyer",
    label: "Buyer",
    icon: "🏠",
    description: "I'm looking to buy or rent a property",
  },
  {
    value: "seller",
    label: "Seller",
    icon: "🔑",
    description: "I own properties and want to list them",
  },
  {
    value: "dealer",
    label: "Dealer / Agent",
    icon: "🤝",
    description: "I'm a real estate broker connecting buyers and sellers",
  },
];

/* Legal documents linked from the terms notice. They open in a new tab. */
const LEGAL_LINKS = {
  terms: "Terms of Service",
  payments: "Payments Terms of Service",
  nondiscrimination: "Nondiscrimination Policy",
  privacy: "Privacy Policy",
};

const todayStr = () => new Date().toISOString().split("T")[0];

const Signup = () => {
  const { signup, isLoading, isAuthenticated, getDashboardPath } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    birthdate: "",
    role: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [touched, setTouched] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  // Errors that come from the server (e.g. duplicate email) — keyed by field.
  const [serverErrors, setServerErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  // Synchronous re-entry guard so a rapid double-click can't fire two requests
  // in the gap before React re-renders the disabled button.
  const submittingRef = useRef(false);

  /* Redirect authenticated users to their dashboard */
  useEffect(() => {
    if (isAuthenticated) {
      navigate(getDashboardPath(), { replace: true });
    }
  }, [isAuthenticated, getDashboardPath, navigate]);

  /* Live validation — recomputed on every keystroke so the submit button and
     inline messages always reflect the current input. */
  const { errors, isValid } = useMemo(
    () => validateSignupForm(form, agreed),
    [form, agreed],
  );

  const pwChecks = passwordChecks(form.password);

  const update = (field) => (e) => {
    const { value } = e.target;
    setForm((prev) => ({ ...prev, [field]: value }));
    // A field the user edits should drop any stale server error for it.
    if (serverErrors[field]) {
      setServerErrors((prev) => {
        const { [field]: _drop, ...rest } = prev;
        return rest;
      });
    }
  };

  const markTouched = (field) => () =>
    setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));

  const selectRole = (role) => {
    setForm((prev) => ({ ...prev, role }));
    setTouched((prev) => ({ ...prev, role: true }));
  };

  // Show an error only once the field is touched or a submit has been tried.
  const shownError = (field) => {
    if (!(touched[field] || submitAttempted)) return null;
    return serverErrors[field] || errors[field] || null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitAttempted(true);

    if (!isValid) {
      toast.error("Please fix the highlighted fields");
      return;
    }
    // Double-submit guards: ref (synchronous) + state (render).
    if (submittingRef.current || isLoading || submitting) return;
    submittingRef.current = true;
    setSubmitting(true);

    try {
      const result = await signup({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        birthdate: form.birthdate,
        role: form.role,
      });
      const verifyEmail = result?.email || form.email.trim();
      toast.success("We sent a verification code to your email.");
      navigate(`/verify-email?email=${encodeURIComponent(verifyEmail)}`, {
        replace: true,
      });
    } catch (err) {
      const code = err?.code;
      const msg = err?.message || "";
      if (code === "EMAIL_IN_USE" || /already (exists|in use)/i.test(msg)) {
        setServerErrors((prev) => ({ ...prev, email: "Email already in use" }));
        toast.error("Email already in use");
      } else {
        toast.error(msg || "Signup failed. Please try again.");
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const busy = isLoading || submitting;
  const wrapClass = (field) =>
    `signup-input-wrapper ${shownError(field) ? "signup-input-wrapper--error" : ""}`;

  return (
    <div className="signup-page">
      {/* ── Left Panel: brand / imagery ── */}
      <div className="signup-left">
        <Link to="/" className="signup-logo-link" aria-label="apnabnb home">
          <span className="signup-logo-wrap">
            <Logo size={40} />
          </span>
        </Link>

        <div className="signup-left-content">
          <h1 className="signup-left-title">Discover Your Next Space</h1>
        </div>
      </div>

      {/* ── Right Panel: signup form ── */}
      <div className="signup-right">
        <div className="signup-right-inner">
          <h1 className="signup-title">Welcome to the marketplace</h1>
          <p className="signup-subtitle">Join 10,000+ verified members.</p>

          <form className="signup-form" onSubmit={handleSubmit} noValidate>
            {/* ── Role Selector ── */}
            <div className="signup-role-section">
              <p className="signup-role-title">I want to join as</p>
              <div className="signup-role-grid">
                {ROLES.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    className={`signup-role-card ${form.role === r.value ? "signup-role-card--active" : ""} ${shownError("role") ? "signup-role-card--error" : ""}`}
                    onClick={() => selectRole(r.value)}
                    disabled={busy}
                  >
                    <span className="signup-role-icon">{r.icon}</span>
                    <span className="signup-role-label">{r.label}</span>
                    <span className="signup-role-desc">{r.description}</span>
                    {form.role === r.value && (
                      <span className="signup-role-check">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                    )}
                  </button>
                ))}
              </div>
              {shownError("role") && (
                <p className="signup-error" style={{ marginTop: 8 }}>
                  {shownError("role")}
                </p>
              )}
            </div>

            {/* Name Fields */}
            <div className="signup-field-row-pair">
              <div className="signup-field">
                <label htmlFor="signup-first" className="signup-field-label">
                  First name
                </label>
                <div className={wrapClass("firstName")}>
                  <input
                    type="text"
                    id="signup-first"
                    className="signup-input"
                    placeholder="First name"
                    value={form.firstName}
                    onChange={update("firstName")}
                    onBlur={markTouched("firstName")}
                    autoComplete="given-name"
                    maxLength={NAME_MAX}
                    disabled={busy}
                  />
                </div>
                {shownError("firstName") && (
                  <p className="signup-error">{shownError("firstName")}</p>
                )}
              </div>
              <div className="signup-field">
                <label htmlFor="signup-last" className="signup-field-label">
                  Last name
                </label>
                <div className={wrapClass("lastName")}>
                  <input
                    type="text"
                    id="signup-last"
                    className="signup-input"
                    placeholder="Last name"
                    value={form.lastName}
                    onChange={update("lastName")}
                    onBlur={markTouched("lastName")}
                    autoComplete="family-name"
                    maxLength={NAME_MAX}
                    disabled={busy}
                  />
                </div>
                {shownError("lastName") && (
                  <p className="signup-error">{shownError("lastName")}</p>
                )}
              </div>
            </div>
            <p className="signup-hint">
              Make sure it matches the name on your government ID.
            </p>

            {/* Birthdate */}
            <div className="signup-field">
              <label htmlFor="signup-dob" className="signup-field-label">
                Date of birth
              </label>
              <div className={wrapClass("birthdate")}>
                <input
                  type="date"
                  id="signup-dob"
                  className="signup-input signup-input--date"
                  value={form.birthdate}
                  onChange={update("birthdate")}
                  onBlur={markTouched("birthdate")}
                  autoComplete="bday"
                  min={`${MIN_YEAR}-01-01`}
                  max={todayStr()}
                  disabled={busy}
                />
              </div>
              {shownError("birthdate") ? (
                <p className="signup-error">{shownError("birthdate")}</p>
              ) : (
                <p className="signup-hint">
                  You need to be at least 18. Your birthday won't be shared with
                  other people who use this platform.
                </p>
              )}
            </div>

            {/* Email */}
            <div className="signup-field">
              <label htmlFor="signup-email" className="signup-field-label">
                Email
              </label>
              <div className={wrapClass("email")}>
                <input
                  type="email"
                  id="signup-email"
                  className="signup-input"
                  placeholder="name@example.com"
                  value={form.email}
                  onChange={update("email")}
                  onBlur={markTouched("email")}
                  autoComplete="email"
                  maxLength={EMAIL_MAX}
                  disabled={busy}
                />
              </div>
              {shownError("email") ? (
                <p className="signup-error">{shownError("email")}</p>
              ) : (
                <p className="signup-hint">
                  We'll email you property updates and confirmations.
                </p>
              )}
            </div>

            {/* Mobile number */}
            <div className="signup-field">
              <label htmlFor="signup-phone" className="signup-field-label">
                Mobile number
              </label>
              <div className={wrapClass("phone")}>
                <input
                  type="tel"
                  id="signup-phone"
                  className="signup-input"
                  placeholder="03XX XXXXXXX"
                  value={form.phone}
                  onChange={update("phone")}
                  onBlur={markTouched("phone")}
                  autoComplete="tel"
                  maxLength={20}
                  disabled={busy}
                />
              </div>
              {shownError("phone") ? (
                <p className="signup-error">{shownError("phone")}</p>
              ) : (
                <p className="signup-hint">
                  Buyers and sellers use this to reach you once a deal is matched.
                </p>
              )}
            </div>

            {/* Password */}
            <div className="signup-field">
              <label htmlFor="signup-password" className="signup-field-label">
                Password
              </label>
              <div
                className={`signup-input-wrapper ${shownError("password") ? "signup-input-wrapper--error" : ""}`}
              >
                <input
                  type={showPassword ? "text" : "password"}
                  id="signup-password"
                  className="signup-input signup-input--password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={update("password")}
                  onBlur={markTouched("password")}
                  autoComplete="new-password"
                  disabled={busy}
                />
                <button
                  type="button"
                  className="signup-toggle-pw"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
              {/* Password requirement chips — each turns green when satisfied. */}
              <div className="signup-pw-checks">
                {[
                  { key: "length", label: "At least 8 characters" },
                  { key: "lowercase", label: "Lowercase letter" },
                  { key: "uppercase", label: "Uppercase letter" },
                  { key: "number", label: "Numeric digit" },
                  { key: "special", label: "Special character" },
                ].map(({ key, label }) => {
                  const ok = pwChecks[key];
                  return (
                    <span
                      key={key}
                      className={`signup-pw-chip ${ok ? "signup-pw-chip--ok" : ""}`}
                    >
                      <span aria-hidden="true">{ok ? "✓" : "○"}</span>
                      {label}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Terms & Policy */}
            <p className="signup-terms">
              By selecting <strong>Agree and continue</strong>, I agree to the
              platform's{" "}
              {Object.entries(LEGAL_LINKS).map(([slug, label], i, arr) => (
                <span key={slug}>
                  <a
                    href={`/legal/${slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="signup-terms-link"
                  >
                    {label}
                  </a>
                  {i < arr.length - 2 ? ", " : i === arr.length - 2 ? ", and " : "."}
                </span>
              ))}
            </p>

            {/* Agree Checkbox */}
            <label className="signup-checkbox-row">
              <input
                type="checkbox"
                className="signup-checkbox"
                checked={agreed}
                onChange={(e) => {
                  setAgreed(e.target.checked);
                  setTouched((prev) => ({ ...prev, agreed: true }));
                }}
                disabled={busy}
              />
              <span className="signup-checkbox-text">
                I agree to the platform's terms and policies
              </span>
            </label>
            {shownError("agreed") && (
              <p className="signup-error">{shownError("agreed")}</p>
            )}

            <button
              type="submit"
              className="signup-submit-btn"
              disabled={busy || !isValid}
            >
              {busy ? (
                <span className="signup-btn-loading">
                  <span className="signup-spinner" />
                  Creating account...
                </span>
              ) : (
                "Agree and continue"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="signup-divider">
            <span className="signup-divider-line" />
            <span className="signup-divider-text">or</span>
            <span className="signup-divider-line" />
          </div>

          {/* Social Signup Buttons */}
          <div className="signup-social-list">
            <GoogleAuthButton className="signup-social-btn" />
          </div>

          {/* Login link */}
          <p className="signup-switch">
            Already have an account?{" "}
            <Link to="/login" className="signup-switch-link">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
