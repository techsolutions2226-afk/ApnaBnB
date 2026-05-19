import apiClient from '../api/apiClient';

const authService = {
  // Register a new user
  register: async (userData) => {
    try {
      const response = await apiClient.post('/auth/register', userData);
      /* DO NOT store token or user data after signup */
      /* User must login after registering to be authenticated */
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Registration failed' };
    }
  },

  // Login user
  login: async (email, password) => {
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      if (response.data.token) {
        localStorage.setItem('auth_token', response.data.token);
        const user = {
          id: response.data.id,
          name: response.data.name,
          email: response.data.email,
          role: response.data.role,
          avatar: response.data.avatar || '',
          phone: response.data.phone || '',
          location: response.data.location || '',
          emergencyContact: response.data.emergencyContact || '',
        };
        localStorage.setItem('current_user', JSON.stringify(user));
      }
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Login failed' };
    }
  },

  // Logout user
  logout: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('current_user');
  },

  // Get current user from localStorage
  getCurrentUser: () => {
    try {
      const user = localStorage.getItem('current_user');
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  },

  // Get auth token
  getToken: () => {
    return localStorage.getItem('auth_token');
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('auth_token');
  },

  // Verify OTP — stores token + user on success
  verifyOtp: async (email, otp) => {
    try {
      const response = await apiClient.post('/auth/verify-otp', { email, otp });
      if (response.data.token) {
        localStorage.setItem('auth_token', response.data.token);
        const user = {
          id: response.data.id,
          name: response.data.name,
          email: response.data.email,
          role: response.data.role,
          avatar: response.data.avatar || '',
          phone: response.data.phone || '',
          location: response.data.location || '',
          emergencyContact: response.data.emergencyContact || '',
        };
        localStorage.setItem('current_user', JSON.stringify(user));
      }
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Verification failed' };
    }
  },

  // Resend a fresh OTP
  resendOtp: async (email) => {
    try {
      const response = await apiClient.post('/auth/resend-otp', { email });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to resend code' };
    }
  },

  // Request a forgot-password email
  forgotPassword: async (email) => {
    try {
      const response = await apiClient.post('/auth/forgot-password', { email });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to send reset email' };
    }
  },

  // Validate a reset token (used by the reset page to gate access)
  verifyResetToken: async (email, token) => {
    try {
      const response = await apiClient.post('/auth/verify-reset-token', {
        email,
        token,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Invalid or expired reset link' };
    }
  },

  // Submit a new password using a valid reset token
  resetPassword: async (email, token, newPassword) => {
    try {
      const response = await apiClient.post('/auth/reset-password', {
        email,
        token,
        newPassword,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to reset password' };
    }
  },
};

export default authService;
