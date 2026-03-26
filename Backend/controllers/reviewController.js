const Review = require('../models/Review');

// Create a review
const createReview = async (req, res) => {
  const { target, targetType, rating, comment } = req.body;

  // Validate input
  if (!target || !targetType || !rating) {
    return res.status(400).json({ message: 'Target, targetType, and rating are required.' });
  }

  try {
    // Check for duplicate reviews
    const existingReview = await Review.findOne({
      reviewer: req.user.id,
      target,
      targetType,
    });

    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this target.' });
    }

    const review = await Review.create({
      reviewer: req.user.id,
      target,
      targetType,
      rating,
      comment,
    });

    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get reviews for a target
const getReviews = async (req, res) => {
  const { target, targetType } = req.query;

  // Validate input
  if (!target || !targetType) {
    return res.status(400).json({ message: 'Target and targetType are required.' });
  }

  try {
    const reviews = await Review.find({ target, targetType }).populate('reviewer', 'name email');

    // Calculate average rating
    const averageRating = reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length || 0;

    res.status(200).json({
      reviews,
      averageRating: parseFloat(averageRating.toFixed(2)),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a review
const deleteReview = async (req, res) => {
  const { id } = req.params;

  try {
    const review = await Review.findOneAndDelete({ _id: id, reviewer: req.user.id });

    if (!review) {
      return res.status(404).json({ message: 'Review not found or unauthorized.' });
    }

    res.status(200).json({ message: 'Review deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createReview, getReviews, deleteReview };