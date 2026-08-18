const express = require('express');
const { getPublicUser, updateMe, getUserStats } = require('../controllers/userController');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();

router.put('/me', verifyToken, updateMe); // must precede /:id to avoid route shadowing
router.get('/me/stats', verifyToken, getUserStats);
router.get('/:id', getPublicUser);

module.exports = router;
