import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import authService from "../services/authService";
import Logo from "../components/common/Logo";

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
      } else if (err?.code === "SOCIAL_ONLY") {
        setError("This account signs in with Google. No password to reset.");
        toast.info("This account signs in with Google — use Continue with Google on the login page.");
      } else {
        toast.error(err?.message || "Failed to send reset email");
      }
    } finally {
      setIsSubmitting(false);
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
          <h1 className="text-base font-bold text-slate-900">Forgot password</h1>
        </div>

        <div className="p-6">
          {sent ? (
            <>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">
                Check your email
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed mb-6">
                If an account exists for <strong>{email}</strong>, we sent a
                password-reset link. The link expires in 15 minutes.
              </p>
              <Link
                to="/login"
                className="flex items-center justify-center h-11 w-full text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors"
              >
                Back to log in
              </Link>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">
                Reset your password
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed mb-5">
                Enter the email you used to sign up. We&apos;ll send you a
                secure link to choose a new password.
              </p>

              <form onSubmit={handleSubmit} noValidate>
                <div className="mb-4">
                  <div
                    className={`relative border rounded-lg transition-colors focus-within:ring-2 focus-within:ring-primary-500/20 ${
                      error
                        ? "border-danger-500 focus-within:border-danger-500"
                        : "border-slate-200 focus-within:border-primary-500"
                    }`}
                  >
                    <input
                      type="email"
                      id="forgot-email"
                      className="peer w-full h-10 px-3.5 pt-4 pb-1 text-sm bg-transparent text-slate-900 border-none outline-none focus:ring-0"
                      placeholder=" "
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (error) setError("");
                      }}
                      autoComplete="email"
                      disabled={isSubmitting}
                    />
                    <label
                      htmlFor="forgot-email"
                      className="absolute left-3.5 top-1 text-[11px] font-medium text-slate-500 transition-all peer-placeholder-shown:top-2.5 peer-placeholder-shown:text-sm peer-placeholder-shown:text-slate-400 peer-focus:top-1 peer-focus:text-[11px] peer-focus:text-primary-600 pointer-events-none"
                    >
                      Email
                    </label>
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-danger-600 mb-3">{error}</p>
                )}

                <button
                  type="submit"
                  className="flex items-center justify-center h-11 w-full text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending...
                    </span>
                  ) : (
                    "Send reset link"
                  )}
                </button>
              </form>

              <p className="mt-4 text-sm text-slate-500 text-center">
                Remembered it?{" "}
                <Link to="/login" className="text-primary-600 hover:underline font-medium">
                  Log in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>

      <footer className="mt-auto text-center py-6 px-6 text-xs text-slate-400">
        <p>Real Estate Marketplace &mdash; Your trusted property platform.</p>
      </footer>
    </div>
  );
}
