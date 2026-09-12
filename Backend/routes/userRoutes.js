const express = require('express');
const { getPublicUser, getUserProfile, updateMe, getUserStats } = require('../controllers/userController');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();

router.put('/me', verifyToken, updateMe); // must precede /:id to avoid route shadowing
router.get('/me/stats', verifyToken, getUserStats);
// Two-segment path, so it cannot be shadowed by '/:id' below.
// Public — full profile (including owner contact) is shown for everyone.
router.get('/:id/profile', getUserProfile);
// Signed-in only: member profiles are not visible to anonymous visitors.
router.get('/:id', verifyToken, getPublicUser);

module.exports = router;
