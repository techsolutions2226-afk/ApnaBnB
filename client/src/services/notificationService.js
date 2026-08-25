import apiClient from '../api/apiClient';

/* Notifications are per-account and server-owned: read state lives in the
   database, not localStorage, so it follows the user across devices. */
const notificationService = {
  list: async ({ page, limit, unread } = {}) => {
    try {
      const params = {};
      if (page) params.page = page;
      if (limit) params.limit = limit;
      if (unread) params.unread = 'true';
      const response = await apiClient.get('/notifications', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to load notifications' };
    }
  },

  unreadCount: async () => {
    try {
      const response = await apiClient.get('/notifications/unread-count');
      return response.data?.count ?? 0;
    } catch {
      // The badge is decorative; a failure here must never surface as an error.
      return 0;
    }
  },

  markRead: async (id) => {
    const response = await apiClient.patch(`/notifications/${id}/read`);
    return response.data;
  },

  // Marks only what the user actually saw, rather than the whole inbox.
  markManyRead: async (ids) => {
    const response = await apiClient.post('/notifications/read', { ids });
    return response.data;
  },

  markAllRead: async () => {
    const response = await apiClient.post('/notifications/read-all');
    return response.data;
  },

  remove: async (id) => {
    const response = await apiClient.delete(`/notifications/${id}`);
    return response.data;
  },
};

export default notificationService;
