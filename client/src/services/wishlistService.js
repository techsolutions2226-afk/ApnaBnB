import apiClient from '../api/apiClient';

const wishlistService = {
  // Get all wishlists for the current user (auto-creates default "Saved")
  getAll: async () => {
    try {
      const response = await apiClient.get('/wishlists');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch wishlists' };
    }
  },

  // Create a new (non-default) wishlist
  create: async (name) => {
    try {
      const response = await apiClient.post('/wishlists', { name });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to create wishlist' };
    }
  },

  // Rename a wishlist
  update: async (id, name) => {
    try {
      const response = await apiClient.put(`/wishlists/${id}`, { name });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update wishlist' };
    }
  },

  // Delete a wishlist (default cannot be deleted server-side)
  delete: async (id) => {
    try {
      const response = await apiClient.delete(`/wishlists/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to delete wishlist' };
    }
  },

  // Add a property to a wishlist
  addProperty: async (listId, propertyId) => {
    try {
      const response = await apiClient.post(
        `/wishlists/${listId}/properties`,
        { propertyId }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to add property' };
    }
  },

  // Remove a property from a specific wishlist
  removeProperty: async (listId, propertyId) => {
    try {
      const response = await apiClient.delete(
        `/wishlists/${listId}/properties/${propertyId}`
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to remove property' };
    }
  },

  // Remove a property from every wishlist
  removeFromAll: async (propertyId) => {
    try {
      const response = await apiClient.delete(
        `/wishlists/properties/${propertyId}`
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to remove property' };
    }
  },
};

export default wishlistService;
