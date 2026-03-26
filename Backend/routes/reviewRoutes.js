const express = require('express');
const { createReview, getReviews, deleteReview } = require('../controllers/reviewController');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();

// Review endpoints
router.post('/', verifyToken, createReview);
router.get('/', getReviews);
router.delete('/:id', verifyToken, deleteReview);

module.exports = router;