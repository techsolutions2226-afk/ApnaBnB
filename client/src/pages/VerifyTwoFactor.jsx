import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/common/Logo";

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

  const otpInputCls =
    "w-11 h-12 text-center text-lg font-semibold text-slate-900 rounded-lg bg-white border border-slate-200 hover:border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-colors disabled:bg-slate-50";

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="w-full flex items-center justify-center py-5 px-6 bg-white border-b border-slate-200">
        <Link to="/" className="flex items-center" aria-label="apnabnb home">
          <Logo size={40} />
        </Link>
      </header>

      <div className="w-full max-w-md mx-auto my-8 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-center px-6 py-4 border-b border-slate-100">
          <h1 className="text-base font-bold text-slate-900">Two-step verification</h1>
        </div>

        <div className="p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">
            {recoveryMode ? "Enter a recovery code" : "Enter the 6-digit code"}
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed mb-6">
            {recoveryMode ? (
              <>
                Use one of the codes you saved when you turned on two-factor
                authentication. Each code works once.
              </>
            ) : method === "totp" ? (
              <>
                Open your authenticator app and enter the code it shows for{" "}
                <strong className="text-slate-900">ApnaBnB</strong>.
              </>
            ) : (
              <>
                We sent it to{" "}
                <strong className="text-slate-900">{maskedEmail || "your email"}</strong>.
                The code expires in 5 minutes.
              </>
            )}
          </p>

          <form onSubmit={handleSubmit} noValidate>
            {recoveryMode ? (
              <input
                type="text"
                className="w-full h-11 px-3.5 text-sm rounded-lg bg-white text-slate-900 border border-slate-200 hover:border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-colors disabled:bg-slate-50"
                value={recoveryCode}
                onChange={(e) => setRecoveryCode(e.target.value)}
                placeholder="XXXXX-XXXXX"
                autoComplete="one-time-code"
                autoFocus
                disabled={isSubmitting}
                aria-label="Recovery code"
              />
            ) : (
              <div className="flex gap-2 justify-between">
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
                    className={otpInputCls}
                    aria-label={`Digit ${i + 1}`}
                    disabled={isSubmitting}
                  />
                ))}
              </div>
            )}

            <button
              type="submit"
              className="flex items-center justify-center h-11 w-full text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-5"
              disabled={
                isSubmitting ||
                (recoveryMode ? !recoveryCode.trim() : digits.some((d) => d === ""))
              }
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verifying...
                </span>
              ) : (
                "Verify"
              )}
            </button>
          </form>

          <div className="flex items-center justify-center gap-1.5 mt-4 text-sm text-slate-500">
            <span>
              {recoveryMode ? "Got your app or email back?" : "Lost your device?"}
            </span>
            <button
              type="button"
              onClick={toggleRecovery}
              className="text-primary-600 hover:underline font-medium disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {recoveryMode ? "Enter a 6-digit code" : "Use a recovery code"}
            </button>
          </div>

          <p className="mt-4 text-sm text-slate-500 text-center">
            Not you?{" "}
            <Link to="/login" className="text-primary-600 hover:underline font-medium">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>

      <footer className="mt-auto text-center py-6 px-6 text-xs text-slate-400">
        <p>Real Estate Marketplace &mdash; Your trusted property platform.</p>
      </footer>
    </div>
  );
}
