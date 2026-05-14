import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import authService from "../services/authService";
import Logo from "../components/common/Logo";
import "../styles/Auth.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Email is required");
      toast.error("Please enter your email");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(trimmed)) {
      setError("Enter a valid email");
      toast.error("Enter a valid email");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await authService.forgotPassword(trimmed);
      toast.success(res?.message || "A password reset link has been sent to your email.");
      setSent(true);
    } catch (err) {
      if (err?.code === "EMAIL_NOT_FOUND") {
        setError("Email not found");
        toast.error("Email not found");
      } else {
        toast.error(err?.message || "Failed to send reset email");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <header className="auth-header">
        <Link to="/" className="auth-logo-link" aria-label="apnabnb home">
          <Logo size={56} />
        </Link>
      </header>

      <div className="auth-card">
        <div className="auth-card-header">
          <h1 className="auth-card-title">Forgot password</h1>
        </div>

        <div className="auth-card-body">
          {sent ? (
            <>
              <p className="auth-welcome">Check your email</p>
              <p
                style={{
                  fontSize: 14,
                  color: "#555",
                  lineHeight: 1.5,
                  margin: "0 0 24px",
                }}
              >
                If an account exists for <strong>{email}</strong>, we sent a
                password-reset link. The link expires in 15 minutes.
              </p>
              <Link
                to="/login"
                className="auth-btn auth-btn--primary"
                style={{ display: "block", textAlign: "center" }}
              >
                Back to log in
              </Link>
            </>
          ) : (
            <>
              <p className="auth-welcome">Reset your password</p>
              <p
                style={{
                  fontSize: 14,
                  color: "#555",
                  lineHeight: 1.5,
                  margin: "0 0 20px",
                }}
              >
                Enter the email you used to sign up. We&apos;ll send you a
                secure link to choose a new password.
              </p>

              <form className="auth-form" onSubmit={handleSubmit} noValidate>
                <div
                  className={`auth-input-group ${error ? "auth-input-group--error" : ""}`}
                >
                  <div className="auth-input-wrapper">
                    <input
                      type="email"
                      id="forgot-email"
                      className="auth-input"
                      placeholder=" "
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (error) setError("");
                      }}
                      autoComplete="email"
                      disabled={isSubmitting}
                    />
                    <label htmlFor="forgot-email" className="auth-label">
                      Email
                    </label>
                  </div>
                </div>

                {error && (
                  <div className="auth-errors">
                    <p className="auth-error">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  className="auth-btn auth-btn--primary"
                  disabled={isSubmitting}
                  style={{ marginTop: 16 }}
                >
                  {isSubmitting ? (
                    <span className="auth-btn-loading">
                      <span className="auth-spinner" />
                      Sending...
                    </span>
                  ) : (
                    "Send reset link"
                  )}
                </button>
              </form>

              <p className="auth-switch">
                Remembered it?{" "}
                <Link to="/login" className="auth-switch-link">
                  Log in
                </Link>
              </p>
            </>
          )}
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
