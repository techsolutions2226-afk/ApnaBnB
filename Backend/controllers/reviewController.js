const prisma = require('../db/prisma');

const reviewerSelect = {
  select: { id: true, name: true, email: true, avatar: true, role: true },
};

const avgOf = (reviews) =>
  reviews.length > 0
    ? parseFloat((reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(2))
    : 0;

// Create a review
const createReview = async (req, res, next) => {
  const { target, targetType, rating, comment } = req.body;

  if (!target || !targetType || !rating) {
    return res.status(400).json({ message: 'Target, targetType, and rating are required.' });
  }

  if (rating < 1 || rating > 5) {
    return res.status(400).json({ message: 'Rating must be between 1 and 5.' });
  }

  try {
    const existingReview = await prisma.review.findFirst({
      where: { reviewerId: req.user.id, target, targetType },
    });

    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this target.' });
    }

    const review = await prisma.review.create({
      data: {
        reviewerId: req.user.id,
        target,
        targetType,
        rating: Number(rating),
        comment,
      },
    });

    res.status(201).json(review);
  } catch (error) {
    next(error);
  }
};

// Get reviews for a target (with query params)
const getReviews = async (req, res, next) => {
  const { target, targetType } = req.query;

  if (!target || !targetType) {
    return res.status(400).json({ message: 'Target and targetType are required as query parameters.' });
  }

  try {
    const reviews = await prisma.review.findMany({
      where: { target, targetType },
      include: { reviewer: reviewerSelect },
    });

    res.status(200).json({
      reviews,
      averageRating: avgOf(reviews),
      count: reviews.length,
    });
  } catch (error) {
    next(error);
  }
};

// Get reviews for a target by ID (URL parameter version)
const getReviewsByTargetId = async (req, res, next) => {
  const { targetId } = req.params;
  const { targetType } = req.query;

  if (!targetType) {
    return res.status(400).json({ message: 'targetType query parameter is required.' });
  }

  try {
    const reviews = await prisma.review.findMany({
      where: { target: targetId, targetType },
      include: { reviewer: reviewerSelect },
    });

    res.status(200).json({
      reviews,
      averageRating: avgOf(reviews),
      count: reviews.length,
    });
  } catch (error) {
    next(error);
  }
};

// Get average rating for a target
const getAverageRating = async (req, res, next) => {
  const { targetId } = req.params;
  const { targetType } = req.query;

  if (!targetType) {
    return res.status(400).json({ message: 'targetType query parameter is required.' });
  }

  try {
    const reviews = await prisma.review.findMany({ where: { target: targetId, targetType } });

    res.status(200).json({
      targetId,
      targetType,
      averageRating: avgOf(reviews),
      totalReviews: reviews.length,
    });
  } catch (error) {
    next(error);
  }
};

// Get review count for a target
const getReviewCount = async (req, res, next) => {
  const { targetId } = req.params;
  const { targetType } = req.query;

  if (!targetType) {
    return res.status(400).json({ message: 'targetType query parameter is required.' });
  }

  try {
    const count = await prisma.review.count({ where: { target: targetId, targetType } });
    res.status(200).json({ targetId, targetType, count });
  } catch (error) {
    next(error);
  }
};

// Get all reviews authored by a given user
const getReviewsByAuthor = async (req, res, next) => {
  const { userId } = req.params;

  try {
    const reviews = await prisma.review.findMany({
      where: { reviewerId: userId },
      include: { reviewer: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ reviews, count: reviews.length });
  } catch (error) {
    next(error);
  }
};

// Update a review
const updateReview = async (req, res, next) => {
  const { id } = req.params;
  const { rating, comment } = req.body;

  if (!rating && !comment) {
    return res.status(400).json({ message: 'At least rating or comment is required to update.' });
  }

  if (rating && (rating < 1 || rating > 5)) {
    return res.status(400).json({ message: 'Rating must be between 1 and 5.' });
  }

  try {
    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) {
      return res.status(404).json({ message: 'Review not found.' });
    }
    if (review.reviewerId !== req.user.id) {
      return res.status(403).json({ message: 'You can only update your own reviews.' });
    }

    const data = {};
    if (rating) data.rating = Number(rating);
    if (comment) data.comment = comment;

    const updated = await prisma.review.update({ where: { id }, data });
    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};

// Delete a review
const deleteReview = async (req, res, next) => {
  const { id } = req.params;

  try {
    const result = await prisma.review.deleteMany({
      where: { id, reviewerId: req.user.id },
    });

    if (result.count === 0) {
      return res.status(404).json({ message: 'Review not found or unauthorized.' });
    }

    res.status(200).json({ message: 'Review deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

// All reviews left on properties owned (listedBy) by a given user.
const getReviewsForUserProperties = async (req, res, next) => {
  const { userId } = req.params;
  try {
    const properties = await prisma.property.findMany({
      where: { listedById: userId },
      select: { id: true, title: true, photos: true, location: true },
    });
    const propIds = properties.map((p) => p.id);
    if (propIds.length === 0) {
      return res.status(200).json({ reviews: [], count: 0, averageRating: 0 });
    }

    const reviews = await prisma.review.findMany({
      where: { target: { in: propIds }, targetType: 'property' },
      include: { reviewer: reviewerSelect },
      orderBy: { createdAt: 'desc' },
    });

    const propsById = new Map(properties.map((p) => [p.id, p]));
    const enriched = reviews.map((r) => ({ ...r, property: propsById.get(r.target) || null }));

    res.status(200).json({ reviews: enriched, count: reviews.length, averageRating: avgOf(reviews) });
  } catch (error) {
    next(error);
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
  deleteReview,
};
