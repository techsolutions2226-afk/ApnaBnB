import apiClient from '../api/apiClient';

const UPLOAD_TIMEOUT_MS = 60000;

const uploadService = {
  uploadSingle: async (file) => {
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await apiClient.post('/upload/image', formData, {
        timeout: UPLOAD_TIMEOUT_MS,
      });

      return response.data;
    } catch (error) {
      throw error.response?.data || {
        success: false,
        message: 'Failed to upload image. Please try again.',
      };
    }
  },

  uploadProfileImage: async (file) => {
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await apiClient.post('/upload/profile', formData, {
        timeout: UPLOAD_TIMEOUT_MS,
      });

      return response.data;
    } catch (error) {
      throw error.response?.data || {
        success: false,
        message: 'Failed to upload profile picture. Please try again.',
      };
    }
  },

  // Upload a property walkthrough video — lands in the apnaBnB/videos
  // Cloudinary folder (resource_type: video, so it streams directly).
  uploadVideo: async (file) => {
    try {
      const formData = new FormData();
      formData.append('video', file);

      const response = await apiClient.post('/upload/video', formData, {
        // 50MB clips need more headroom than still images.
        timeout: 5 * 60 * 1000,
      });

      return response.data;
    } catch (error) {
      throw error.response?.data || {
        success: false,
        message: 'Failed to upload video. Please try again.',
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
        timeout: UPLOAD_TIMEOUT_MS,
      });

      return response.data;
    } catch (error) {
      throw error.response?.data || {
        success: false,
        message: 'Failed to upload images. Please try again.',
      };
    }
  },

  deleteImage: async (publicId) => {
    try {
      const response = await apiClient.delete('/upload/image', {
        params: { publicId },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || {
        success: false,
        message: 'Failed to delete image.',
      };
    }
  },

  // Delete a property video from Cloudinary (video pipeline).
  deleteVideo: async (publicId) => {
    try {
      const response = await apiClient.delete('/upload/video', {
        params: { publicId, resourceType: 'video' },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || {
        success: false,
        message: 'Failed to delete video.',
      };
    }
  },
};

export default uploadService;
