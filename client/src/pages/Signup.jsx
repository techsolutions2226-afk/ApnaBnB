import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FiEye, FiEyeOff, FiMail } from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";
import { FaApple, FaFacebook } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/common/Logo";
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
    <div className="auth-page">
      {/* ── Minimal Header ── */}
      <header className="auth-header">
        <Link to="/" className="auth-logo-link" aria-label="apnabnb home">
          <Logo size={56} />
        </Link>
      </header>

      {/* ── Signup Card ── */}
      <div className="auth-card">
        {/* Card Header */}
        <div className="auth-card-header">
          <h1 className="auth-card-title">Sign up</h1>
        </div>

         <div className="auth-card-body">
           <p className="auth-welcome">Welcome to the marketplace</p>

           <form className="auth-form" onSubmit={handleSubmit} noValidate>
             {/* ── Role Selector ── */}
             <div className="auth-role-section">
               <p className="auth-role-title">I want to join as</p>
               <div className="auth-role-grid">
                 {ROLES.map((r) => (
                   <button
                     key={r.value}
                     type="button"
                     className={`auth-role-card ${form.role === r.value ? "auth-role-card--active" : ""} ${errors.role ? "auth-role-card--error" : ""}`}
                    onClick={() => selectRole(r.value)}
                    disabled={isLoading}
                  >
                    <span className="auth-role-icon">{r.icon}</span>
                    <span className="auth-role-label">{r.label}</span>
                    <span className="auth-role-desc">{r.description}</span>
                    {form.role === r.value && (
                      <span className="auth-role-check">
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
                <p className="auth-error" style={{ marginTop: 8 }}>
                  {errors.role}
                </p>
              )}
            </div>

            {/* Name Fields */}
            <div
              className={`auth-input-group ${errors.firstName || errors.lastName ? "auth-input-group--error" : ""}`}
            >
              <div className="auth-input-wrapper auth-input-wrapper--top">
                <input
                  type="text"
                  id="signup-first"
                  className="auth-input"
                  placeholder=" "
                  value={form.firstName}
                  onChange={update("firstName")}
                  autoComplete="given-name"
                  disabled={isLoading}
                />
                <label htmlFor="signup-first" className="auth-label">
                  First name
                </label>
              </div>
              <div className="auth-input-wrapper auth-input-wrapper--bottom">
                <input
                  type="text"
                  id="signup-last"
                  className="auth-input"
                  placeholder=" "
                  value={form.lastName}
                  onChange={update("lastName")}
                  autoComplete="family-name"
                  disabled={isLoading}
                />
                <label htmlFor="signup-last" className="auth-label">
                  Last name
                </label>
              </div>
            </div>
            <p className="auth-hint">
              Make sure it matches the name on your government ID.
            </p>

            {/* Birthdate */}
            <div
              className={`auth-input-group ${errors.birthdate ? "auth-input-group--error" : ""}`}
            >
              <div className="auth-input-wrapper auth-input-wrapper--single">
                <input
                  type="date"
                  id="signup-dob"
                  className="auth-input auth-input--date"
                  value={form.birthdate}
                  onChange={update("birthdate")}
                  autoComplete="bday"
                  disabled={isLoading}
                />
                <label
                  htmlFor="signup-dob"
                  className="auth-label auth-label--date"
                >
                  Date of birth
                </label>
              </div>
            </div>
            <p className="auth-hint">
              To sign up, you need to be at least 18. Your birthday won't be
              shared with other people who use this platform.
            </p>

            {/* Email */}
            <div
              className={`auth-input-group ${errors.email ? "auth-input-group--error" : ""}`}
            >
              <div className="auth-input-wrapper auth-input-wrapper--single">
                <input
                  type="email"
                  id="signup-email"
                  className="auth-input"
                  placeholder=" "
                  value={form.email}
                  onChange={update("email")}
                  autoComplete="email"
                  disabled={isLoading}
                />
                <label htmlFor="signup-email" className="auth-label">
                  Email
                </label>
              </div>
            </div>
            <p className="auth-hint">
              We'll email you property updates and confirmations.
            </p>

            {/* Password */}
            <div
              className={`auth-input-group ${errors.password ? "auth-input-group--error" : ""}`}
            >
              <div className="auth-input-wrapper auth-input-wrapper--single">
                <input
                  type={showPassword ? "text" : "password"}
                  id="signup-password"
                  className="auth-input"
                  placeholder=" "
                  value={form.password}
                  onChange={update("password")}
                  autoComplete="new-password"
                  disabled={isLoading}
                />
                <label htmlFor="signup-password" className="auth-label">
                  Password
                </label>
                <button
                  type="button"
                  className="auth-toggle-pw"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
              {/* Password requirement chips — each turns green when satisfied. */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "8px 14px",
                  marginTop: 10,
                  fontSize: 12,
                  lineHeight: 1.4,
                }}
              >
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
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        color: ok ? "#00a578" : "#9e9e9e",
                        fontWeight: ok ? 600 : 400,
                        transition: "color 0.2s ease",
                      }}
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
              <div className="auth-errors">
                {errors.firstName && (
                  <p className="auth-error">{errors.firstName}</p>
                )}
                {errors.lastName && (
                  <p className="auth-error">{errors.lastName}</p>
                )}
                {errors.birthdate && (
                  <p className="auth-error">{errors.birthdate}</p>
                )}
                {errors.email && <p className="auth-error">{errors.email}</p>}
                {errors.password && (
                  <p className="auth-error">{errors.password}</p>
                )}
                {errors.agreed && (
                  <p className="auth-error">{errors.agreed}</p>
                )}
              </div>
            )}

            {/* Terms & Policy */}
            <p className="auth-terms">
              By selecting <strong>Agree and continue</strong>, I agree to the
              platform's{" "}
              <a href="#" className="auth-terms-link">
                Terms of Service
              </a>
              ,{" "}
              <a href="#" className="auth-terms-link">
                Payments Terms of Service
              </a>
              , and{" "}
              <a href="#" className="auth-terms-link">
                Nondiscrimination Policy
              </a>{" "}
              and acknowledge the{" "}
              <a href="#" className="auth-terms-link">
                Privacy Policy
              </a>
              .
            </p>

            {/* Agree Checkbox */}
            <label className="auth-checkbox-row">
              <input
                type="checkbox"
                className="auth-checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                disabled={isLoading}
              />
              <span className="auth-checkbox-text">
                I agree to the platform's terms and policies
              </span>
            </label>

            <button
              type="submit"
              className="auth-btn auth-btn--primary"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="auth-btn-loading">
                  <span className="auth-spinner" />
                  Creating account...
                </span>
              ) : (
                "Agree and continue"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="auth-divider">
            <span className="auth-divider-line" />
            <span className="auth-divider-text">or</span>
            <span className="auth-divider-line" />
          </div>

          {/* Social Signup Buttons */}
          <div className="auth-social-list">
            <button className="auth-social-btn" disabled={isLoading}>
              <FcGoogle size={22} className="auth-social-icon" />
              <span>Continue with Google</span>
            </button>
            <button className="auth-social-btn" disabled={isLoading}>
              <FaFacebook
                size={22}
                color="#1877F2"
                className="auth-social-icon"
              />
              <span>Continue with Facebook</span>
            </button>
            <button className="auth-social-btn" disabled={isLoading}>
              <FaApple size={22} className="auth-social-icon" />
              <span>Continue with Apple</span>
            </button>
            <button className="auth-social-btn" disabled={isLoading}>
              <FiMail size={22} className="auth-social-icon" />
              <span>Continue with email</span>
            </button>
          </div>

          {/* Login link */}
          <p className="auth-switch">
            Already have an account?{" "}
            <Link to="/login" className="auth-switch-link">
              Log in
            </Link>
          </p>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="auth-footer">
        <p className="auth-footer-text">
          Real Estate Marketplace &mdash; Your trusted property platform.
        </p>
      </footer>
    </div>
  );
};

export default Signup;
