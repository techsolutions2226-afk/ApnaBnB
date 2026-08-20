const express = require('express');
const { blockUser, unblockUser, listBlocked } = require('../controllers/blockController');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', verifyToken, listBlocked);
router.post('/:userId', verifyToken, blockUser);
router.delete('/:userId', verifyToken, unblockUser);

module.exports = router;
