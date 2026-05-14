const express = require('express');
const { createConversation, getConversations, getConversationById, updateConversation, deleteConversation, updateMembers } = require('../controllers/conversationController');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();

// Conversation endpoints
router.post('/', verifyToken, createConversation);
router.get('/', verifyToken, getConversations);
router.get('/:id', verifyToken, getConversationById);
router.put('/:id', verifyToken, updateConversation);
router.delete('/:id', verifyToken, deleteConversation);
router.put('/:id/members', verifyToken, updateMembers);

module.exports = router;