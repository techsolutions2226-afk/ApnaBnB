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
} = require('../controllers/authController');

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-token', verifyResetToken);
router.post('/reset-password', resetPassword);

// Google OAuth ("Continue with Google") — public, no JWT required.
router.post('/google', googleAuth);
router.post('/google/complete', googleComplete);

module.exports = router;