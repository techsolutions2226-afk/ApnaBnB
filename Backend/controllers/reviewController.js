const Review = require('../models/Review');
const Property = require('../models/Property');

// Create a review
const createReview = async (req, res) => {
  const { target, targetType, rating, comment } = req.body;

  // Validate input
  if (!target || !targetType || !rating) {
    return res.status(400).json({ message: 'Target, targetType, and rating are required.' });
  }

  if (rating < 1 || rating > 5) {
    return res.status(400).json({ message: 'Rating must be between 1 and 5.' });
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

// Get reviews for a target (with query params)
const getReviews = async (req, res) => {
  const { target, targetType } = req.query;

  // Validate input
  if (!target || !targetType) {
    return res.status(400).json({ message: 'Target and targetType are required as query parameters.' });
  }

  try {
    const reviews = await Review.find({ target, targetType }).populate('reviewer', 'name email avatar role');

    // Calculate average rating
    const averageRating = reviews.length > 0 ? (reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length) : 0;

    res.status(200).json({
      reviews,
      averageRating: parseFloat(averageRating.toFixed(2)),
      count: reviews.length,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get reviews for a target by ID (URL parameter version)
const getReviewsByTargetId = async (req, res) => {
  const { targetId } = req.params;
  const { targetType } = req.query;

  if (!targetType) {
    return res.status(400).json({ message: 'targetType query parameter is required.' });
  }

  try {
    const reviews = await Review.find({ target: targetId, targetType }).populate('reviewer', 'name email avatar role');

    const averageRating = reviews.length > 0 ? (reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length) : 0;

    res.status(200).json({
      reviews,
      averageRating: parseFloat(averageRating.toFixed(2)),
      count: reviews.length,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get average rating for a target
const getAverageRating = async (req, res) => {
  const { targetId } = req.params;
  const { targetType } = req.query;

  if (!targetType) {
    return res.status(400).json({ message: 'targetType query parameter is required.' });
  }

  try {
    const reviews = await Review.find({ target: targetId, targetType });

    const averageRating = reviews.length > 0 ? (reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length) : 0;

    res.status(200).json({
      targetId,
      targetType,
      averageRating: parseFloat(averageRating.toFixed(2)),
      totalReviews: reviews.length,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get review count for a target
const getReviewCount = async (req, res) => {
  const { targetId } = req.params;
  const { targetType } = req.query;

  if (!targetType) {
    return res.status(400).json({ message: 'targetType query parameter is required.' });
  }

  try {
    const count = await Review.countDocuments({ target: targetId, targetType });

    res.status(200).json({
      targetId,
      targetType,
      count,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all reviews authored by a given user (reviews they wrote)
const getReviewsByAuthor = async (req, res) => {
  const { userId } = req.params;

  try {
    const reviews = await Review.find({ reviewer: userId })
      .populate('reviewer', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      reviews,
      count: reviews.length,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update a review
const updateReview = async (req, res) => {
  const { id } = req.params;
  const { rating, comment } = req.body;

  if (!rating && !comment) {
    return res.status(400).json({ message: 'At least rating or comment is required to update.' });
  }

  if (rating && (rating < 1 || rating > 5)) {
    return res.status(400).json({ message: 'Rating must be between 1 and 5.' });
  }

  try {
    const review = await Review.findById(id);

    if (!review) {
      return res.status(404).json({ message: 'Review not found.' });
    }

    // Only reviewer can update their review
    if (review.reviewer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only update your own reviews.' });
    }

    if (rating) review.rating = rating;
    if (comment) review.comment = comment;

    await review.save();
    res.status(200).json(review);
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

// All reviews left on properties owned (listedBy) by a given user.
// Used by the seller/dealer dashboard to show incoming reviews on their listings.
const getReviewsForUserProperties = async (req, res) => {
  const { userId } = req.params;
  try {
    const properties = await Property.find({ listedBy: userId }).select('_id title photos location');
    const propIds = properties.map((p) => p._id);
    if (propIds.length === 0) {
      return res.status(200).json({ reviews: [], count: 0, averageRating: 0 });
    }

    const reviews = await Review.find({ target: { $in: propIds }, targetType: 'property' })
      .populate('reviewer', 'name email avatar role')
      .sort({ createdAt: -1 });

    // Attach the property summary onto each review so the dashboard can show
    // which listing a review is for without a second round-trip.
    const propsById = new Map(properties.map((p) => [String(p._id), p]));
    const enriched = reviews.map((r) => {
      const obj = r.toObject();
      obj.property = propsById.get(String(r.target)) || null;
      return obj;
    });

    const averageRating =
      reviews.length > 0
        ? parseFloat(
            (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(2)
          )
        : 0;

    res.status(200).json({ reviews: enriched, count: reviews.length, averageRating });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createReview,
  getReviews,
  getReviewsByTargetId,
  getReviewsByAuthor,
  getReviewsForUserProperties,
  getAverageRating,
  getReviewCount,
  updateReview,
  deleteReview
};