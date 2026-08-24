const express = require('express');
const { getPublicUser, getUserProfile, updateMe, getUserStats } = require('../controllers/userController');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();

router.put('/me', verifyToken, updateMe); // must precede /:id to avoid route shadowing
router.get('/me/stats', verifyToken, getUserStats);
// Two-segment path, so it cannot be shadowed by '/:id' below.
router.get('/:id/profile', verifyToken, getUserProfile);
router.get('/:id', getPublicUser);

module.exports = router;
