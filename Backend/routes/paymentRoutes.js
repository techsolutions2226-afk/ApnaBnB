const express = require('express');
const {
  createPayment,
  createFreeSubscription,
  getPaymentStatus,
  getMyPayments,
  getAllPayments,
  updatePaymentStatus,
} = require('../controllers/paymentController');
const { paymentProofUpload } = require('../config/cloudinary');
const verifyToken = require('../middleware/authMiddleware');
const adminOnly = require('../middleware/adminMiddleware');

const router = express.Router();

// Submit a manual EasyPaisa payment (multipart: planId, billingCycle, proof).
router.post('/', verifyToken, paymentProofUpload.single('proof'), createPayment);

// One-click activation of an admin-created FREE plan (both prices = 0).
// No QR, no screenshot — records an approved Payment with method 'free'.
router.post('/free', verifyToken, createFreeSubscription);

// Subscription gate — does the caller need a plan, and is it active?
router.get('/status', verifyToken, getPaymentStatus);

// The caller's own payment history.
router.get('/mine', verifyToken, getMyPayments);

// Admin — list all payments and approve/reject them. Rejecting a user's
// latest payment locks their messaging on their next gate check.
router.get('/', verifyToken, adminOnly, getAllPayments);
router.patch('/:id/status', verifyToken, adminOnly, updatePaymentStatus);

module.exports = router;
