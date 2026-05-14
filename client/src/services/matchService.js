import apiClient from '../api/apiClient';

const matchService = {
  // Get matches for current user
  getMatches: async (type = 'all') => {
    try {
      const response = await apiClient.get('/matches', { params: { type } });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch matches' };
    }
  },

  // Get specific match by ID
  getById: async (id) => {
    try {
      const response = await apiClient.get(`/matches/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch match' };
    }
  },

  // Get seller-buyer matches
  getSellerBuyerMatches: async () => {
    try {
      const response = await apiClient.get('/matches/seller-buyer');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch seller-buyer matches' };
    }
  },

  // Get dealer-buyer matches
  getDealerBuyerMatches: async () => {
    try {
      const response = await apiClient.get('/matches/dealer-buyer');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch dealer-buyer matches' };
    }
  },

  // Get dealer-dealer matches
  getDealerDealerMatches: async () => {
    try {
      const response = await apiClient.get('/matches/dealer-dealer');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch dealer-dealer matches' };
    }
  },

  // Create a match (when property matches with requirement)
  create: async (matchData) => {
    try {
      const response = await apiClient.post('/matches', matchData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to create match' };
    }
  },

  // Get match score between property and requirement
  getScore: async (propertyId, requirementId) => {
    try {
      const response = await apiClient.post('/matches/score', {
        propertyId,
        requirementId,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to calculate match score' };
    }
  },
};

export default matchService;
