const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  getContactPage,
  updateContactPage,
  sendContactMessage,
} = require('../controllers/contactController');
const verifyToken = require('../middleware/authMiddleware');
const adminOnly = require('../middleware/adminMiddleware');

const router = express.Router();

/* The global limiter (100/min) is far too generous for an endpoint that sends
   mail, so the public form gets its own much tighter budget. */
const contactFormLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === 'production' ? 5 : 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many messages sent from this address. Please try again later.',
  },
});

// Public — the Contact Us page reads this.
router.get('/', getContactPage);

// Public — enquiry form. Emails the admin-configured address.
router.post('/message', contactFormLimiter, sendContactMessage);

// Admin — edit the page content.
router.put('/', verifyToken, adminOnly, updateContactPage);

module.exports = router;
