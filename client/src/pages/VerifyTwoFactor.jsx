import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/common/Logo";
import "../styles/Auth.css";

const OTP_LENGTH = 6;

/* ─── VerifyTwoFactor ───
   The second step of login. Reached only from Login.jsx, which passes the
   challenge in router state — never the URL, so the token cannot leak through
   browser history, a bookmark, or a shared link.

   Landing here without a challenge (a refresh, a pasted URL) means there is
   nothing to complete, so we send the user back to /login rather than showing
   a form that could never succeed.

   Structure mirrors VerifyEmail.jsx so the two OTP screens look identical.
*/
export default function VerifyTwoFactor() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { verifyTwoFactor, getDashboardPath } = useAuth();

  const challengeToken = state?.challengeToken;
  const method = state?.method;
  const maskedEmail = state?.maskedEmail;

  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(""));
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputsRef = useRef([]);

  useEffect(() => {
    if (!challengeToken) navigate("/login", { replace: true });
  }, [challengeToken, navigate]);

  useEffect(() => {
    if (!recoveryMode) inputsRef.current[0]?.focus();
  }, [recoveryMode]);

  if (!challengeToken) return null;

  const submit = async (code) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const result = await verifyTwoFactor(challengeToken, code);
      if (result.usedRecoveryCode) {
        toast.info(
          `Recovery code used — ${result.recoveryCodesRemaining} left. Generate new ones from Login & security.`,
        );
      }
      toast.success("Signed in");
      const role = result.user?.role;
      navigate(role === "admin" ? "/admin" : getDashboardPath(), { replace: true });
    } catch (err) {
      // An expired or exhausted challenge cannot be retried from this screen,
      // so send them back to the password step rather than leaving them stuck.
      if (err?.code === "CHALLENGE_EXPIRED" || err?.code === "TOO_MANY_ATTEMPTS") {
        toast.error(err.message || "Please sign in again.");
        navigate("/login", { replace: true });
        return;
      }
      toast.error(err?.message || "That code is not correct.");
      setDigits(Array(OTP_LENGTH).fill(""));
      inputsRef.current[0]?.focus();
    } finally {
      setIsSubmitting(false);
    }
  };

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
    chars.forEach((c, i) => {
      next[i] = c;
    });
    setDigits(next);
    inputsRef.current[Math.min(chars.length, OTP_LENGTH - 1)]?.focus();
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (recoveryMode) {
      const code = recoveryCode.trim();
      if (!code) {
        toast.error("Enter one of your recovery codes");
        return;
      }
      submit(code);
      return;
    }
    const code = digits.join("");
    if (code.length !== OTP_LENGTH) {
      toast.error("Please enter the full 6-digit code");
      return;
    }
    submit(code);
  };

  const toggleRecovery = () => {
    setRecoveryMode((v) => !v);
    setRecoveryCode("");
    setDigits(Array(OTP_LENGTH).fill(""));
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
          <h1 className="auth-card-title">Two-step verification</h1>
        </div>

        <div className="auth-card-body">
          <p className="auth-welcome" style={{ marginBottom: 8 }}>
            {recoveryMode ? "Enter a recovery code" : "Enter the 6-digit code"}
          </p>
          <p
            style={{
              fontSize: 14,
              color: "#717171",
              margin: "0 0 24px",
              lineHeight: 1.5,
            }}
          >
            {recoveryMode ? (
              <>
                Use one of the codes you saved when you turned on two-factor
                authentication. Each code works once.
              </>
            ) : method === "totp" ? (
              <>
                Open your authenticator app and enter the code it shows for{" "}
                <strong style={{ color: "#222" }}>ApnaBnB</strong>.
              </>
            ) : (
              <>
                We sent it to{" "}
                <strong style={{ color: "#222" }}>{maskedEmail || "your email"}</strong>.
                The code expires in 5 minutes.
              </>
            )}
          </p>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {recoveryMode ? (
              <input
                type="text"
                className="auth-input"
                value={recoveryCode}
                onChange={(e) => setRecoveryCode(e.target.value)}
                placeholder="XXXXX-XXXXX"
                autoComplete="one-time-code"
                autoFocus
                disabled={isSubmitting}
                aria-label="Recovery code"
              />
            ) : (
              <div className="otp-row">
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      inputsRef.current[i] = el;
                    }}
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
                    disabled={isSubmitting}
                  />
                ))}
              </div>
            )}

            <button
              type="submit"
              className="auth-btn auth-btn--primary"
              disabled={
                isSubmitting ||
                (recoveryMode ? !recoveryCode.trim() : digits.some((d) => d === ""))
              }
              style={{ marginTop: 20 }}
            >
              {isSubmitting ? (
                <span className="auth-btn-loading">
                  <span className="auth-spinner" />
                  Verifying...
                </span>
              ) : (
                "Verify"
              )}
            </button>
          </form>

          <div className="otp-resend-row">
            <span>
              {recoveryMode ? "Got your app or email back?" : "Lost your device?"}
            </span>
            <button
              type="button"
              onClick={toggleRecovery}
              className="otp-resend-btn"
              disabled={isSubmitting}
            >
              {recoveryMode ? "Enter a 6-digit code" : "Use a recovery code"}
            </button>
          </div>

          <p className="auth-switch">
            Not you?{" "}
            <Link to="/login" className="auth-switch-link">
              Back to sign in
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
