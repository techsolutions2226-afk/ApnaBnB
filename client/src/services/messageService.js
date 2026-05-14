import apiClient from '../api/apiClient';

const messageService = {
  // Get all conversations for user
  getConversations: async () => {
    try {
      const response = await apiClient.get('/conversations');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch conversations' };
    }
  },

  // Get single conversation by ID
  getConversation: async (conversationId) => {
    try {
      const response = await apiClient.get(`/conversations/${conversationId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch conversation' };
    }
  },

  // Create new conversation
  createConversation: async (participantIds) => {
    try {
      const response = await apiClient.post('/conversations', { participants: participantIds });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to create conversation' };
    }
  },

  // Get messages in a conversation
  getMessages: async (conversationId) => {
    try {
      const response = await apiClient.get(`/messages/conversation/${conversationId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch messages' };
    }
  },

  // Send a message
  sendMessage: async (conversationId, content) => {
    try {
      const response = await apiClient.post('/messages', {
        conversationId,
        content,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to send message' };
    }
  },

  // Mark message as read
  markAsRead: async (messageId) => {
    try {
      const response = await apiClient.put(`/messages/${messageId}`, { read: true });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to mark message as read' };
    }
  },

  // Delete message
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
