const express = require('express');
const { getPublicUser, updateMe } = require('../controllers/userController');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();

router.put('/me', verifyToken, updateMe); // must precede /:id to avoid route shadowing
router.get('/:id', getPublicUser);

module.exports = router;
