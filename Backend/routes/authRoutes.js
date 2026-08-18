const express = require('express');
const {
  registerUser,
  loginUser,
  verifyOtp,
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