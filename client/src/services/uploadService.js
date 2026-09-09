import apiClient from '../api/apiClient';

const UPLOAD_TIMEOUT_MS = 60000;

const uploadService = {
  // Upload single image — used for property photos. Lands in the
  // property_images Cloudinary folder.
  // Do not set Content-Type manually; apiClient strips it for FormData so the
  // browser can attach the multipart boundary multer needs.
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

  // Upload a profile picture — lands in the Profile-Images Cloudinary folder
  // (separate from property photos), square-cropped to 400×400 with face-aware
  // gravity so the user's face stays centred.
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
};

export default uploadService;
