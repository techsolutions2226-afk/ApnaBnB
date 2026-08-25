const express = require('express');
const {
  getNotifications,
  getUnreadCount,
  markAllRead,
  markManyRead,
  markRead,
  deleteNotification,
} = require('../controllers/notificationController');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();

// Literal paths must precede '/:id' so they are not shadowed by it.
router.get('/unread-count', verifyToken, getUnreadCount);
router.post('/read-all', verifyToken, markAllRead);
router.post('/read', verifyToken, markManyRead);

router.get('/', verifyToken, getNotifications);
router.patch('/:id/read', verifyToken, markRead);
router.delete('/:id', verifyToken, deleteNotification);

module.exports = router;
