const express = require('express');
const { 
  getPlatformStats,
  getAllUsers,
  getUserById,
  manageUser,
  verifyUser,
  suspendUser,
  getAllProperties,
  approveProperty,
  rejectProperty,
  moderateProperty,
  getAllMessages,
  getActivityLogs
} = require('../controllers/adminController');
const verifyToken = require('../middleware/authMiddleware');
const adminOnly = require('../middleware/adminMiddleware');

const router = express.Router();

// Platform stats
router.get('/stats', verifyToken, adminOnly, getPlatformStats);

// User management routes
router.get('/users', verifyToken, adminOnly, getAllUsers);
router.get('/users/:id', verifyToken, adminOnly, getUserById);
router.put('/users/:id', verifyToken, adminOnly, manageUser);
router.put('/users/:id/verify', verifyToken, adminOnly, verifyUser);
router.put('/users/:id/suspend', verifyToken, adminOnly, suspendUser);

// Property management routes
router.get('/properties', verifyToken, adminOnly, getAllProperties);
router.put('/properties/:id', verifyToken, adminOnly, moderateProperty);
router.put('/properties/:id/approve', verifyToken, adminOnly, approveProperty);
router.put('/properties/:id/reject', verifyToken, adminOnly, rejectProperty);

// Messages
router.get('/messages', verifyToken, adminOnly, getAllMessages);

// Activity logs
router.get('/activity', verifyToken, adminOnly, getActivityLogs);

module.exports = router;