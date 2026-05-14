import apiClient from '../api/apiClient';

const uploadService = {
  // Upload single image
  uploadSingle: async (file) => {
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await apiClient.post('/upload/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error) {
      throw error.response?.data || { 
        success: false,
        message: 'Failed to upload image. Please try again.' 
      };
    }
  },

  // Upload multiple images
  uploadMultiple: async (files) => {
    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('images', file);
      });

      const response = await apiClient.post('/upload/images', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error) {
      throw error.response?.data || { 
        success: false,
        message: 'Failed to upload images. Please try again.' 
      };
    }
  },

  // Delete image from Cloudinary
  deleteImage: async (publicId) => {
    try {
      const response = await apiClient.delete(`/upload/image/${publicId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { 
        success: false,
        message: 'Failed to delete image. Please try again.' 
      };
    }
  },
};

export default uploadService;
