import apiClient from '../api/apiClient';

const reviewService = {
  // Get reviews for a target (property or user). Backend returns
  // { reviews, averageRating, count }.
  getByTarget: async (targetId, targetType = 'property') => {
    try {
      const response = await apiClient.get(`/reviews/${targetId}`, {
        params: { targetType },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch reviews' };
    }
  },

  // Reviews on properties owned (listedBy) by this user. Returns
  // { reviews, count, averageRating } with each review enriched with its property.
  getForUserProperties: async (userId) => {
    try {
      const response = await apiClient.get(`/reviews/owner-of/${userId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch owner reviews' };
    }
  },

  // Get reviews authored by a specific user. Returns { reviews, count }.
  getByUser: async (userId) => {
    try {
      const response = await apiClient.get(`/reviews/user/${userId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch user reviews' };
    }
  },

  // Get single review
  getById: async (reviewId) => {
    try {
      const response = await apiClient.get(`/reviews/${reviewId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch review' };
    }
  },

  // Create review
  create: async (reviewData) => {
    try {
      const response = await apiClient.post('/reviews', reviewData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to create review' };
    }
  },

  // Update review
  update: async (reviewId, reviewData) => {
    try {
      const response = await apiClient.put(`/reviews/${reviewId}`, reviewData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update review' };
    }
  },

  // Delete review
  delete: async (reviewId) => {
    try {
      const response = await apiClient.delete(`/reviews/${reviewId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to delete review' };
    }
  },

  // Get average rating for target
  getAverageRating: async (targetId, targetType = 'property') => {
    try {
      const response = await apiClient.get('/reviews/rating/average', {
        params: { targetId, targetType },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch average rating' };
    }
  },
};

export default reviewService;
