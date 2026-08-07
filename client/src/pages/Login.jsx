import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FiEye, FiEyeOff, FiMail, FiLock, FiArrowRight } from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";
import { FaApple } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/common/Logo";
import "../styles/Auth.css";

const Login = () => {
  const { login, isLoading, isAuthenticated, getDashboardPath } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  /* Redirect authenticated users to their dashboard */
  useEffect(() => {
    if (isAuthenticated) {
      navigate(getDashboardPath(), { replace: true });
    }
  }, [isAuthenticated, getDashboardPath, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Client-side validation — all errors surfaced via toast, never inline.
    if (!email.trim()) {
      toast.error("Email is required");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      toast.error("Enter a valid email");
      return;
    }
    if (!password) {
      toast.error("Password is required");
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
      } else if (code === "WRONG_PASSWORD") {
        toast.error("Wrong password");
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
    <div className="login-page">
      {/* ── Left Panel: brand / imagery ── */}
      <div className="login-left">
        <Link to="/" className="login-logo-link" aria-label="apnabnb home">
          <span className="login-logo-wrap">
            <Logo size={40} />
          </span>
        </Link>

        <div className="login-left-content">
          <h1 className="login-left-title">
            Welcome back to Pakistan&apos;s most intelligent property
            network.
          </h1>
          <p className="login-left-text">
            Access premium listings, connect with verified agents, and
            manage your property portfolio with AI-driven insights.
          </p>
        </div>
      </div>

      {/* ── Right Panel: sign-in form ── */}
      <div className="login-right">
        <div className="login-right-inner">
          <h1 className="login-title">Sign In</h1>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            {/* Email */}
            <div className="login-field">
              <label htmlFor="login-email" className="login-field-label">
                Email Address
              </label>
              <div className="login-input-wrapper">
                <FiMail className="login-input-icon" />
                <input
                  type="email"
                  id="login-email"
                  className="login-input"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password */}
            <div className="login-field">
              <div className="login-field-row">
                <label htmlFor="login-password" className="login-field-label">
                  Password
                </label>
                <Link to="/forgot-password" className="login-forgot-link">
                  Forgot Password?
                </Link>
              </div>
              <div className="login-input-wrapper">
                <FiLock className="login-input-icon" />
                <input
                  type={showPassword ? "text" : "password"}
                  id="login-password"
                  className="login-input login-input--password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="login-toggle-pw"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="login-submit-btn"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="login-btn-loading">
                  <span className="login-spinner" />
                  Signing in...
                </span>
              ) : (
                <>
                  Sign In <FiArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="login-divider">
            <span className="login-divider-line" />
            <span className="login-divider-text">Or continue with</span>
            <span className="login-divider-line" />
          </div>

          {/* Social Login Buttons */}
          <div className="login-social-row">
            <button className="login-social-btn" disabled={isLoading}>
              <FcGoogle size={20} />
              <span>Google</span>
            </button>
            <button className="login-social-btn" disabled={isLoading}>
              <FaApple size={20} />
              <span>Apple</span>
            </button>
          </div>

          {/* Sign-up link */}
          <p className="login-switch">
            Don&apos;t have an account?{" "}
            <Link to="/signup" className="login-switch-link">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;