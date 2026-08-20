import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/common/Logo";
import GoogleAuthButton from "../components/common/GoogleAuthButton";
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

  /* Redirect authenticated users to their dashboard */
  useEffect(() => {
    if (isAuthenticated) {
      navigate(getDashboardPath(), { replace: true });
    }
  }, [isAuthenticated, getDashboardPath, navigate]);
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState({});

  const update = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const selectRole = (role) => {
    setForm((prev) => ({ ...prev, role }));
    setErrors((prev) => {
      const { role: _, ...rest } = prev;
      return rest;
    });
  };

  /* Per-rule password checks. Each is evaluated as you type so the chip
     below the input can flip from grey to green in real time. */
  const pwChecks = {
    lowercase: /[a-z]/.test(form.password),
    uppercase: /[A-Z]/.test(form.password),
    number: /[0-9]/.test(form.password),
    special: /[^A-Za-z0-9]/.test(form.password),
  };

  const validate = () => {
    const errs = {};
    if (!form.firstName.trim()) errs.firstName = "First name is required";
    if (!form.lastName.trim()) errs.lastName = "Last name is required";
    if (!form.email.trim()) errs.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email))
      errs.email = "Enter a valid email";
    if (!form.phone.trim()) errs.phone = "Mobile number is required";
    else {
      const digits = form.phone.replace(/[^\d]/g, "");
      if (digits.length < 10 || digits.length > 15)
        errs.phone = "Enter a valid mobile number";
    }
    if (!form.password) errs.password = "Password is required";
    else if (!pwChecks.lowercase)
      errs.password = "Password must contain a lowercase letter";
    else if (!pwChecks.uppercase)
      errs.password = "Password must contain an uppercase letter";
    else if (!pwChecks.number)
      errs.password = "Password must contain a number";
    else if (!pwChecks.special)
      errs.password = "Password must contain a special character";
    if (!form.birthdate) errs.birthdate = "Date of birth is required";
    if (!form.role) errs.role = "Please select how you want to use the platform";
    if (!agreed) errs.agreed = "You must agree to the terms";
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.error("Please fix the errors above");
      return;
    }

    try {
      const result = await signup({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        password: form.password,
        birthdate: form.birthdate,
        role: form.role,
      });
      // Backend now sends an OTP and returns { email, requiresVerification }
      const verifyEmail = result?.email || form.email;
      toast.success("We sent a verification code to your email.");
      navigate(`/verify-email?email=${encodeURIComponent(verifyEmail)}`, {
        replace: true,
      });
    } catch (err) {
      toast.error(err.message || "Signup failed. Please try again.");
    }
  };

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
                    className={`signup-role-card ${form.role === r.value ? "signup-role-card--active" : ""} ${errors.role ? "signup-role-card--error" : ""}`}
                    onClick={() => selectRole(r.value)}
                    disabled={isLoading}
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
              {errors.role && (
                <p className="signup-error" style={{ marginTop: 8 }}>
                  {errors.role}
                </p>
              )}
            </div>

            {/* Name Fields */}
            <div className="signup-field-row-pair">
              <div className="signup-field">
                <label htmlFor="signup-first" className="signup-field-label">
                  First name
                </label>
                <div
                  className={`signup-input-wrapper ${errors.firstName ? "signup-input-wrapper--error" : ""}`}
                >
                  <input
                    type="text"
                    id="signup-first"
                    className="signup-input"
                    placeholder="First name"
                    value={form.firstName}
                    onChange={update("firstName")}
                    autoComplete="given-name"
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="signup-field">
                <label htmlFor="signup-last" className="signup-field-label">
                  Last name
                </label>
                <div
                  className={`signup-input-wrapper ${errors.lastName ? "signup-input-wrapper--error" : ""}`}
                >
                  <input
                    type="text"
                    id="signup-last"
                    className="signup-input"
                    placeholder="Last name"
                    value={form.lastName}
                    onChange={update("lastName")}
                    autoComplete="family-name"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>
            <p className="signup-hint">
              Make sure it matches the name on your government ID.
            </p>

            {/* Birthdate */}
            <div className="signup-field">
              <label htmlFor="signup-dob" className="signup-field-label">
                Date of birth (dd/mm/yyyy)
              </label>
              <div
                className={`signup-input-wrapper ${errors.birthdate ? "signup-input-wrapper--error" : ""}`}
              >
                <input
                  type="date"
                  id="signup-dob"
                  className="signup-input signup-input--date"
                  value={form.birthdate}
                  onChange={update("birthdate")}
                  autoComplete="bday"
                  disabled={isLoading}
                />
              </div>
              <p className="signup-hint">
                To sign up, you need to be at least 18. Your birthday won't be
                shared with other people who use this platform.
              </p>
            </div>

            {/* Email */}
            <div className="signup-field">
              <label htmlFor="signup-email" className="signup-field-label">
                Email
              </label>
              <div
                className={`signup-input-wrapper ${errors.email ? "signup-input-wrapper--error" : ""}`}
              >
                <input
                  type="email"
                  id="signup-email"
                  className="signup-input"
                  placeholder="name@example.com"
                  value={form.email}
                  onChange={update("email")}
                  autoComplete="email"
                  disabled={isLoading}
                />
              </div>
              <p className="signup-hint">
                We'll email you property updates and confirmations.
              </p>
            </div>

            {/* Mobile number */}
            <div className="signup-field">
              <label htmlFor="signup-phone" className="signup-field-label">
                Mobile number
              </label>
              <div
                className={`signup-input-wrapper ${errors.phone ? "signup-input-wrapper--error" : ""}`}
              >
                <input
                  type="tel"
                  id="signup-phone"
                  className="signup-input"
                  placeholder="03XX XXXXXXX"
                  value={form.phone}
                  onChange={update("phone")}
                  autoComplete="tel"
                  disabled={isLoading}
                />
              </div>
              <p className="signup-hint">
                Buyers and sellers use this to reach you once a deal is matched.
              </p>
            </div>

            {/* Password */}
            <div className="signup-field">
              <label htmlFor="signup-password" className="signup-field-label">
                Password
              </label>
              <div
                className={`signup-input-wrapper ${errors.password ? "signup-input-wrapper--error" : ""}`}
              >
                <input
                  type={showPassword ? "text" : "password"}
                  id="signup-password"
                  className="signup-input signup-input--password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={update("password")}
                  autoComplete="new-password"
                  disabled={isLoading}
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

            {/* Validation Errors */}
            {Object.keys(errors).length > 0 && (
              <div className="signup-errors">
                {errors.firstName && (
                  <p className="signup-error">{errors.firstName}</p>
                )}
                {errors.lastName && (
                  <p className="signup-error">{errors.lastName}</p>
                )}
                {errors.birthdate && (
                  <p className="signup-error">{errors.birthdate}</p>
                )}
                {errors.email && <p className="signup-error">{errors.email}</p>}
                {errors.phone && <p className="signup-error">{errors.phone}</p>}
                {errors.password && (
                  <p className="signup-error">{errors.password}</p>
                )}
                {errors.agreed && (
                  <p className="signup-error">{errors.agreed}</p>
                )}
              </div>
            )}

            {/* Terms & Policy */}
            <p className="signup-terms">
              By selecting <strong>Agree and continue</strong>, I agree to the
              platform's{" "}
              <a href="#" className="signup-terms-link">
                Terms of Service
              </a>
              ,{" "}
              <a href="#" className="signup-terms-link">
                Payments Terms of Service
              </a>
              , and{" "}
              <a href="#" className="signup-terms-link">
                Nondiscrimination Policy
              </a>{" "}
              and acknowledge the{" "}
              <a href="#" className="signup-terms-link">
                Privacy Policy
              </a>
              .
            </p>

            {/* Agree Checkbox */}
            <label className="signup-checkbox-row">
              <input
                type="checkbox"
                className="signup-checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                disabled={isLoading}
              />
              <span className="signup-checkbox-text">
                I agree to the platform's terms and policies
              </span>
            </label>

            <button
              type="submit"
              className="signup-submit-btn"
              disabled={isLoading}
            >
              {isLoading ? (
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