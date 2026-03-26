const express = require('express');
const { getPlatformStats, manageUser, moderateProperty } = require('../controllers/adminController');
const verifyToken = require('../middleware/authMiddleware');
const adminOnly = require('../middleware/adminMiddleware');

const router = express.Router();

// Admin endpoints
router.get('/stats', verifyToken, adminOnly, getPlatformStats);
router.put('/users/:id', verifyToken, adminOnly, manageUser);
router.put('/properties/:id', verifyToken, adminOnly, moderateProperty);

module.exports = router;