const express = require('express');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const {
  getOverview,
  changePassword,
  setLoginAlerts,
  startTwoFactorSetup,
  enableTwoFactor,
  disableTwoFactor,
  regenerateRecoveryCodes,
  deactivateAccount,
} = require('../controllers/securityController');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();

/* These routes all check a password, which means they are the obvious place
   to try guessing one. Tight budget, keyed per authenticated user so people
   behind a shared NAT don't exhaust each other.

   ipKeyGenerator normalises IPv6 to a /64 — using req.ip raw would let an
   IPv6 client sidestep the limit by rotating the address suffix. */
const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 10 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => req.user?.id || ipKeyGenerator(req, res),
  message: { message: 'Too many attempts. Please wait a few minutes and try again.' },
});

// Sending a 2FA setup code costs an email, so it gets its own budget.
const codeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 10 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => req.user?.id || ipKeyGenerator(req, res),
  message: { message: 'Too many codes requested. Please try again later.' },
});

// Auth first everywhere, so the limiters can key on req.user.id.
router.get('/overview', verifyToken, getOverview);

router.put('/password', verifyToken, sensitiveLimiter, changePassword);
router.put('/login-alerts', verifyToken, setLoginAlerts);

router.post('/2fa/setup', verifyToken, codeLimiter, startTwoFactorSetup);
router.post('/2fa/enable', verifyToken, sensitiveLimiter, enableTwoFactor);
router.post('/2fa/disable', verifyToken, sensitiveLimiter, disableTwoFactor);
router.post('/2fa/recovery-codes', verifyToken, sensitiveLimiter, regenerateRecoveryCodes);

router.post('/deactivate', verifyToken, sensitiveLimiter, deactivateAccount);

module.exports = router;
