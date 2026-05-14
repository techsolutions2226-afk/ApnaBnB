import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { FiEye, FiEyeOff } from "react-icons/fi";
import authService from "../services/authService";
import Logo from "../components/common/Logo";
import "../styles/Auth.css";

/* Reset password page — only reachable via a valid email link.
 *   /reset-password?token=XXX&email=YYY
 * On mount we hit the backend to confirm the (token, email) pair is valid.
 * If missing or invalid, the user is redirected to /forgot-password with a
 * toast message — that's how "direct URL access" is blocked. */
export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [status, setStatus] = useState("checking"); // checking | valid | invalid
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // 1) Missing or partial params → bail before we even ask the server.
    if (!token || !email) {
      toast.error("This page is only accessible via the password-reset email.");
      navigate("/forgot-password", { replace: true });
      return;
    }
    // 2) Ask the server if the token is still valid.
    let cancelled = false;
    authService
      .verifyResetToken(email, token)
      .then(() => {
        if (!cancelled) setStatus("valid");
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus("invalid");
        toast.error(err?.message || "This reset link is invalid or expired.");
        navigate("/forgot-password", { replace: true });
      });
    return () => {
      cancelled = true;
    };
  }, [token, email, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (status !== "valid") return;
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords don't match");
      return;
    }
    setIsSubmitting(true);
    try {
      await authService.resetPassword(email, token, password);
      toast.success("Password reset! Please log in with your new password.");
      navigate("/login", { replace: true });
    } catch (err) {
      toast.error(err?.message || "Failed to reset password");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Until the server confirms the token, render a lightweight placeholder.
  // We never show the reset form for an unvalidated link.
  if (status !== "valid") {
    return (
      <div className="auth-page">
        <header className="auth-header">
          <Link to="/" className="auth-logo-link" aria-label="apnabnb home">
            <Logo size={56} />
          </Link>
        </header>
        <div className="auth-card">
          <div className="auth-card-body" style={{ textAlign: "center" }}>
            <p style={{ color: "#555", margin: 0 }}>
              {status === "checking"
                ? "Validating your reset link..."
                : "Redirecting..."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <header className="auth-header">
        <Link to="/" className="auth-logo-link">
          <img src={logo} alt="Real estate marketplace" className="auth-logo" />
        </Link>
      </header>

      <div className="auth-card">
        <div className="auth-card-header">
          <h1 className="auth-card-title">Choose a new password</h1>
        </div>

        <div className="auth-card-body">
          <p className="auth-welcome" style={{ marginBottom: 8 }}>
            Almost done
          </p>
          <p
            style={{
              fontSize: 14,
              color: "#717171",
              margin: "0 0 20px",
              lineHeight: 1.5,
            }}
          >
            Resetting password for <strong style={{ color: "#222" }}>{email}</strong>
          </p>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="auth-input-group">
              <div className="auth-input-wrapper auth-input-wrapper--top">
                <input
                  type={showPw ? "text" : "password"}
                  id="new-password"
                  className="auth-input"
                  placeholder=" "
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={isSubmitting}
                />
                <label htmlFor="new-password" className="auth-label">
                  New password
                </label>
                <button
                  type="button"
                  className="auth-toggle-pw"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
              <div className="auth-input-wrapper auth-input-wrapper--bottom">
                <input
                  type={showPw ? "text" : "password"}
                  id="confirm-password"
                  className="auth-input"
                  placeholder=" "
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  disabled={isSubmitting}
                />
                <label htmlFor="confirm-password" className="auth-label">
                  Confirm new password
                </label>
              </div>
            </div>

            <p style={{ fontSize: 12, color: "#717171", margin: "10px 0 0" }}>
              Must be at least 8 characters.
            </p>

            <button
              type="submit"
              className="auth-btn auth-btn--primary"
              disabled={isSubmitting || !password || !confirm}
              style={{ marginTop: 16 }}
            >
              {isSubmitting ? (
                <span className="auth-btn-loading">
                  <span className="auth-spinner" />
                  Saving...
                </span>
              ) : (
                "Reset password"
              )}
            </button>
          </form>

          <p className="auth-switch">
            <Link to="/login" className="auth-switch-link">
              Back to log in
            </Link>
          </p>
        </div>
      </div>

      <footer className="auth-footer">
        <p className="auth-footer-text">
          Real Estate Marketplace &mdash; Your trusted property platform.
        </p>
      </footer>
    </div>
  );
}
