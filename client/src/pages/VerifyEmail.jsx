import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import authService from "../services/authService";
import Logo from "../components/common/Logo";

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
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="w-full flex items-center justify-center py-5 px-6 bg-white border-b border-slate-200">
        <Link to="/" className="flex items-center" aria-label="apnabnb home">
          <Logo size={40} />
        </Link>
      </header>

      <div className="w-full max-w-md mx-auto my-8 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-center px-6 py-4 border-b border-slate-100">
          <h1 className="text-base font-bold text-slate-900">Verify your email</h1>
        </div>

        <div className="p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">Enter the 6-digit code</h2>
          <p className="text-sm text-slate-500 leading-relaxed mb-6">
            We sent it to <strong className="text-slate-900">{email}</strong>.
            The code expires in 5 minutes.
          </p>

          <form onSubmit={handleSubmit} noValidate>
            <div className="flex gap-2 justify-between">
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
                  className="w-11 h-12 text-center text-lg font-semibold text-slate-900 rounded-lg bg-white border border-slate-200 hover:border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-colors"
                  aria-label={`Digit ${i + 1}`}
                />
              ))}
            </div>

            <button
              type="submit"
              className="flex items-center justify-center h-11 w-full text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-5"
              disabled={isSubmitting || digits.some((d) => d === "")}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verifying...
                </span>
              ) : (
                "Verify email"
              )}
            </button>
          </form>

          <div className="flex items-center justify-center gap-1.5 mt-4 text-sm text-slate-500">
            <span>Didn&apos;t get the code?</span>
            <button
              type="button"
              onClick={handleResend}
              className="text-primary-600 hover:underline font-medium disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={cooldown > 0}
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
            </button>
          </div>

          <p className="mt-4 text-sm text-slate-500 text-center">
            Wrong email?{" "}
            <Link to="/signup" className="text-primary-600 hover:underline font-medium">
              Sign up again
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
