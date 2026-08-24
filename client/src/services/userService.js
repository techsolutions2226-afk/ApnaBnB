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

  /* Full owner profile — contact details, where they operate and their active
     listings. Paid: the server returns 402 { code: 'PLAN_REQUIRED' } unless the
     caller is the user themselves or holds an approved plan. The public
     /users/:id route deliberately carries none of this. */
  getProfile: async (id) => {
    try {
      const response = await apiClient.get(`/users/${id}/profile`);
      return response.data;
    } catch (error) {
      const data = error.response?.data;
      if (error.response?.status === 402) {
        throw { ...data, code: 'PLAN_REQUIRED' };
      }
      throw data || { message: 'Failed to load profile' };
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
