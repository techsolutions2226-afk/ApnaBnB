import apiClient from '../api/apiClient';

const messageService = {
  // Get all conversations for the user (enriched with lastMessage + unreadCount).
  getConversations: async () => {
    try {
      const response = await apiClient.get('/conversations');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch conversations' };
    }
  },

  getConversation: async (conversationId) => {
    try {
      const response = await apiClient.get(`/conversations/${conversationId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch conversation' };
    }
  },

  // Find an existing 1-1 conversation with `otherUserId`, or create it.
  // Used by "Message" buttons throughout the app (matches, dealer profile, etc.).
  findOrCreateDirect: async (otherUserId) => {
    try {
      const response = await apiClient.post('/conversations/direct', { otherUserId });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to open conversation' };
    }
  },

  createConversation: async (participantIds) => {
    try {
      const response = await apiClient.post('/conversations', { participants: participantIds });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to create conversation' };
    }
  },

  // Get all messages in a conversation (oldest → newest).
  getMessages: async (conversationId) => {
    try {
      const response = await apiClient.get(`/messages/${conversationId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch messages' };
    }
  },

  // Paginated — returns { messages, hasMore, nextBefore } when `before` is set,
  // otherwise falls back to the legacy full array.
  getMessagesPaged: async (conversationId, { before, limit } = {}) => {
    try {
      const response = await apiClient.get(`/messages/${conversationId}`, {
        params: { before, limit },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch messages' };
    }
  },

  // Search within one conversation (server decrypts content).
  searchMessages: async (conversationId, q) => {
    try {
      const response = await apiClient.get(`/messages/${conversationId}/search`, {
        params: { q },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to search messages' };
    }
  },

  // REST send — used only as a fallback when socket isn't connected.
  // `payload` supports: content, attachments, type, parentMessageId, propertyId,
  // location, forwarded.
  sendMessage: async (conversationId, payload) => {
    try {
      const response = await apiClient.post('/messages', {
        conversationId,
        ...payload,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to send message' };
    }
  },

  markAsRead: async (messageId) => {
    try {
      const response = await apiClient.put(`/messages/${messageId}/read`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to mark message as read' };
    }
  },

  markMultipleAsRead: async (messageIds) => {
    try {
      const response = await apiClient.put('/messages/batch/read', { messageIds });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to mark messages as read' };
    }
  },

  // Edit the content of a message you sent.
  updateMessage: async (messageId, content) => {
    try {
      const response = await apiClient.put(`/messages/${messageId}`, { content });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to edit message' };
    }
  },

  // "Delete for me" — hide a message from your own view (DB-backed).
  hideMessage: async (messageId) => {
    try {
      const response = await apiClient.put(`/messages/${messageId}/me`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to hide message' };
    }
  },

  deleteMessage: async (messageId) => {
    try {
      const response = await apiClient.delete(`/messages/${messageId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to delete message' };
    }
  },

  // Delete a whole conversation for all participants.
  deleteConversation: async (conversationId) => {
    try {
      const response = await apiClient.delete(`/conversations/${conversationId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to delete conversation' };
    }
  },

  // Per-user conversation prefs: { pinned?, muted?, archived? }
  updatePrefs: async (conversationId, prefs) => {
    try {
      const response = await apiClient.put(`/conversations/${conversationId}/prefs`, prefs);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update conversation' };
    }
  },

  // Mark the whole conversation read for this user.
  markConversationRead: async (conversationId) => {
    try {
      const response = await apiClient.put(`/conversations/${conversationId}/read`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to mark conversation read' };
    }
  },

  // Set/change a reaction (emoji). Pass '' or omit to remove your reaction.
  setReaction: async (messageId, emoji) => {
    try {
      const response = await apiClient.put(`/messages/${messageId}/reaction`, { emoji });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update reaction' };
    }
  },

  // Toggle "starred" for this user.
  toggleStar: async (messageId) => {
    try {
      const response = await apiClient.put(`/messages/${messageId}/star`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to star message' };
    }
  },

  // Report a message to admins (audited via ActivityLog).
  reportMessage: async (messageId, reason) => {
    try {
      const response = await apiClient.post(`/messages/${messageId}/report`, { reason });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to report message' };
    }
  },
};

export default messageService;
