import apiClient from '../api/apiClient';

const requirementService = {
  // Get all requirements
  getAll: async () => {
    try {
      const response = await apiClient.get('/requirements');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch requirements' };
    }
  },

  // Get single requirement by ID
  getById: async (id) => {
    try {
      const response = await apiClient.get(`/requirements/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch requirement' };
    }
  },

  // Create new requirement
  create: async (requirementData) => {
    try {
      const response = await apiClient.post('/requirements', requirementData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to create requirement' };
    }
  },

  // Update requirement
  update: async (id, requirementData) => {
    try {
      const response = await apiClient.put(`/requirements/${id}`, requirementData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update requirement' };
    }
  },

  // Delete requirement
  delete: async (id) => {
    try {
      const response = await apiClient.delete(`/requirements/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to delete requirement' };
    }
  },

  // Get user's requirements
  getUserRequirements: async (userId) => {
    try {
      const response = await apiClient.get(`/requirements/user/${userId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch user requirements' };
    }
  },

  // Search requirements
  search: async (filters) => {
    try {
      const response = await apiClient.get('/requirements/search', { params: filters });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to search requirements' };
    }
  },
};

export default requirementService;
