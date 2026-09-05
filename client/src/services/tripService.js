import apiClient from '../api/apiClient';

const tripService = {
  // Create a new visit request (visitor proposes a schedule)
  create: async (tripData) => {
    try {
      const response = await apiClient.post('/trips', tripData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to create visit' };
    }
  },

  // List the current user's visits (outgoing + incoming on their listings)
  getMine: async (status) => {
    try {
      const params = status ? { status } : {};
      const response = await apiClient.get('/trips', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch visits' };
    }
  },

  // Get a single visit by id
  getById: async (id) => {
    try {
      const response = await apiClient.get(`/trips/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch visit' };
    }
  },

  // Propose a schedule (visitor or owner) for a visit
  proposeSchedule: async (id, { date, time }) => {
    try {
      const response = await apiClient.put(`/trips/${id}/propose-schedule`, {
        date,
        time,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to propose schedule' };
    }
  },

  // Confirm the current schedule (visitor or owner)
  confirm: async (id) => {
    try {
      const response = await apiClient.put(`/trips/${id}/confirm`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to confirm visit' };
    }
  },

  // Contact details — revealed only after both sides confirm
  getContact: async (id) => {
    try {
      const response = await apiClient.get(`/trips/${id}/contact`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch contact details' };
    }
  },

  // Cancel a visit
  cancel: async (id) => {
    try {
      const response = await apiClient.put(`/trips/${id}/cancel`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to cancel visit' };
    }
  },
};

export default tripService;