import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import authService from "../services/authService";
import Logo from "../components/common/Logo";
import "../styles/Auth.css";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60; // seconds

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || "";
  const navigate = useNavigate();

  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(""));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputsRef = useRef([]);

  useEffect(() => {
    if (!email) navigate("/signup", { replace: true });
  }, [email, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  const handleChange = (idx, value) => {
    const v = value.replace(/\D/g, "").slice(0, 1);
    setDigits((prev) => {
      const next = [...prev];
      next[idx] = v;
      return next;
    });
    if (v && idx < OTP_LENGTH - 1) inputsRef.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === "Backspace" && !digits[idx] && idx > 0)
      inputsRef.current[idx - 1]?.focus();
    if (e.key === "ArrowLeft" && idx > 0) inputsRef.current[idx - 1]?.focus();
    if (e.key === "ArrowRight" && idx < OTP_LENGTH - 1)
      inputsRef.current[idx + 1]?.focus();
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!pasted) return;
    e.preventDefault();
    const chars = pasted.slice(0, OTP_LENGTH).split("");
    const next = Array(OTP_LENGTH).fill("");
    chars.forEach((c, i) => (next[i] = c));
    setDigits(next);
    inputsRef.current[Math.min(chars.length, OTP_LENGTH - 1)]?.focus();
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const code = digits.join("");
    if (code.length !== OTP_LENGTH) {
      toast.error("Please enter the full 6-digit code");
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await authService.verifyOtp(email, code);
      if (result.alreadyVerified) {
        toast.info("Email already verified. Please log in.");
        navigate("/login", { replace: true });
        return;
      }
      toast.success("Email verified! Please log in.");
      // Drop the token so the user is forced to log in explicitly,
      // matching the requested flow.
      localStorage.removeItem("auth_token");
      localStorage.removeItem("current_user");
      navigate("/login", { replace: true });
    } catch (err) {
      toast.error(err?.message || "Verification failed");
      setDigits(Array(OTP_LENGTH).fill(""));
      inputsRef.current[0]?.focus();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    try {
      await authService.resendOtp(email);
      toast.success("A new code has been sent.");
      setCooldown(RESEND_COOLDOWN);
      setDigits(Array(OTP_LENGTH).fill(""));
      inputsRef.current[0]?.focus();
    } catch (err) {
      toast.error(err?.message || "Failed to resend code");
      const match = /wait (\d+)s/i.exec(err?.message || "");
      if (match) setCooldown(Number(match[1]));
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
          <h1 className="auth-card-title">Verify your email</h1>
        </div>

        <div className="auth-card-body">
          <p className="auth-welcome" style={{ marginBottom: 8 }}>
            Enter the 6-digit code
          </p>
          <p
            style={{
              fontSize: 14,
              color: "#717171",
              margin: "0 0 24px",
              lineHeight: 1.5,
            }}
          >
            We sent it to <strong style={{ color: "#222" }}>{email}</strong>.
            The code expires in 5 minutes.
          </p>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="otp-row">
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => (inputsRef.current[i] = el)}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="one-time-code"
                  maxLength={1}
                  value={d}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  onPaste={i === 0 ? handlePaste : undefined}
                  className="otp-input"
                  aria-label={`Digit ${i + 1}`}
                />
              ))}
            </div>

            <button
              type="submit"
              className="auth-btn auth-btn--primary"
              disabled={isSubmitting || digits.some((d) => d === "")}
              style={{ marginTop: 20 }}
            >
              {isSubmitting ? (
                <span className="auth-btn-loading">
                  <span className="auth-spinner" />
                  Verifying...
                </span>
              ) : (
                "Verify email"
              )}
            </button>
          </form>

          <div className="otp-resend-row">
            <span>Didn&apos;t get the code?</span>
            <button
              type="button"
              onClick={handleResend}
              className="otp-resend-btn"
              disabled={cooldown > 0}
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
            </button>
          </div>

          <p className="auth-switch">
            Wrong email?{" "}
            <Link to="/signup" className="auth-switch-link">
              Sign up again
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
