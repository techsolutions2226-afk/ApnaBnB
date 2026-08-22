import apiClient from '../api/apiClient';

const contactService = {
  // Public — everything the Contact Us page renders (admin-editable).
  get: async () => {
    try {
      const response = await apiClient.get('/contact');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to load contact details' };
    }
  },

  // Admin — save the edited page content.
  update: async (payload) => {
    try {
      const response = await apiClient.put('/contact', payload);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to save contact page' };
    }
  },

  // Public — send an enquiry from the contact form.
  sendMessage: async (payload) => {
    try {
      const response = await apiClient.post('/contact/message', payload);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to send message' };
    }
  },
};

export default contactService;
