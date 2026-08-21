import apiClient from '../api/apiClient';

const planService = {
  // Public catalog — active plans only. `role` filters to one role's tiers.
  getPlans: async (role) => {
    try {
      const response = await apiClient.get('/plans', {
        params: role ? { role } : {},
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch plans' };
    }
  },

  // ── Admin CRUD (includes inactive plans on /all) ──
  getAll: async (filters = {}) => {
    try {
      const response = await apiClient.get('/plans/all', { params: filters });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch plans' };
    }
  },

  create: async (payload) => {
    try {
      const response = await apiClient.post('/plans', payload);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to create plan' };
    }
  },

  update: async (id, payload) => {
    try {
      const response = await apiClient.put(`/plans/${id}`, payload);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update plan' };
    }
  },

  remove: async (id) => {
    try {
      const response = await apiClient.delete(`/plans/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to delete plan' };
    }
  },
};

export default planService;
