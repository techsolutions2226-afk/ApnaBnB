const express = require('express');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const { writeDescription } = require('../controllers/aiController');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();

/* Every call costs Gemini quota, so this endpoint gets a much tighter budget
   than the global 100/min limiter. Keyed per authenticated user rather than
   per IP, so people behind one office NAT don't exhaust each other's quota. */
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === 'production' ? 40 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  // ipKeyGenerator normalises IPv6 into a /64 subnet key; using req.ip
  // directly would let an IPv6 client sidestep the limit by rotating suffix.
  keyGenerator: (req, res) => req.user?.id || ipKeyGenerator(req, res),
  message: {
    message: 'You have generated a lot of descriptions recently. Please try again later.',
  },
});

// Auth first so the limiter can key on req.user.id.
router.post('/description', verifyToken, aiLimiter, writeDescription);

module.exports = router;
