const express = require('express');
const { sendMessage, getMessages } = require('../controllers/messageController');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();

// Message endpoints
router.post('/', verifyToken, sendMessage);
router.get('/:conversationId', verifyToken, getMessages);

module.exports = router;