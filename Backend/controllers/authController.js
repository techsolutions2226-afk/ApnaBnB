const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../db/prisma');
const { sendOtpEmail, sendResetEmail } = require('../utils/mailer');
const { logActivity } = require('../utils/activityLogger');

const OTP_TTL_MS = 5 * 60 * 1000;      // 5 minutes
const OTP_RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const OTP_MAX_ATTEMPTS = 5;

const RESET_TTL_MS = 15 * 60 * 1000;            // 15 minutes
const RESET_RESEND_COOLDOWN_MS = 60 * 1000;     // 60 seconds

// SHA-256 is sufficient for a one-time high-entropy token; bcrypt would be
// overkill and slows down the validate-on-mount call from the reset page.
const hashResetToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

// Generate JWT
const generateToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '30d' });

// 6-digit numeric OTP as a zero-padded string.
const generateOtp = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');

const hashOtp = async (otp) => bcrypt.hash(otp, 10);
const compareOtp = async (otp, hash) => bcrypt.compare(otp, hash);

// Password hashing lives here now (Mongoose pre-save hook is gone).
const hashPassword = async (plain) => bcrypt.hash(plain, 10);

// Issue a fresh OTP for a user and email it. Updates the OTP columns in place.
const issueOtpFor = async (user) => {
  const otp = generateOtp();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      otpHash: await hashOtp(otp),
      otpExpiresAt: new Date(Date.now() + OTP_TTL_MS),
      otpAttempts: 0,
      otpLastSentAt: new Date(),
    },
  });
  await sendOtpEmail(user.email, otp, user.name);
  return otp;
};

// Register User — creates an unverified account and emails an OTP.
// Does NOT return a JWT; user must verify first.
const registerUser = async (req, res, next) => {
  const { name, email, password, role, phone } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: 'Please fill all fields.' });
  }

  // ── Authoritative server-side validation (mirrors the client rules). ──
  const normalizedName = String(name).trim();
  const normalizedEmail = String(email).trim().toLowerCase();

  // Name: 1–100 chars (full name), letters/marks from any script plus spaces,
  // apostrophes, periods and hyphens; no digits or stray symbols.
  if (
    normalizedName.length < 1 ||
    normalizedName.length > 100 ||
    /[0-9]/.test(normalizedName) ||
    !/^[\p{L}\p{M}][\p{L}\p{M}\s'’.-]*$/u.test(normalizedName)
  ) {
    return res.status(400).json({ message: 'Please enter a valid name.' });
  }

  // Email: reasonable structure + length cap.
  if (normalizedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizedEmail)) {
    return res.status(400).json({ message: 'Please enter a valid email.' });
  }

  // Password strength: ≥8 chars with lower, upper, digit and a non-space symbol.
  const pw = String(password);
  if (
    pw.length < 8 ||
    !/[a-z]/.test(pw) ||
    !/[A-Z]/.test(pw) ||
    !/[0-9]/.test(pw) ||
    !/[^A-Za-z0-9\s]/.test(pw)
  ) {
    return res.status(400).json({
      message:
        'Password must be at least 8 characters and include upper, lower, a number and a special character.',
    });
  }

  // Mobile number is required at signup. Accept +, spaces, dashes and parens in
  // the raw input but validate on the digits only (10–15 digits covers local
  // 03xxxxxxxxx and +92 international forms).
  const phoneDigits = String(phone || '').replace(/[^\d]/g, '');
  if (!phone || phoneDigits.length < 10 || phoneDigits.length > 15) {
    return res.status(400).json({ message: 'Please provide a valid mobile number.' });
  }

  try {
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) {
      // If the existing account is already verified, block. If unverified,
      // resend the OTP so a stale signup doesn't permanently lock the email.
      if (existing.verified) {
        return res.status(400).json({ code: 'EMAIL_IN_USE', message: 'Email already in use.' });
      }
      try {
        await issueOtpFor(existing);
      } catch (mailErr) {
        console.error('Failed to resend OTP on register:', mailErr.message);
        return res
          .status(500)
          .json({ message: 'Could not send verification email. Try again.' });
      }
      return res.status(200).json({
        message: 'Account exists but is unverified. We re-sent your OTP.',
        email: existing.email,
        requiresVerification: true,
      });
    }

    const user = await prisma.user.create({
      data: {
        name: normalizedName,
        email: normalizedEmail,
        password: await hashPassword(password),
        role,
        phone: String(phone).trim(),
        verified: false,
      },
    });

    logActivity({
      action: 'auth.register',
      entityType: 'user',
      entityId: user.id,
      meta: { name: normalizedName, email: user.email, role },
      req,
    });

    try {
      await issueOtpFor(user);
    } catch (mailErr) {
      // Roll back the user so they can retry registration.
      console.error('Failed to send OTP email:', mailErr.message);
      await prisma.user.delete({ where: { id: user.id } });
      return res.status(500).json({
        message:
          'Could not send verification email. Please check the email address and try again.',
      });
    }

    res.status(201).json({
      message: 'Verification code sent to your email.',
      email: user.email,
      requiresVerification: true,
    });
  } catch (error) {
    next(error);
  }
};

// Verify OTP — marks the account verified and returns a JWT.
const verifyOtp = async (req, res, next) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ message: 'Email and OTP are required.' });
  }
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user) {
      return res.status(404).json({ message: 'No account found for this email.' });
    }
    if (user.verified) {
      return res.status(200).json({
        message: 'Email already verified. Please log in.',
        alreadyVerified: true,
      });
    }
    if (!user.otpHash || !user.otpExpiresAt) {
      return res.status(400).json({ message: 'No active code. Request a new one.' });
    }
    if (user.otpExpiresAt.getTime() < Date.now()) {
      return res.status(400).json({ message: 'Code expired. Request a new one.' });
    }
    if (user.otpAttempts >= OTP_MAX_ATTEMPTS) {
      return res
        .status(429)
        .json({ message: 'Too many attempts. Request a new code.' });
    }

    const ok = await compareOtp(String(otp).trim(), user.otpHash);
    if (!ok) {
      await prisma.user.update({
        where: { id: user.id },
        data: { otpAttempts: { increment: 1 } },
      });
      return res.status(400).json({ message: 'Incorrect verification code.' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verified: true,
        otpHash: null,
        otpExpiresAt: null,
        otpAttempts: 0,
      },
    });

    res.status(200).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      viewRole: user.viewRole || null,
      avatar: user.avatar || '',
      phone: user.phone || '',
      location: user.location || '',
      emergencyContact: user.emergencyContact || '',
      verified: true,
      token: generateToken(user.id, user.role),
      message: 'Email verified successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// Resend OTP — rate-limited.
const resendOtp = async (req, res, next) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Email is required.' });
  }
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user) {
      return res.status(404).json({ message: 'No account found for this email.' });
    }
    if (user.verified) {
      return res.status(400).json({ message: 'Email already verified.' });
    }
    if (
      user.otpLastSentAt &&
      Date.now() - user.otpLastSentAt.getTime() < OTP_RESEND_COOLDOWN_MS
    ) {
      const wait = Math.ceil(
        (OTP_RESEND_COOLDOWN_MS - (Date.now() - user.otpLastSentAt.getTime())) / 1000
      );
      return res
        .status(429)
        .json({ message: `Please wait ${wait}s before requesting a new code.` });
    }
    try {
      await issueOtpFor(user);
    } catch (mailErr) {
      console.error('Failed to resend OTP:', mailErr.message);
      return res
        .status(500)
        .json({ message: 'Could not send verification email. Try again.' });
    }
    res.status(200).json({ message: 'New verification code sent.' });
  } catch (error) {
    next(error);
  }
};

// Login — distinguishes "email not found" from "wrong password" via codes.
const loginUser = async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Please provide email and password.' });
  }
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user) {
      return res
        .status(404)
        .json({ code: 'EMAIL_NOT_FOUND', message: 'Email not found.' });
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res
        .status(401)
        .json({ code: 'WRONG_PASSWORD', message: 'Wrong password.' });
    }
    if (!user.verified) {
      return res.status(403).json({
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email first.',
        email: user.email,
      });
    }
    if (user.suspended) {
      return res.status(403).json({
        code: 'ACCOUNT_SUSPENDED',
        message: 'This account has been suspended. Contact support.',
      });
    }
    res.status(200).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      viewRole: user.viewRole || null,
      avatar: user.avatar || '',
      phone: user.phone || '',
      location: user.location || '',
      emergencyContact: user.emergencyContact || '',
      token: generateToken(user.id, user.role),
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/auth/me — the session validator. Returns the FRESH user row from
// the DB so the client can tell, on mount, whether the account still exists
// and is usable. A deleted/suspended/unverified account yields 401/403 here,
// which the client treats as "session is dead" and redirects to /login.
const getMe = async (req, res, next) => {
  try {
    // verifyToken already confirmed the row exists and is usable; fetch the
    // full public profile so the client can refresh its cached user.
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        viewRole: true,
        verified: true,
        suspended: true,
        avatar: true,
        phone: true,
        location: true,
        emergencyContact: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        code: 'USER_NOT_FOUND',
        message: 'Account no longer exists. Please log in again.',
      });
    }
    if (user.suspended) {
      return res.status(403).json({
        code: 'ACCOUNT_SUSPENDED',
        message: 'This account has been suspended. Contact support.',
      });
    }
    if (!user.verified) {
      return res.status(403).json({
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email first.',
      });
    }

    res.status(200).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      viewRole: user.viewRole || null,
      avatar: user.avatar || '',
      phone: user.phone || '',
      location: user.location || '',
      emergencyContact: user.emergencyContact || '',
      verified: user.verified,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/forgot-password — emails a reset link if the account exists.
// surface it directly (per product requirement — trades enumeration safety
// for clearer UX).
const forgotPassword = async (req, res, next) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Email is required.' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user) {
      return res
        .status(404)
        .json({ code: 'EMAIL_NOT_FOUND', message: 'Email not found.' });
    }

    if (
      user.resetPasswordLastSentAt &&
      Date.now() - user.resetPasswordLastSentAt.getTime() <
        RESET_RESEND_COOLDOWN_MS
    ) {
      const wait = Math.ceil(
        (RESET_RESEND_COOLDOWN_MS -
          (Date.now() - user.resetPasswordLastSentAt.getTime())) /
          1000
      );
      return res.status(429).json({
        code: 'RESET_COOLDOWN',
        message: `Please wait ${wait}s before requesting another reset email.`,
      });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordTokenHash: hashResetToken(rawToken),
        resetPasswordExpiresAt: new Date(Date.now() + RESET_TTL_MS),
        resetPasswordLastSentAt: new Date(),
      },
    });

    const base = (process.env.FRONTEND_URL || 'http://localhost:5174').replace(
      /\/+$/,
      ''
    );
    const resetUrl = `${base}/reset-password?token=${rawToken}&email=${encodeURIComponent(
      user.email
    )}`;

    try {
      await sendResetEmail(user.email, resetUrl, user.name);
    } catch (mailErr) {
      console.error('Failed to send reset email:', mailErr.message);
      return res
        .status(500)
        .json({ message: 'Could not send reset email. Please try again.' });
    }

    res
      .status(200)
      .json({ message: 'A password reset link has been sent to your email.' });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/verify-reset-token — called by the reset page on mount.
// Returns 200 only when the (email, token) pair is valid and unexpired.
const verifyResetToken = async (req, res, next) => {
  const { email, token } = req.body;
  if (!email || !token) {
    return res.status(400).json({ message: 'Invalid reset link.' });
  }
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (
      !user ||
      !user.resetPasswordTokenHash ||
      !user.resetPasswordExpiresAt ||
      user.resetPasswordExpiresAt.getTime() < Date.now() ||
      user.resetPasswordTokenHash !== hashResetToken(token)
    ) {
      return res
        .status(400)
        .json({ message: 'This reset link is invalid or has expired.' });
    }
    res.status(200).json({ valid: true, email: user.email });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/reset-password — sets a new password if the link is valid.
const resetPassword = async (req, res, next) => {
  const { email, token, newPassword } = req.body;
  if (!email || !token || !newPassword) {
    return res
      .status(400)
      .json({ message: 'Email, token, and new password are required.' });
  }
  if (String(newPassword).length < 8) {
    return res
      .status(400)
      .json({ message: 'Password must be at least 8 characters.' });
  }
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (
      !user ||
      !user.resetPasswordTokenHash ||
      !user.resetPasswordExpiresAt ||
      user.resetPasswordExpiresAt.getTime() < Date.now() ||
      user.resetPasswordTokenHash !== hashResetToken(token)
    ) {
      return res
        .status(400)
        .json({ message: 'This reset link is invalid or has expired.' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: await hashPassword(newPassword),
        resetPasswordTokenHash: null,
        resetPasswordExpiresAt: null,
        // Don't clear last-sent; that's just for cooldown bookkeeping.
      },
    });

    res
      .status(200)
      .json({ message: 'Password reset successful. You can now log in.' });
  } catch (error) {
    next(error);
  }
};

// ─── Google OAuth ("Continue with Google") ────────────────────────────────
//
// Google Identity Services hands the browser a one-time ID token (JWT). We
// verify it against Google's tokeninfo endpoint (Node 18+ built-in fetch —
// same zero-dependency pattern as geocode.js), then find-or-create the user.
// No Client Secret needed for the ID-token flow.

const GOOGLE_TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo';

// Verify a Google ID token. Returns the verified payload or throws.
const verifyGoogleIdToken = async (idToken) => {
  if (!idToken) {
    const err = new Error('Google ID token is required.');
    err.status = 400;
    throw err;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    console.error('GOOGLE_CLIENT_ID is not set in .env — skipping Google auth.');
    const err = new Error('Google sign-in is not configured yet.');
    err.status = 500;
    throw err;
  }

  const res = await fetch(`${GOOGLE_TOKENINFO_URL}?id_token=${encodeURIComponent(idToken)}`);
  if (!res.ok) {
    const err = new Error('Google rejected the sign-in token.');
    err.status = 401;
    throw err;
  }

  const payload = await res.json();
  if (payload.aud !== clientId) {
    const err = new Error('ID token was not issued for this application.');
    err.status = 401;
    throw err;
  }
  if (!payload.email) {
    const err = new Error('Google account has no verified email.');
    err.status = 400;
    throw err;
  }
  return payload;
};

// Random unusable bcrypt hash for Google-created accounts. There is no
// password to log in with, and "forgot password" can never be used to reset
// one of these accounts (the random hash never matches an attacker's input).
const randomUnusablePassword = () => hashPassword(crypto.randomBytes(24).toString('hex'));

// Same user payload shape as loginUser/verifyOtp so the client treats both
// flows identically.
const googleUserPayload = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  viewRole: user.viewRole || null,
  avatar: user.avatar || '',
  phone: user.phone || '',
  location: user.location || '',
  emergencyContact: user.emergencyContact || '',
  verified: true,
  token: generateToken(user.id, user.role),
});

// POST /api/auth/google — exchange a Google ID token for a session.
//   • Existing email  → { ...user, token }
//   • New email       → { requiresRole: true, profile: { name, email, avatar } }
//                       (no account created yet — the client must pick a role
//                        and confirm via POST /api/auth/google/complete)
const googleAuth = async (req, res, next) => {
  const { idToken } = req.body;

  try {
    const payload = await verifyGoogleIdToken(idToken);
    const email = String(payload.email).toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      if (existing.suspended) {
        return res.status(403).json({
          code: 'ACCOUNT_SUSPENDED',
          message: 'This account has been suspended. Contact support.',
        });
      }
      return res.status(200).json(googleUserPayload(existing));
    }

    res.status(200).json({
      requiresRole: true,
      profile: {
        name: String(payload.name || payload.email.split('@')[0] || 'New Member'),
        email,
        avatar: String(payload.picture || ''),
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/google/complete — finish creating a brand-new Google account
// once the client has chosen their role (Buyer/Seller/Dealer).
const googleComplete = async (req, res, next) => {
  const { idToken, role, phone, location } = req.body;

  const VALID_ROLES = ['seller', 'buyer', 'dealer'];
  if (!role || !VALID_ROLES.includes(role)) {
    return res.status(400).json({ message: 'Please select a valid role.' });
  }

  // Google's ID token carries no phone number or address, so the client
  // collects them alongside the role. Validate here too — the client form is
  // a convenience, not a trust boundary.
  const cleanPhone = String(phone || '').trim();
  if (!cleanPhone) {
    return res.status(400).json({ message: 'Phone number is required.' });
  }
  if (!/^[+(\d][\d\s()-]{6,19}$/.test(cleanPhone)) {
    return res.status(400).json({ message: 'Please enter a valid phone number.' });
  }

  const cleanLocation = String(location || '').trim();
  if (!cleanLocation) {
    return res.status(400).json({ message: 'Business address is required.' });
  }
  if (cleanLocation.length > 200) {
    return res.status(400).json({ message: 'Address is too long (max 200 characters).' });
  }

  try {
    const payload = await verifyGoogleIdToken(idToken);
    const email = String(payload.email).toLowerCase();

    // Re-check: the account may have been created between the two calls.
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      if (existing.suspended) {
        return res.status(403).json({
          code: 'ACCOUNT_SUSPENDED',
          message: 'This account has been suspended. Contact support.',
        });
      }
      return res.status(200).json(googleUserPayload(existing));
    }

    const user = await prisma.user.create({
      data: {
        name: String(payload.name || email.split('@')[0] || 'New Member'),
        email,
        password: await randomUnusablePassword(),
        role,
        verified: true, // Google has already verified this email
        avatar: String(payload.picture || ''),
        phone: cleanPhone,
        location: cleanLocation,
      },
    });

    res.status(201).json(googleUserPayload(user));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  verifyOtp,
  resendOtp,
  forgotPassword,
  verifyResetToken,
  resetPassword,
  googleAuth,
  googleComplete,
};
