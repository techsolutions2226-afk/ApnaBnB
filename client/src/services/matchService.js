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

  // Get every match involving the current user (any type).
  getMyMatches: async () => {
    try {
      const response = await apiClient.get('/matches/mine');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch your matches' };
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

  // Update a match's status (pending | accepted | rejected | closed).
  // Accepting opens the private Deal Room and returns it on the match.
  updateStatus: async (id, status) => {
    try {
      const response = await apiClient.put(`/matches/${id}/status`, { status });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update match status' };
    }
  },

  // Get the counterpart's contact details — revealed only once accepted.
  getContact: async (id) => {
    try {
      const response = await apiClient.get(`/matches/${id}/contact`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Contact not available yet' };
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
};

export default matchService;
