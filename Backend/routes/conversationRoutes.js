const express = require('express');
const { createConversation, getConversations } = require('../controllers/conversationController');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();

// Conversation endpoints
router.post('/', verifyToken, createConversation);
router.get('/', verifyToken, getConversations);

module.exports = router;