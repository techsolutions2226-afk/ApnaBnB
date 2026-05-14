import apiClient from '../api/apiClient';

const propertyService = {
  // Get all properties with optional filters
  getAll: async (filters = {}) => {
    try {
      const response = await apiClient.get('/properties', { params: filters });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch properties' };
    }
  },

  // Get single property by ID
  getById: async (id) => {
    try {
      const response = await apiClient.get(`/properties/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch property' };
    }
  },

  // Create new property
  create: async (propertyData) => {
    try {
      const response = await apiClient.post('/properties', propertyData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to create property' };
    }
  },

  // Update property
  update: async (id, propertyData) => {
    try {
      const response = await apiClient.put(`/properties/${id}`, propertyData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update property' };
    }
  },

  // Delete property
  delete: async (id) => {
    try {
      const response = await apiClient.delete(`/properties/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to delete property' };
    }
  },

  // Search properties
  search: async (query) => {
    try {
      const response = await apiClient.get('/properties/search', { params: { q: query } });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to search properties' };
    }
  },
};

export default propertyService;
