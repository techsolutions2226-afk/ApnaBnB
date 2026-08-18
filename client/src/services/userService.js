import apiClient from '../api/apiClient';

const userService = {
  // Public read-only profile lookup. Returns { _id, name, role, verified, avatar, createdAt }.
  getById: async (id) => {
    try {
      const response = await apiClient.get(`/users/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch user' };
    }
  },

  // Authenticated user updates their own profile (name, avatar).
  updateMe: async (updates) => {
    try {
      const response = await apiClient.put('/users/me', updates);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update profile' };
    }
  },

  // Live dashboard metrics for the authenticated user. Pass the current
  // "viewing as" role so the match count matches what that role sees.
  getStats: async (viewRole) => {
    try {
      const params = viewRole ? { viewRole } : {};
      const response = await apiClient.get('/users/me/stats', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch stats' };
    }
  },
};

export default userService;
