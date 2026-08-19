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
  getAllMessages,
  deleteMessage,
  getAllConversations,
  getConversationThread,
  deleteConversation,
  getActivityLogs,
  getUserActivity,
} = require('../controllers/adminController');
const verifyToken = require('../middleware/authMiddleware');
const adminOnly = require('../middleware/adminMiddleware');

const router = express.Router();

// Platform stats
router.get('/stats', verifyToken, adminOnly, getPlatformStats);

// User management
router.get('/users', verifyToken, adminOnly, getAllUsers);
router.post('/users', verifyToken, adminOnly, createUser);
router.get('/users/:id', verifyToken, adminOnly, getUserById);
router.put('/users/:id', verifyToken, adminOnly, updateUser);
router.delete('/users/:id', verifyToken, adminOnly, deleteUser);
router.put('/users/:id/manage', verifyToken, adminOnly, manageUser);
router.put('/users/:id/verify', verifyToken, adminOnly, verifyUser);
router.put('/users/:id/suspend', verifyToken, adminOnly, suspendUser);

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

// Messages
router.get('/messages', verifyToken, adminOnly, getAllMessages);
router.delete('/messages/:id', verifyToken, adminOnly, deleteMessage);

// Conversations (WhatsApp-style message review)
router.get('/conversations', verifyToken, adminOnly, getAllConversations);
router.get('/conversations/:id/messages', verifyToken, adminOnly, getConversationThread);
router.delete('/conversations/:id', verifyToken, adminOnly, deleteConversation);

// Activity logs
router.get('/activity', verifyToken, adminOnly, getActivityLogs);
router.get('/activity/user/:userId', verifyToken, adminOnly, getUserActivity);

module.exports = router;