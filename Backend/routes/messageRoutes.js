const express = require('express');
const { sendMessage, getMessages, updateMessage, deleteMessage, markMessageAsRead, getUnreadCount, markMultipleAsRead, hideMessage } = require('../controllers/messageController');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();

// Message endpoints
router.post('/', verifyToken, sendMessage);
router.get('/:conversationId', verifyToken, getMessages);
router.put('/:id', verifyToken, updateMessage);
router.put('/:id/me', verifyToken, hideMessage);
router.delete('/:id', verifyToken, deleteMessage);
// NOTE: static "/batch/read" MUST come before "/:id/read", otherwise
// "batch" is captured as :id and bulk marking silently 404s.
router.put('/batch/read', verifyToken, markMultipleAsRead);
router.put('/:id/read', verifyToken, markMessageAsRead);
router.get('/:conversationId/unread', verifyToken, getUnreadCount);

module.exports = router;