const express = require('express');
const {
  sendMessage,
  getMessages,
  updateMessage,
  deleteMessage,
  markMessageAsRead,
  getUnreadCount,
  markMultipleAsRead,
  hideMessage,
  setReaction,
  toggleStar,
  reportMessage,
  searchMessages,
} = require('../controllers/messageController');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();

// Message endpoints
router.post('/', verifyToken, sendMessage);
router.get('/:conversationId', verifyToken, getMessages);
// NOTE: static "/batch/read" MUST come before "/:id/read", otherwise
// "batch" is captured as :id and bulk marking silently 404s.
router.put('/batch/read', verifyToken, markMultipleAsRead);
router.put('/:id', verifyToken, updateMessage);
router.put('/:id/me', verifyToken, hideMessage);
router.put('/:id/reaction', verifyToken, setReaction);
router.put('/:id/star', verifyToken, toggleStar);
router.post('/:id/report', verifyToken, reportMessage);
router.delete('/:id', verifyToken, deleteMessage);
router.put('/:id/read', verifyToken, markMessageAsRead);
router.get('/:conversationId/unread', verifyToken, getUnreadCount);
router.get('/:conversationId/search', verifyToken, searchMessages);

module.exports = router;