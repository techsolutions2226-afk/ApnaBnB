const express = require('express');
const {
  registerUser,
  loginUser,
  verifyOtp,
  resendOtp,
  forgotPassword,
  verifyResetToken,
  resetPassword,
} = require('../controllers/authController');

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-token', verifyResetToken);
router.post('/reset-password', resetPassword);

module.exports = router;