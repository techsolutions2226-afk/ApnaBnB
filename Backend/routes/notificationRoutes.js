const express = require('express');
const {
  getNotifications,
  getUnreadCount,
  getUnreadByType,
  markAllRead,
  markTypeRead,
  markManyRead,
  markRead,
  deleteNotification,
} = require('../controllers/notificationController');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();

// Literal paths must precede '/:id' so they are not shadowed by it.
router.get('/unread-count', verifyToken, getUnreadCount);
router.get('/unread-by-type', verifyToken, getUnreadByType);
router.post('/read-all', verifyToken, markAllRead);
router.post('/read-by-type', verifyToken, markTypeRead);
router.post('/read', verifyToken, markManyRead);

router.get('/', verifyToken, getNotifications);
router.patch('/:id/read', verifyToken, markRead);
router.delete('/:id', verifyToken, deleteNotification);

module.exports = router;

