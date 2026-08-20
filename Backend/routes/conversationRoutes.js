const express = require('express');
const {
  createConversation,
  findOrCreateDirect,
  getConversations,
  getConversationById,
  updateConversationPrefs,
  markConversationRead,
  updateConversation,
  deleteConversation,
  clearConversation,
  updateMembers,
} = require('../controllers/conversationController');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();

// IMPORTANT: more-specific routes before parameterised ones.
router.post('/direct', verifyToken, findOrCreateDirect);

// Conversation endpoints
router.post('/', verifyToken, createConversation);
router.get('/', verifyToken, getConversations);
router.get('/:id', verifyToken, getConversationById);
router.put('/:id', verifyToken, updateConversation);
router.put('/:id/prefs', verifyToken, updateConversationPrefs);
router.put('/:id/read', verifyToken, markConversationRead);
router.put('/:id/clear', verifyToken, clearConversation);
router.delete('/:id', verifyToken, deleteConversation);
router.put('/:id/members', verifyToken, updateMembers);

module.exports = router;