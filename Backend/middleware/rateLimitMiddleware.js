const rateLimit = require('express-rate-limit');

// In dev a 100/15-min limit is way too tight — React StrictMode double-fires
// effects, every page mount fans out to several endpoints, etc. The strict
// limit is reserved for production.
const isProd = process.env.NODE_ENV === 'production';

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1-minute rolling window
  max: isProd ? 100 : 1000, // 100/min in prod, 1000/min in dev
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests from this IP, please try again in a minute.' },
});

module.exports = limiter;