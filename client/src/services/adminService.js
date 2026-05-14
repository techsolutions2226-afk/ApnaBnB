import apiClient from '../api/apiClient';

const adminService = {
  // Get platform statistics
  getStats: async () => {
    try {
      const response = await apiClient.get('/admin/stats');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch stats' };
    }
  },

  // Get all users
  getUsers: async (filters = {}) => {
    try {
      const response = await apiClient.get('/admin/users', { params: filters });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch users' };
    }
  },

  // Get user by ID
  getUser: async (userId) => {
    try {
      const response = await apiClient.get(`/admin/users/${userId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch user' };
    }
  },

  // Verify user
  verifyUser: async (userId) => {
    try {
      const response = await apiClient.put(`/admin/users/${userId}/verify`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to verify user' };
    }
  },

  // Suspend user
  suspendUser: async (userId, reason) => {
    try {
      const response = await apiClient.put(`/admin/users/${userId}/suspend`, { reason });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to suspend user' };
    }
  },

  // Get all properties
  getProperties: async (filters = {}) => {
    try {
      const response = await apiClient.get('/admin/properties', { params: filters });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch properties' };
    }
  },

  // Approve property
  approveProperty: async (propertyId) => {
    try {
      const response = await apiClient.put(`/admin/properties/${propertyId}/approve`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to approve property' };
    }
  },

  // Reject property
  rejectProperty: async (propertyId, reason) => {
    try {
      const response = await apiClient.put(`/admin/properties/${propertyId}/reject`, {
        reason,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to reject property' };
    }
  },

  // Get all messages
  getMessages: async (filters = {}) => {
    try {
      const response = await apiClient.get('/admin/messages', { params: filters });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch messages' };
    }
  },

  // Get activity logs
  getActivityLogs: async (filters = {}) => {
    try {
      const response = await apiClient.get('/admin/activity', { params: filters });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch activity logs' };
    }
  },
};

export default adminService;
