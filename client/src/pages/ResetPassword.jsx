import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { FiEye, FiEyeOff } from "react-icons/fi";
import authService from "../services/authService";
import Logo from "../components/common/Logo";

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
      <div className="min-h-screen flex flex-col bg-slate-50">
        <header className="w-full flex items-center justify-center py-5 px-6 bg-white border-b border-slate-200">
          <Link to="/" className="flex items-center" aria-label="apnabnb home">
            <Logo size={40} />
          </Link>
        </header>
        <div className="w-full max-w-md mx-auto my-8 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-6 text-center">
            <p className="text-sm text-slate-500">
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
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="w-full flex items-center justify-center py-5 px-6 bg-white border-b border-slate-200">
        <Link to="/" className="flex items-center" aria-label="apnabnb home">
          <Logo size={40} />
        </Link>
      </header>

      <div className="w-full max-w-md mx-auto my-8 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-center px-6 py-4 border-b border-slate-100">
          <h1 className="text-base font-bold text-slate-900">Choose a new password</h1>
        </div>

        <div className="p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">Almost done</h2>
          <p className="text-sm text-slate-500 leading-relaxed mb-5">
            Resetting password for <strong className="text-slate-900">{email}</strong>
          </p>

          <form onSubmit={handleSubmit} noValidate>
            {/* New password */}
            <div className="mb-3">
              <div className="relative border border-slate-200 rounded-lg transition-colors focus-within:ring-2 focus-within:ring-primary-500/20 focus-within:border-primary-500">
                <input
                  type={showPw ? "text" : "password"}
                  id="new-password"
                  className="peer w-full h-10 px-3.5 pt-4 pb-1 pr-10 text-sm bg-transparent text-slate-900 border-none outline-none focus:ring-0"
                  placeholder=" "
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={isSubmitting}
                />
                <label
                  htmlFor="new-password"
                  className="absolute left-3.5 top-1 text-[11px] font-medium text-slate-500 transition-all peer-placeholder-shown:top-2.5 peer-placeholder-shown:text-sm peer-placeholder-shown:text-slate-400 peer-focus:top-1 peer-focus:text-[11px] peer-focus:text-primary-600 pointer-events-none"
                >
                  New password
                </label>
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirm new password */}
            <div className="mb-2">
              <div className="relative border border-slate-200 rounded-lg transition-colors focus-within:ring-2 focus-within:ring-primary-500/20 focus-within:border-primary-500">
                <input
                  type={showPw ? "text" : "password"}
                  id="confirm-password"
                  className="peer w-full h-10 px-3.5 pt-4 pb-1 pr-10 text-sm bg-transparent text-slate-900 border-none outline-none focus:ring-0"
                  placeholder=" "
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  disabled={isSubmitting}
                />
                <label
                  htmlFor="confirm-password"
                  className="absolute left-3.5 top-1 text-[11px] font-medium text-slate-500 transition-all peer-placeholder-shown:top-2.5 peer-placeholder-shown:text-sm peer-placeholder-shown:text-slate-400 peer-focus:top-1 peer-focus:text-[11px] peer-focus:text-primary-600 pointer-events-none"
                >
                  Confirm new password
                </label>
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-400 mt-2">
              Must be at least 8 characters.
            </p>

            <button
              type="submit"
              className="flex items-center justify-center h-11 w-full text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-4"
              disabled={isSubmitting || !password || !confirm}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </span>
              ) : (
                "Reset password"
              )}
            </button>
          </form>

          <p className="mt-4 text-sm text-slate-500 text-center">
            <Link to="/login" className="text-primary-600 hover:underline font-medium">
              Back to log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
