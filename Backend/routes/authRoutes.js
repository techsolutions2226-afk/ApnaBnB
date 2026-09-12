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
  listSessions,
  revokeOtherSessions,
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

/* The Google endpoints are the other unauthenticated entry point, and each
   call makes an outbound request to Google to verify the token — so without a
   cap they are both a brute-force surface and a way to burn our Google quota
   from outside. There is no trustworthy email to key on before the token is
   verified, so this keys on IP alone and sits well above what a real sign-in
   needs (one /google call, plus one /google/complete for a new account). */
const googleLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 30 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many Google sign-in attempts. Please wait a few minutes and try again.',
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

// Server-side logout. Revokes THIS device's Session row so the current JWT is
// rejected immediately — a stolen token becomes useless even if the client's
// copy (localStorage) survives — while the user's other devices stay signed
// in. Idempotent and safe to re-call.
router.post('/logout', verifyToken, logoutUser);

// Signed-in devices. The list is read-only; revoke-others ends every other
// session but deliberately keeps the caller's own, so the user is not signed
// out of the machine they are sitting at.
router.get('/sessions', verifyToken, listSessions);
router.post('/sessions/revoke-others', verifyToken, revokeOtherSessions);

// Google OAuth ("Continue with Google") — public, no JWT required.
// /google can answer with a 2FA challenge instead of a token when the account
// has a second factor on; the client finishes it at /verify-2fa like any login.
router.post('/google', googleLimiter, googleAuth);
router.post('/google/complete', googleLimiter, googleComplete);

module.exports = router;