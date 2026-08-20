import apiClient from '../api/apiClient';

const blockService = {
  // Ids the current user has blocked (drives the Block/Unblock toggle).
  listBlocked: async () => {
    try {
      const response = await apiClient.get('/blocks');
      return response.data; // { blocked: [userId, ...] }
    } catch (error) {
      throw error.response?.data || { message: 'Failed to load blocked users' };
    }
  },

  block: async (userId) => {
    try {
      const response = await apiClient.post(`/blocks/${userId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to block user' };
    }
  },

  unblock: async (userId) => {
    try {
      const response = await apiClient.delete(`/blocks/${userId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to unblock user' };
    }
  },
};

export default blockService;
