import apiClient from '../api/apiClient';

const paymentService = {
  // Submit a manual EasyPaisa payment. `formData` is multipart:
  //   planId, billingCycle, proof (File)
  // The backend recomputes the amount from its own plan catalog and stores
  // the Cloudinary proof URL; the row comes back with status "approved".
  submit: async (formData) => {
    try {
      const response = await apiClient.post('/payments', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000, // image upload can take longer than the default 10s
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to submit payment' };
    }
  },

  // One-click activation of an admin-created FREE plan (both prices 0).
  activateFree: async (planId) => {
    try {
      const response = await apiClient.post('/payments/free', { planId });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to activate free plan' };
    }
  },

  // Subscription gate — { requiresPlan, active, subscription }
  getStatus: async () => {
    try {
      const response = await apiClient.get('/payments/status');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch subscription status' };
    }
  },

  // The current user's own payment history (newest first)
  getMine: async () => {
    try {
      const response = await apiClient.get('/payments/mine');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch payments' };
    }
  },
};

export default paymentService;
