import apiClient from '../api/apiClient';

const listingService = {
  // Get all listings
  getAll: async () => {
    try {
      const response = await apiClient.get('/listings');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch listings' };
    }
  },

  // Get single listing by ID
  getById: async (id) => {
    try {
      const response = await apiClient.get(`/listings/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch listing' };
    }
  },

  // Create new listing
  create: async (listingData) => {
    try {
      const response = await apiClient.post('/listings', listingData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to create listing' };
    }
  },

  // Update listing status
  updateStatus: async (id, status) => {
    try {
      const response = await apiClient.put(`/listings/${id}`, { status });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update listing' };
    }
  },

  // Update listing
  update: async (id, updates) => {
    try {
      const response = await apiClient.put(`/listings/${id}`, updates);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update listing' };
    }
  },

  // Get user's listings
  getUserListings: async (userId) => {
    try {
      const response = await apiClient.get(`/listings/user/${userId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch user listings' };
    }
  },

  // Delete listing
  delete: async (id) => {
    try {
      const response = await apiClient.delete(`/listings/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to delete listing' };
    }
  },
};

export default listingService;
