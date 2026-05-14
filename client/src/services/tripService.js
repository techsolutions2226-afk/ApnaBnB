import apiClient from '../api/apiClient';

const tripService = {
  // Create a new trip / reservation
  create: async (tripData) => {
    try {
      const response = await apiClient.post('/trips', tripData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to create trip' };
    }
  },

  // List the current user's trips (optional status filter)
  getMine: async (status) => {
    try {
      const params = status ? { status } : {};
      const response = await apiClient.get('/trips', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch trips' };
    }
  },

  // Get a single trip by id
  getById: async (id) => {
    try {
      const response = await apiClient.get(`/trips/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch trip' };
    }
  },

  // Cancel a trip
  cancel: async (id) => {
    try {
      const response = await apiClient.put(`/trips/${id}/cancel`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to cancel trip' };
    }
  },
};

export default tripService;
