const express = require('express');
const {
  getPlatformStats,
  getAllUsers,
  createUser,
  getUserById,
  updateUser,
  deleteUser,
  manageUser,
  verifyUser,
  suspendUser,
  reactivateUser,
  unsuspendUser,
  getAllProperties,
  updateProperty,
  deleteProperty,
  approveProperty,
  rejectProperty,
  getAllListings,
  updateListing,
  deleteListing,
  getAllRequirements,
  updateRequirement,
  deleteRequirement,
  getAllMatches,
  deleteMatch,
  getAllTrips,
  getSectionActivityCounts,
  getActivityLogs,
  getUserActivity,
} = require('../controllers/adminController');
const { getHealth } = require('../controllers/healthController');
const verifyToken = require('../middleware/authMiddleware');
const adminOnly = require('../middleware/adminMiddleware');

const router = express.Router();

// Platform stats
router.get('/stats', verifyToken, adminOnly, getPlatformStats);

// System Maintenance & Platform Health
router.get('/health', verifyToken, adminOnly, getHealth);

// User management
router.get('/users', verifyToken, adminOnly, getAllUsers);
router.post('/users', verifyToken, adminOnly, createUser);
router.get('/users/:id', verifyToken, adminOnly, getUserById);
router.put('/users/:id', verifyToken, adminOnly, updateUser);
router.delete('/users/:id', verifyToken, adminOnly, deleteUser);
router.put('/users/:id/manage', verifyToken, adminOnly, manageUser);
router.put('/users/:id/verify', verifyToken, adminOnly, verifyUser);
router.put('/users/:id/suspend', verifyToken, adminOnly, suspendUser);
// Lifts a SELF-deactivation only; admin suspension is handled separately.
router.put('/users/:id/reactivate', verifyToken, adminOnly, reactivateUser);
// Lifts an ADMIN suspension only; self-deactivation is handled above.
router.put('/users/:id/unsuspend', verifyToken, adminOnly, unsuspendUser);

// Property management
router.get('/properties', verifyToken, adminOnly, getAllProperties);
router.put('/properties/:id', verifyToken, adminOnly, updateProperty);
router.delete('/properties/:id', verifyToken, adminOnly, deleteProperty);
router.put('/properties/:id/approve', verifyToken, adminOnly, approveProperty);
router.put('/properties/:id/reject', verifyToken, adminOnly, rejectProperty);

// Listing management
router.get('/listings', verifyToken, adminOnly, getAllListings);
router.put('/listings/:id', verifyToken, adminOnly, updateListing);
router.delete('/listings/:id', verifyToken, adminOnly, deleteListing);

// Requirement management
router.get('/requirements', verifyToken, adminOnly, getAllRequirements);
router.put('/requirements/:id', verifyToken, adminOnly, updateRequirement);
router.delete('/requirements/:id', verifyToken, adminOnly, deleteRequirement);

// Matches (platform-wide, view + delete only)
router.get('/matches', verifyToken, adminOnly, getAllMatches);
router.delete('/matches/:id', verifyToken, adminOnly, deleteMatch);

// Visits (platform-wide, read-only oversight)
router.get('/trips', verifyToken, adminOnly, getAllTrips);

// Admin sidebar badges — unviewed counts per section since the client's last view
router.get('/unviewed', verifyToken, adminOnly, getSectionActivityCounts);

// Activity logs
router.get('/activity', verifyToken, adminOnly, getActivityLogs);
router.get('/activity/user/:userId', verifyToken, adminOnly, getUserActivity);

module.exports = router;