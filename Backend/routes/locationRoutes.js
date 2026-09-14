const express = require('express');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const { getDetectedLocation } = require('../controllers/locationController');

const router = express.Router();

/* A visitor needs this once per visit (the client caches it for a day), so a
   tight budget costs real users nothing and caps how much provider quota a
   single client can burn on uncached lookups. */
const detectLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 30 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  // ipKeyGenerator normalises IPv6 into a /64 subnet key.
  keyGenerator: (req, res) => ipKeyGenerator(req, res),
  message: { message: 'Too many location requests. Please try again later.' },
});

// Public — no auth. Response is per-visitor, so cacheHeaders' default
// `private, no-store` applies (this path is not in its public list).
router.get('/detect', detectLimiter, getDetectedLocation);

module.exports = router;
