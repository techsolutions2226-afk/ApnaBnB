import apiClient from '../api/apiClient';

const locationService = {
  /* Approximate visitor location from the request IP (server-side lookup).
     Never throws: a failed request is just "not detected", so the home page
     keeps working exactly as it does without personalisation. */
  detect: async () => {
    try {
      const response = await apiClient.get('/location/detect');
      return response.data || { detected: false };
    } catch {
      return { detected: false };
    }
  },
};

export default locationService;
