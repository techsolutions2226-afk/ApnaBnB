import { useState, useEffect } from 'react';
import reviewService from '../services/reviewService';

export const useReviewsByTarget = (targetId, targetType = 'property') => {
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchReviews = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await reviewService.getByTarget(targetId, targetType);
      setReviews(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch reviews');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (targetId) {
      fetchReviews();
    }
  }, [targetId, targetType]);

  return { reviews, isLoading, error, refetch: fetchReviews };
};

export const useReviewsByUser = (userId) => {
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchReviews = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await reviewService.getByUser(userId);
      setReviews(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch reviews');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchReviews();
    }
  }, [userId]);

  return { reviews, isLoading, error, refetch: fetchReviews };
};

export const useCreateReview = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const create = async (reviewData) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await reviewService.create(reviewData);
      return data;
    } catch (err) {
      setError(err.message || 'Failed to create review');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { create, isLoading, error };
};

export const useUpdateReview = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const update = async (reviewId, reviewData) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await reviewService.update(reviewId, reviewData);
      return data;
    } catch (err) {
      setError(err.message || 'Failed to update review');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { update, isLoading, error };
};

export const useDeleteReview = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const remove = async (reviewId) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await reviewService.delete(reviewId);
      return data;
    } catch (err) {
      setError(err.message || 'Failed to delete review');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { remove, isLoading, error };
};

export const useAverageRating = (targetId, targetType = 'property') => {
  const [rating, setRating] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRating = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await reviewService.getAverageRating(targetId, targetType);
      setRating(data.averageRating || 0);
    } catch (err) {
      setError(err.message || 'Failed to fetch rating');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (targetId) {
      fetchRating();
    }
  }, [targetId, targetType]);

  return { rating, isLoading, error, refetch: fetchRating };
};
