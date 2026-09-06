const express = require('express');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const {
  registerUser,
  loginUser,
  verifyOtp,
  verifyTwoFactor,
  resendOtp,
  forgotPassword,
  verifyResetToken,
  resetPassword,
  googleAuth,
  googleComplete,
  getMe,
  logoutUser,
} = require('../controllers/authController');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();

/* Login is the one unauthenticated password oracle, so guessing is limited
   per (email, IP) rather than trusting the loose global 100/min IP cap. The
   email is part of the key so a distributed attacker cannot farm attempts at
   a single account from many IPs… but an IP that fails enough times at any
   email is also cut off. ipKeyGenerator normalises IPv6 to a /64. */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 10 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = String(req.body?.email || '').trim().toLowerCase().slice(0, 254);
    return `${email}::${ipKeyGenerator(req)}`;
  },
  message: {
    message: 'Too many login attempts. Please wait a few minutes and try again.',
  },
});

router.post('/register', registerUser);
router.post('/login', loginLimiter, loginUser);
router.post('/verify-otp', verifyOtp);
// Second step of login when 2FA is on. Public: the caller has no JWT yet —
// the challenge token issued by /login is what authorises this call.
router.post('/verify-2fa', verifyTwoFactor);
router.post('/resend-otp', resendOtp);
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-token', verifyResetToken);
router.post('/reset-password', resetPassword);

// Session validator — requires a token AND a live DB row (see middleware).
// Returns 401/403 when the account was deleted/suspended/unverified.
router.get('/me', verifyToken, getMe);

// Server-side logout. Bumps tokenVersion so the current JWT is revoked
// immediately — a stolen token becomes useless even if the client's copy
// (localStorage) survives. Idempotent and safe to re-call.
router.post('/logout', verifyToken, logoutUser);

// Google OAuth ("Continue with Google") — public, no JWT required.
router.post('/google', googleAuth);
router.post('/google/complete', googleComplete);

module.exports = router;