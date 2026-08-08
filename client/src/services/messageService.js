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

  // REST send — used only as a fallback when socket isn't connected.
  sendMessage: async (conversationId, content, attachments = []) => {
    try {
      const response = await apiClient.post('/messages', {
        conversationId,
        content,
        attachments,
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
};

export default messageService;
