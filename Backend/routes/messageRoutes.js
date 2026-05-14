const express = require('express');
const { sendMessage, getMessages, updateMessage, deleteMessage, markMessageAsRead, getUnreadCount, markMultipleAsRead } = require('../controllers/messageController');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();

// Message endpoints
router.post('/', verifyToken, sendMessage);
router.get('/:conversationId', verifyToken, getMessages);
router.put('/:id', verifyToken, updateMessage);
router.delete('/:id', verifyToken, deleteMessage);
router.put('/:id/read', verifyToken, markMessageAsRead);
router.get('/:conversationId/unread', verifyToken, getUnreadCount);
router.put('/batch/read', verifyToken, markMultipleAsRead);

module.exports = router;