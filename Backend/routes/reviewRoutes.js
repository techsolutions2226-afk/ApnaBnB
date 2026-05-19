const express = require('express');
const { createReview, getReviews, getReviewsByTargetId, getReviewsByAuthor, getReviewsForUserProperties, getAverageRating, getReviewCount, updateReview, deleteReview } = require('../controllers/reviewController');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();

// Review endpoints
router.post('/', verifyToken, createReview);
router.get('/', getReviews); // Get with query params: target, targetType
router.get('/user/:userId', getReviewsByAuthor); // Reviews authored by user — must come before /:targetId
router.get('/owner-of/:userId', getReviewsForUserProperties); // Reviews on properties listed by this user
router.get('/:targetId/average', getAverageRating); // Get average rating (query: targetType)
router.get('/:targetId/count', getReviewCount); // Get review count (query: targetType)
router.get('/:targetId', getReviewsByTargetId); // Get reviews by target ID (query: targetType)
router.put('/:id', verifyToken, updateReview);
router.delete('/:id', verifyToken, deleteReview);

module.exports = router;