import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FiEye, FiEyeOff, FiMail } from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";
import { FaApple, FaFacebook } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/common/Logo";
import "../styles/Auth.css";

const Login = () => {
  const { login, isLoading, isAuthenticated, getDashboardPath } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  /* Redirect authenticated users to their dashboard */
  useEffect(() => {
    if (isAuthenticated) {
      navigate(getDashboardPath(), { replace: true });
    }
  }, [isAuthenticated, getDashboardPath, navigate]);

  const validate = () => {
    const errs = {};
    if (!email.trim()) errs.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = "Enter a valid email";
    if (!password) errs.password = "Password is required";
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
      const user = await login(email, password);
      toast.success("Login successful! Redirecting...");
      /* Navigate to role-based dashboard */
      const dashboardPath =
        user.role === "admin"
          ? "/admin"
          : `/dashboard/${user.role}`;
      navigate(dashboardPath, { replace: true });
    } catch (err) {
      // Backend returns { code, message } so we can show targeted toasts.
      const code = err?.code;
      if (code === "EMAIL_NOT_FOUND") {
        toast.error("Email not found");
        setErrors({ email: "Email not found" });
      } else if (code === "WRONG_PASSWORD") {
        toast.error("Wrong password");
        setErrors({ password: "Wrong password" });
      } else if (code === "EMAIL_NOT_VERIFIED") {
        toast.info("Please verify your email to continue.");
        const targetEmail = err?.email || email;
        navigate(
          `/verify-email?email=${encodeURIComponent(targetEmail)}`,
          { replace: true }
        );
      } else {
        toast.error(err?.message || "Login failed. Please try again.");
      }
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

      {/* ── Login Card ── */}
      <div className="auth-card">
        {/* Card Header */}
        <div className="auth-card-header">
          <h1 className="auth-card-title">Log in</h1>
        </div>

         <div className="auth-card-body">
           <p className="auth-welcome">Welcome to the marketplace</p>

           {/* Email / Password Form */}
           <form className="auth-form" onSubmit={handleSubmit} noValidate>
             <div
               className={`auth-input-group ${errors.email || errors.password ? "auth-input-group--error" : ""}`}
             >
               <div className="auth-input-wrapper auth-input-wrapper--top">
                 <input
                   type="email"
                   id="login-email"
                   className="auth-input"
                   placeholder=" "
                   value={email}
                   onChange={(e) => {
                     setEmail(e.target.value);
                  }}
                  autoComplete="email"
                  disabled={isLoading}
                />
                <label htmlFor="login-email" className="auth-label">
                  Email
                </label>
              </div>
              <div className="auth-input-wrapper auth-input-wrapper--bottom">
                <input
                  type={showPassword ? "text" : "password"}
                  id="login-password"
                  className="auth-input"
                  placeholder=" "
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                  }}
                  autoComplete="current-password"
                  disabled={isLoading}
                />
                <label htmlFor="login-password" className="auth-label">
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
            </div>

            {/* Validation Errors */}
            {(errors.email || errors.password) && (
              <div className="auth-errors">
                {errors.email && <p className="auth-error">{errors.email}</p>}
                {errors.password && (
                  <p className="auth-error">{errors.password}</p>
                )}
              </div>
            )}

            <button
              type="submit"
              className="auth-btn auth-btn--primary"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="auth-btn-loading">
                  <span className="auth-spinner" />
                  Logging in...
                </span>
              ) : (
                "Continue"
              )}
            </button>
          </form>

          {/* Demo Credentials Hint */}
          <div className="auth-demo-hint">
            <p className="auth-demo-hint-title">Demo accounts</p>
            <p className="auth-demo-hint-item">
              <strong>Seller:</strong> ahmad@example.com
            </p>
            <p className="auth-demo-hint-item">
              <strong>Buyer:</strong> fatima@example.com
            </p>
            <p className="auth-demo-hint-item">
              <strong>Dealer:</strong> bilal@example.com
            </p>
            <p className="auth-demo-hint-item">
              Password for all: <strong>password123</strong>
            </p>
          </div>

          {/* Forgot Password */}
          <Link to="/forgot-password" className="auth-forgot-link">
            Forgot password?
          </Link>

          {/* Divider */}
          <div className="auth-divider">
            <span className="auth-divider-line" />
            <span className="auth-divider-text">or</span>
            <span className="auth-divider-line" />
          </div>

          {/* Social Login Buttons */}
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

          {/* Sign-up link */}
          <p className="auth-switch">
            Don't have an account?{" "}
            <Link to="/signup" className="auth-switch-link">
              Sign up
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

export default Login;
