const express = require('express');
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
} = require('../controllers/authController');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
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

// Google OAuth ("Continue with Google") — public, no JWT required.
router.post('/google', googleAuth);
router.post('/google/complete', googleComplete);

module.exports = router;