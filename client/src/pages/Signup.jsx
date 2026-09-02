import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  FiEye,
  FiEyeOff,
  FiHome,
  FiKey,
  FiUsers,
  FiCheck,
  FiCircle,
} from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/common/Logo";
import GoogleAuthButton from "../components/common/GoogleAuthButton";
import {
  validateSignupForm,
  passwordChecks,
  NAME_MAX,
  EMAIL_MAX,
  MIN_YEAR,
} from "../utils/signupValidation";

/* ── Role options for the selector ──
   SVG icons rather than emoji: emoji render differently per platform, carry
   no accessible name, and read as decoration in a control that is actually
   the form's most important choice. */
const ROLES = [
  {
    value: "buyer",
    label: "Buyer",
    Icon: FiHome,
    description: "I'm looking to buy or rent a property",
  },
  {
    value: "seller",
    label: "Seller",
    Icon: FiKey,
    description: "I own properties and want to list them",
  },
  {
    value: "dealer",
    label: "Dealer / Agent",
    Icon: FiUsers,
    description: "I'm a real estate broker connecting buyers and sellers",
  },
];

/* Legal documents linked from the terms notice. They open in a new tab. */
const LEGAL_LINKS = {
  terms: "Terms of Service",
  payments: "Payments Terms of Service",
  nondiscrimination: "Nondiscrimination Policy",
  privacy: "Privacy Policy",
};

/* Password requirement chips, in the order they are shown. */
const PW_RULES = [
  { key: "length", label: "At least 8 characters" },
  { key: "lowercase", label: "Lowercase letter" },
  { key: "uppercase", label: "Uppercase letter" },
  { key: "number", label: "Numeric digit" },
  { key: "special", label: "Special character" },
];

const todayStr = () => new Date().toISOString().split("T")[0];

/* ── Motion vocabulary — same easing family as the landing page. ── */
const EASE = [0.22, 1, 0.36, 1];

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

const Signup = () => {
  const { signup, isLoading, isAuthenticated, getDashboardPath } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    birthdate: "",
    role: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [touched, setTouched] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  // Errors that come from the server (e.g. duplicate email) — keyed by field.
  const [serverErrors, setServerErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  // Synchronous re-entry guard so a rapid double-click can't fire two requests
  // in the gap before React re-renders the disabled button.
  const submittingRef = useRef(false);

  const reduce = useReducedMotion();
  const anim = reduce
    ? { initial: false, animate: "show" }
    : { initial: "hidden", animate: "show" };

  /* Redirect authenticated users to their dashboard */
  useEffect(() => {
    if (isAuthenticated) {
      navigate(getDashboardPath(), { replace: true });
    }
  }, [isAuthenticated, getDashboardPath, navigate]);

  /* Live validation — recomputed on every keystroke so the submit button and
     inline messages always reflect the current input. */
  const { errors, isValid } = useMemo(
    () => validateSignupForm(form, agreed),
    [form, agreed],
  );

  const pwChecks = passwordChecks(form.password);
  const pwScore = PW_RULES.filter(({ key }) => pwChecks[key]).length;

  const update = (field) => (e) => {
    const { value } = e.target;
    setForm((prev) => ({ ...prev, [field]: value }));
    // A field the user edits should drop any stale server error for it.
    if (serverErrors[field]) {
      setServerErrors((prev) => {
        const { [field]: _drop, ...rest } = prev;
        return rest;
      });
    }
  };

  const markTouched = (field) => () =>
    setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));

  const selectRole = (role) => {
    setForm((prev) => ({ ...prev, role }));
    setTouched((prev) => ({ ...prev, role: true }));
  };

  // Show an error only once the field is touched or a submit has been tried.
  const shownError = (field) => {
    if (!(touched[field] || submitAttempted)) return null;
    return serverErrors[field] || errors[field] || null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitAttempted(true);

    if (!isValid) {
      toast.error("Please fix the highlighted fields");
      return;
    }
    // Double-submit guards: ref (synchronous) + state (render).
    if (submittingRef.current || isLoading || submitting) return;
    submittingRef.current = true;
    setSubmitting(true);

    try {
      const result = await signup({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        birthdate: form.birthdate,
        role: form.role,
      });
      const verifyEmail = result?.email || form.email.trim();
      toast.success("We sent a verification code to your email.");
      navigate(`/verify-email?email=${encodeURIComponent(verifyEmail)}`, {
        replace: true,
      });
    } catch (err) {
      const code = err?.code;
      const msg = err?.message || "";
      if (code === "EMAIL_IN_USE" || /already (exists|in use)/i.test(msg)) {
        setServerErrors((prev) => ({ ...prev, email: "Email already in use" }));
        toast.error("Email already in use");
      } else {
        toast.error(msg || "Signup failed. Please try again.");
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const busy = isLoading || submitting;
  const inputBase =
    "w-full h-10 px-3.5 text-sm rounded-lg bg-white text-slate-900 placeholder:text-slate-400 border transition-colors focus:outline-none focus:ring-2 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed";
  const inputOk =
    "border-slate-200 hover:border-slate-300 focus:border-primary-500 focus:ring-primary-500/20";
  const inputErr =
    "border-danger-500 focus:border-danger-500 focus:ring-danger-500/20";
  const wrapClass = (field) =>
    `${inputBase} ${shownError(field) ? inputErr : inputOk}`;

  /* Inline error with a height/opacity transition, so a message appearing
     never makes the rest of the form jump. */
  const FieldError = ({ field }) => (
    <AnimatePresence initial={false}>
      {shownError(field) && (
        <motion.p
          className="mt-1.5 text-xs text-danger-600"
          role="alert"
          initial={reduce ? false : { opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={reduce ? undefined : { opacity: 0, height: 0 }}
          transition={{ duration: 0.22, ease: EASE }}
        >
          {shownError(field)}
        </motion.p>
      )}
    </AnimatePresence>
  );

  return (
    <div className="h-screen h-[100dvh] overflow-hidden grid grid-rows-[auto_1fr] md:grid-rows-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] md:h-screen md:h-[100dvh] font-body text-slate-900 bg-white">
      {/* ── Left Panel: brand — fixed header on mobile, fixed sidebar on desktop ── */}
      <div className="relative overflow-hidden flex flex-col justify-between p-6 md:p-11 text-white bg-slate-900 md:h-screen md:h-[100dvh] md:sticky md:top-0 shrink-0">
        {/* Decorative aurora blooms */}
        <span
          aria-hidden="true"
          className="absolute rounded-full blur-3xl opacity-50 pointer-events-none"
          style={{
            width: 480,
            height: 480,
            left: "-120px",
            top: "-140px",
            background: "radial-gradient(circle, rgba(99,102,241,0.55), transparent 70%)",
          }}
        />
        <span
          aria-hidden="true"
          className="absolute rounded-full blur-3xl opacity-40 pointer-events-none"
          style={{
            width: 520,
            height: 520,
            right: "-160px",
            bottom: "-180px",
            background: "radial-gradient(circle, rgba(79,70,229,0.5), transparent 70%)",
          }}
        />

        <Link to="/" className="relative inline-flex w-fit" aria-label="apnabnb home">
          <Logo size={40} />
        </Link>

        <motion.div
          className="relative max-w-md md:mt-10 mt-3"
          variants={stagger}
          {...anim}
        >
          <motion.p variants={item} className="text-[11px] md:text-xs font-semibold tracking-[0.2em] uppercase text-primary-300 mb-1.5 md:mb-3">
            Create your account
          </motion.p>
          <motion.h1 variants={item} className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold leading-tight">
            Discover Your Next Space
          </motion.h1>
          <motion.p variants={item} className="hidden md:block text-sm sm:text-[15px] leading-relaxed text-white/80 mt-3">
            One account to search listings, post requirements and reach owners
            directly.
          </motion.p>
        </motion.div>

        <motion.ul
          className="relative hidden md:block mt-10"
          variants={stagger}
          {...anim}
          aria-label="Community size"
        >
          <motion.li variants={item} className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">10,000+</span>
            <span className="text-sm text-white/70">Verified members</span>
          </motion.li>
        </motion.ul>
      </div>

      {/* ── Right Panel: signup form — scrolls fully, centered when it fits ── */}
      <div className="min-h-0 flex items-start justify-center px-5 sm:px-8 pt-8 pb-14 md:py-10 md:h-full md:overflow-y-auto overflow-y-auto bg-white">
        <motion.div
          className="w-full max-w-[520px] md:my-auto"
          variants={stagger}
          {...anim}
        >
          <motion.h1 className="text-[28px] font-bold text-slate-900" variants={item}>
            Welcome to the marketplace
          </motion.h1>
          <motion.p className="mt-1 text-sm text-slate-500 mb-6" variants={item}>
            Join 10,000+ verified members.
          </motion.p>

          <form onSubmit={handleSubmit} noValidate>
            {/* ── Role Selector ── */}
            <motion.div variants={item}>
              <p className="text-sm font-medium text-slate-700 mb-2">I want to join as</p>
              <div className="grid grid-cols-3 gap-2">
                {ROLES.map((r) => {
                  const active = form.role === r.value;
                  return (
                    <motion.button
                      key={r.value}
                      type="button"
                      className={`relative flex flex-col items-start gap-1 p-3 text-left rounded-xl border transition-colors ${
                        shownError("role")
                          ? "border-danger-500"
                          : active
                            ? "border-primary-600 bg-primary-50"
                            : "border-slate-200 hover:border-slate-300"
                      }`}
                      onClick={() => selectRole(r.value)}
                      disabled={busy}
                      aria-pressed={active}
                      whileHover={reduce || busy ? undefined : { y: -3 }}
                      whileTap={reduce || busy ? undefined : { scale: 0.985 }}
                      transition={{ duration: 0.2, ease: EASE }}
                    >
                      <r.Icon
                        className={active ? "text-primary-600" : "text-slate-400"}
                        size={20}
                      />
                      <span
                        className={`text-sm font-semibold ${
                          active ? "text-primary-700" : "text-slate-800"
                        }`}
                      >
                        {r.label}
                      </span>
                      <span className="text-[11px] leading-tight text-slate-500">
                        {r.description}
                      </span>
                      <AnimatePresence>
                        {active && (
                          <motion.span
                            className="absolute top-2 right-2 flex items-center justify-center h-5 w-5 rounded-full bg-primary-600 text-white"
                            aria-hidden="true"
                            initial={reduce ? false : { scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={reduce ? undefined : { scale: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: EASE }}
                          >
                            <FiCheck className="h-3 w-3" />
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  );
                })}
              </div>
              <FieldError field="role" />
            </motion.div>

            {/* Name Fields */}
            <motion.div variants={item}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                <div className="flex flex-col gap-1">
                  <label htmlFor="signup-first" className="text-sm font-medium text-slate-700">
                    First name
                  </label>
                  <input
                    type="text"
                    id="signup-first"
                    className={wrapClass("firstName")}
                    placeholder="First name"
                    value={form.firstName}
                    onChange={update("firstName")}
                    onBlur={markTouched("firstName")}
                    autoComplete="given-name"
                    maxLength={NAME_MAX}
                    disabled={busy}
                  />
                  <FieldError field="firstName" />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="signup-last" className="text-sm font-medium text-slate-700">
                    Last name
                  </label>
                  <input
                    type="text"
                    id="signup-last"
                    className={wrapClass("lastName")}
                    placeholder="Last name"
                    value={form.lastName}
                    onChange={update("lastName")}
                    onBlur={markTouched("lastName")}
                    autoComplete="family-name"
                    maxLength={NAME_MAX}
                    disabled={busy}
                  />
                  <FieldError field="lastName" />
                </div>
              </div>
              <p className="mt-1.5 text-xs text-slate-400">
                Make sure it matches the name on your government ID.
              </p>
            </motion.div>

            {/* Birthdate */}
            <motion.div className="flex flex-col gap-1 mt-4" variants={item}>
              <label htmlFor="signup-dob" className="text-sm font-medium text-slate-700">
                Date of birth
              </label>
              <input
                type="date"
                id="signup-dob"
                className={wrapClass("birthdate")}
                value={form.birthdate}
                onChange={update("birthdate")}
                onBlur={markTouched("birthdate")}
                autoComplete="bday"
                min={`${MIN_YEAR}-01-01`}
                max={todayStr()}
                disabled={busy}
              />
              {shownError("birthdate") ? (
                <FieldError field="birthdate" />
              ) : (
                <p className="mt-1.5 text-xs text-slate-400">
                  You need to be at least 18. Your birthday won't be shared with
                  other people who use this platform.
                </p>
              )}
            </motion.div>

            {/* Email */}
            <motion.div className="flex flex-col gap-1 mt-4" variants={item}>
              <label htmlFor="signup-email" className="text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                type="email"
                id="signup-email"
                className={wrapClass("email")}
                placeholder="name@example.com"
                value={form.email}
                onChange={update("email")}
                onBlur={markTouched("email")}
                autoComplete="email"
                maxLength={EMAIL_MAX}
                disabled={busy}
              />
              {shownError("email") ? (
                <FieldError field="email" />
              ) : (
                <p className="mt-1.5 text-xs text-slate-400">
                  We'll email you property updates and confirmations.
                </p>
              )}
            </motion.div>

            {/* Mobile number */}
            <motion.div className="flex flex-col gap-1 mt-4" variants={item}>
              <label htmlFor="signup-phone" className="text-sm font-medium text-slate-700">
                Mobile number
              </label>
              <input
                type="tel"
                id="signup-phone"
                className={wrapClass("phone")}
                placeholder="03XX XXXXXXX"
                value={form.phone}
                onChange={update("phone")}
                onBlur={markTouched("phone")}
                autoComplete="tel"
                maxLength={20}
                disabled={busy}
              />
              {shownError("phone") ? (
                <FieldError field="phone" />
              ) : (
                <p className="mt-1.5 text-xs text-slate-400">
                  Buyers and sellers use this to reach you once a deal is
                  matched.
                </p>
              )}
            </motion.div>

            {/* Password */}
            <motion.div className="flex flex-col gap-1 mt-4" variants={item}>
              <label htmlFor="signup-password" className="text-sm font-medium text-slate-700">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="signup-password"
                  className={`${wrapClass("password")} pr-10`}
                  placeholder="Create a password"
                  value={form.password}
                  onChange={update("password")}
                  onBlur={markTouched("password")}
                  autoComplete="new-password"
                  disabled={busy}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>

              {/* Password strength meter */}
              <div
                className="flex gap-1 mt-2.5"
                role="img"
                aria-label={`Password strength: ${pwScore} of ${PW_RULES.length} requirements met`}
              >
                {PW_RULES.map((_, i) => {
                  const filled = i < pwScore;
                  return (
                    <span
                      key={i}
                      className={`relative h-1 flex-1 overflow-hidden rounded-full ${
                        filled
                          ? pwScore >= 3
                            ? "bg-primary-600"
                            : "bg-danger-500"
                          : "bg-slate-200"
                      }`}
                    >
                      <motion.span
                        className="absolute inset-0 origin-left bg-current"
                        initial={false}
                        animate={{ scaleX: filled ? 1 : 0 }}
                        transition={
                          reduce
                            ? { duration: 0 }
                            : { duration: 0.32, ease: EASE }
                        }
                      />
                    </span>
                  );
                })}
              </div>

              {/* Password requirement chips */}
              <div className="flex flex-wrap gap-2 mt-2.5">
                {PW_RULES.map(({ key, label }) => {
                  const ok = pwChecks[key];
                  return (
                    <motion.span
                      key={key}
                      className={`inline-flex items-center gap-1.5 h-7 px-2.5 text-xs rounded-full border transition-colors ${
                        ok
                          ? "bg-primary-50 text-primary-700 border-primary-300"
                          : "bg-slate-50 text-slate-500 border-slate-200"
                      }`}
                      animate={reduce ? undefined : { scale: ok ? [1, 1.06, 1] : 1 }}
                      transition={{ duration: 0.3, ease: EASE }}
                    >
                      {ok ? (
                        <FiCheck className="h-3 w-3" aria-hidden="true" />
                      ) : (
                        <FiCircle className="h-3 w-3" aria-hidden="true" />
                      )}
                      {label}
                    </motion.span>
                  );
                })}
              </div>
              <FieldError field="password" />
            </motion.div>

            {/* Terms & Policy */}
            <motion.p className="mt-5 text-xs text-slate-500 leading-relaxed" variants={item}>
              By selecting <strong>Agree and continue</strong>, I agree to the
              platform's{" "}
              {Object.entries(LEGAL_LINKS).map(([slug, label], i, arr) => (
                <span key={slug}>
                  <a
                    href={`/legal/${slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:underline"
                  >
                    {label}
                  </a>
                  {i < arr.length - 2
                    ? ", "
                    : i === arr.length - 2
                      ? ", and "
                      : "."}
                </span>
              ))}
            </motion.p>

            {/* Agree Checkbox */}
            <motion.div variants={item}>
              <label className="flex items-center gap-2.5 mt-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  checked={agreed}
                  onChange={(e) => {
                    setAgreed(e.target.checked);
                    setTouched((prev) => ({ ...prev, agreed: true }));
                  }}
                  disabled={busy}
                />
                <span className="text-sm text-slate-700">
                  I agree to the platform's terms and policies
                </span>
              </label>
              <FieldError field="agreed" />
            </motion.div>

            <motion.button
              type="submit"
              className="relative mt-5 flex items-center justify-center h-11 w-full overflow-hidden text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={busy || !isValid}
              variants={item}
              whileHover={reduce || busy || !isValid ? undefined : { y: -2 }}
              whileTap={reduce || busy || !isValid ? undefined : { scale: 0.99 }}
              transition={{ duration: 0.2, ease: EASE }}
            >
              {/* A sheen sweeps across the moment the form becomes valid. */}
              <AnimatePresence>
                {isValid && !busy && !reduce && (
                  <motion.span
                    className="absolute inset-y-0 w-1/3 bg-white/20 blur-sm"
                    aria-hidden="true"
                    initial={{ x: "-110%" }}
                    animate={{ x: "110%" }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.9, ease: EASE }}
                  />
                )}
              </AnimatePresence>
              {busy ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : (
                "Agree and continue"
              )}
            </motion.button>
          </form>

          {/* Divider */}
          <motion.div className="flex items-center gap-3 my-6" variants={item}>
            <span className="flex-1 border-t border-slate-200" />
            <span className="text-xs text-slate-400">or</span>
            <span className="flex-1 border-t border-slate-200" />
          </motion.div>

          {/* Social Signup Buttons */}
          <motion.div variants={item}>
            <GoogleAuthButton className="w-full" />
          </motion.div>

          {/* Login link */}
          <motion.p className="mt-6 text-sm text-slate-500 text-center" variants={item}>
            Already have an account?{" "}
            <Link to="/login" className="text-primary-600 hover:underline font-medium">
              Log in
            </Link>
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
};

export default Signup;
