import apiClient from '../api/apiClient';

/* Every call here surfaces the server's `code` alongside the message, because
   the UI branches on codes (WRONG_PASSWORD, SETUP_EXPIRED, …) rather than
   pattern-matching prose. */
const unwrap = (error, fallback) => {
  const data = error.response?.data;
  const err = new Error(data?.message || fallback);
  err.code = data?.code;
  err.status = error.response?.status;
  throw err;
};

const securityService = {
  // What the Login & security page renders from.
  getOverview: async () => {
    try {
      const { data } = await apiClient.get('/security/overview');
      return data;
    } catch (error) {
      return unwrap(error, 'Could not load your security settings');
    }
  },

  changePassword: async (currentPassword, newPassword) => {
    try {
      const { data } = await apiClient.put('/security/password', {
        currentPassword,
        newPassword,
      });
      return data;
    } catch (error) {
      return unwrap(error, 'Could not change your password');
    }
  },

  setLoginAlerts: async (enabled) => {
    try {
      const { data } = await apiClient.put('/security/login-alerts', { enabled });
      return data;
    } catch (error) {
      return unwrap(error, 'Could not update login alerts');
    }
  },

  /* Step 1 of enabling 2FA.
     method 'totp'  -> { secret, qrDataUrl }
     method 'email' -> { sentTo } and a code is mailed */
  startTwoFactorSetup: async (method) => {
    try {
      const { data } = await apiClient.post('/security/2fa/setup', { method });
      return data;
    } catch (error) {
      return unwrap(error, 'Could not start two-factor setup');
    }
  },

  // Step 2 — returns the one and only copy of the recovery codes.
  enableTwoFactor: async (method, code) => {
    try {
      const { data } = await apiClient.post('/security/2fa/enable', { method, code });
      return data;
    } catch (error) {
      return unwrap(error, 'Could not turn on two-factor authentication');
    }
  },

  disableTwoFactor: async (password) => {
    try {
      const { data } = await apiClient.post('/security/2fa/disable', { password });
      return data;
    } catch (error) {
      return unwrap(error, 'Could not turn off two-factor authentication');
    }
  },

  regenerateRecoveryCodes: async (password) => {
    try {
      const { data } = await apiClient.post('/security/2fa/recovery-codes', { password });
      return data;
    } catch (error) {
      return unwrap(error, 'Could not generate new recovery codes');
    }
  },

  deactivateAccount: async (password) => {
    try {
      const { data } = await apiClient.post('/security/deactivate', { password });
      return data;
    } catch (error) {
      return unwrap(error, 'Could not deactivate your account');
    }
  },
};

export default securityService;
