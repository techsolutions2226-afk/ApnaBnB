import apiClient from '../api/apiClient';

const uploadService = {
  // Upload single image — used for property photos. Lands in the
  // property_images Cloudinary folder.
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

  // Upload a profile picture — lands in the Profile-Images Cloudinary folder
  // (separate from property photos), square-cropped to 400×400 with face-aware
  // gravity so the user's face stays centred.
  uploadProfileImage: async (file) => {
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await apiClient.post('/upload/profile', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error) {
      throw error.response?.data || {
        success: false,
        message: 'Failed to upload profile picture. Please try again.',
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
