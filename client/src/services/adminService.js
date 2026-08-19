import apiClient from '../api/apiClient';

const adminService = {
  // ── Stats ──
  getStats: async () => {
    try {
      const response = await apiClient.get('/admin/stats');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch stats' };
    }
  },

  // ── Users ──
  getUsers: async (filters = {}) => {
    try {
      const response = await apiClient.get('/admin/users', { params: filters });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch users' };
    }
  },

  getUser: async (userId) => {
    try {
      const response = await apiClient.get(`/admin/users/${userId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch user' };
    }
  },

  createUser: async (userData) => {
    try {
      const response = await apiClient.post('/admin/users', userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to create user' };
    }
  },

  updateUser: async (userId, userData) => {
    try {
      const response = await apiClient.put(`/admin/users/${userId}`, userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update user' };
    }
  },

  deleteUser: async (userId) => {
    try {
      const response = await apiClient.delete(`/admin/users/${userId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to delete user' };
    }
  },

  verifyUser: async (userId) => {
    try {
      const response = await apiClient.put(`/admin/users/${userId}/verify`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to verify user' };
    }
  },

  suspendUser: async (userId, reason) => {
    try {
      const response = await apiClient.put(`/admin/users/${userId}/suspend`, { reason });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to suspend user' };
    }
  },

  // ── Properties ──
  getProperties: async (filters = {}) => {
    try {
      const response = await apiClient.get('/admin/properties', { params: filters });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch properties' };
    }
  },

  updateProperty: async (propertyId, data) => {
    try {
      const response = await apiClient.put(`/admin/properties/${propertyId}`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update property' };
    }
  },

  deleteProperty: async (propertyId) => {
    try {
      const response = await apiClient.delete(`/admin/properties/${propertyId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to delete property' };
    }
  },

  approveProperty: async (propertyId) => {
    try {
      const response = await apiClient.put(`/admin/properties/${propertyId}/approve`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to approve property' };
    }
  },

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

  // ── Listings ──
  getListings: async (filters = {}) => {
    try {
      const response = await apiClient.get('/admin/listings', { params: filters });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch listings' };
    }
  },

  updateListing: async (listingId, data) => {
    try {
      const response = await apiClient.put(`/admin/listings/${listingId}`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update listing' };
    }
  },

  deleteListing: async (listingId) => {
    try {
      const response = await apiClient.delete(`/admin/listings/${listingId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to delete listing' };
    }
  },

  // ── Requirements ──
  getRequirements: async (filters = {}) => {
    try {
      const response = await apiClient.get('/admin/requirements', { params: filters });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch requirements' };
    }
  },

  updateRequirement: async (requirementId, data) => {
    try {
      const response = await apiClient.put(`/admin/requirements/${requirementId}`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update requirement' };
    }
  },

  deleteRequirement: async (requirementId) => {
    try {
      const response = await apiClient.delete(`/admin/requirements/${requirementId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to delete requirement' };
    }
  },

  // ── Matches ──
  getMatches: async (filters = {}) => {
    try {
      const response = await apiClient.get('/admin/matches', { params: filters });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch matches' };
    }
  },

  deleteMatch: async (matchId) => {
    try {
      const response = await apiClient.delete(`/admin/matches/${matchId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to delete match' };
    }
  },

  // ── Messages ──
  getMessages: async (filters = {}) => {
    try {
      const response = await apiClient.get('/admin/messages', { params: filters });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch messages' };
    }
  },

  deleteMessage: async (messageId) => {
    try {
      const response = await apiClient.delete(`/admin/messages/${messageId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to delete message' };
    }
  },

  // ── Conversations (WhatsApp-style review) ──
  getConversations: async () => {
    try {
      const response = await apiClient.get('/admin/conversations');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch conversations' };
    }
  },

  getConversationMessages: async (conversationId) => {
    try {
      const response = await apiClient.get(`/admin/conversations/${conversationId}/messages`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch conversation' };
    }
  },

  deleteConversation: async (conversationId) => {
    try {
      const response = await apiClient.delete(`/admin/conversations/${conversationId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to delete conversation' };
    }
  },

  // ── Activity logs ──
  getActivityLogs: async (filters = {}) => {
    try {
      const response = await apiClient.get('/admin/activity', { params: filters });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch activity logs' };
    }
  },

  getUserActivity: async (userId, filters = {}) => {
    try {
      const response = await apiClient.get(`/admin/activity/user/${userId}`, { params: filters });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch user activity' };
    }
  },
};

export default adminService;