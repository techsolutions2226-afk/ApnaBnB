import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FiEye, FiEyeOff, FiMail, FiLock, FiArrowRight } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/common/Logo";
import GoogleAuthButton from "../components/common/GoogleAuthButton";

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
      const result = await login(email, password);

      // 2FA is on: the password was accepted but there is no session yet.
      // Carry the challenge to the code screen in router state rather than
      // the URL, so it never lands in history or a shared link.
      if (result?.twoFactorRequired) {
        navigate("/login/verify", {
          replace: true,
          state: {
            challengeToken: result.challengeToken,
            method: result.method,
            maskedEmail: result.maskedEmail,
          },
        });
        return;
      }

      const user = result;
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
      } else if (code === "ACCOUNT_DEACTIVATED") {
        toast.error("This account is deactivated. Contact support to reactivate it.");
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
    <div className="min-h-screen md:min-h-screen flex flex-col md:flex-row bg-white">
      {/* ── Left Panel: brand / imagery ── */}
      <div
        className="relative flex flex-col justify-between text-white
          pt-6 pb-10 px-6 sm:px-10 md:px-12
          min-h-[300px] md:min-h-screen md:flex-1 md:basis-[46%]
          bg-cover bg-center
          md:justify-between"
        style={{
          backgroundImage:
            "linear-gradient(to top, rgba(0,0,0,0.55), rgba(0,0,0,0.15) 55%, rgba(0,0,0,0.35)), url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=80')",
        }}
      >
        <Link to="/" className="inline-flex items-center w-fit" aria-label="apnabnb home">
          <span className="inline-flex filter brightness-0 invert opacity-95">
            <Logo size={40} />
          </span>
        </Link>

        <div className="max-w-md mt-auto md:mt-0 md:mt-auto">
          <h1 className="text-3xl font-bold leading-tight mb-4">
            Welcome back to Pakistan&apos;s most intelligent property network.
          </h1>
          <p className="text-sm sm:text-[15px] leading-relaxed text-white/85">
            Access premium listings, connect with verified agents, and manage
            your property portfolio with AI-driven insights.
          </p>
        </div>
      </div>

      {/* ── Right Panel: sign-in form ── */}
      <div className="flex-1 md:basis-[54%] flex items-center justify-center bg-white px-6 py-10 md:px-6">
        <div className="w-full max-w-[400px]">
          <h1 className="text-[28px] font-bold text-slate-900 mb-6">Sign In</h1>

          <form onSubmit={handleSubmit} noValidate>
            {/* Email */}
            <div className="mb-4">
              <label htmlFor="login-email" className="block text-sm font-medium text-slate-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="email"
                  id="login-email"
                  className="w-full h-11 pl-10 pr-3.5 text-sm rounded-lg bg-white text-slate-900 border border-slate-200 hover:border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-colors disabled:bg-slate-50 disabled:text-slate-400"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="login-password" className="text-sm font-medium text-slate-700">
                  Password
                </label>
                <Link to="/forgot-password" className="text-sm text-primary-600 hover:underline">
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  id="login-password"
                  className="w-full h-11 pl-10 pr-10 text-sm rounded-lg bg-white text-slate-900 border border-slate-200 hover:border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-colors disabled:bg-slate-50 disabled:text-slate-400"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="flex items-center justify-center gap-2 h-11 w-full text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
          <div className="flex items-center gap-3 my-6">
            <span className="flex-1 border-t border-slate-200" />
            <span className="text-xs text-slate-400">Or continue with</span>
            <span className="flex-1 border-t border-slate-200" />
          </div>

          {/* Social Login Buttons */}
          <GoogleAuthButton className="w-full" />

          {/* Sign-up link */}
          <p className="mt-6 text-sm text-slate-500 text-center">
            Don&apos;t have an account?{" "}
            <Link to="/signup" className="text-primary-600 hover:underline font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
