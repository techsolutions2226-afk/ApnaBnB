import axios from 'axios';

// Session-death codes the server sends for a deleted / suspended /
// deactivated / unverified / revoked account. Any one of these while the user
// is authenticated means the session is no longer valid and must be dropped.
const SESSION_DEAD_CODES = new Set([
  'USER_NOT_FOUND',
  'ACCOUNT_SUSPENDED',
  'ACCOUNT_DEACTIVATED',
  'EMAIL_NOT_VERIFIED',
  'SESSION_REVOKED',
]);

// Create axios instance with base URL
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token.
// FormData must NOT carry a manual Content-Type — the browser has to set
// multipart/form-data with the correct boundary, or multer never sees the file.
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      if (config.headers && typeof config.headers.delete === 'function') {
        config.headers.delete('Content-Type');
      } else if (config.headers) {
        delete config.headers['Content-Type'];
        delete config.headers['content-type'];
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth endpoints — a 401 here means "wrong creds / unverified", NOT
// "session expired". Letting the global handler redirect would wipe the
// toast the page is about to show and yank the user away from /login.
const AUTH_PATH_PREFIXES = ['/auth/'];

const isAuthEndpoint = (url = '') =>
  AUTH_PATH_PREFIXES.some((prefix) => url.includes(prefix));

// Wipe the local session. Centralised so the 401 and the 403 session-death
// paths agree on exactly what gets cleared.
const clearLocalSession = () => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('current_user');
};

// Response interceptor — redirect to login on any response that proves the
// current session is dead: a 401 for an authenticated request (expired /
// revoked / deleted account) OR a 403 carrying a session-death code
// (suspended / deactivated account). Both mean the user must be logged out.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    const code = error.response?.data?.code;
    const hadToken = !!localStorage.getItem('auth_token');

    const sessionDead =
      hadToken &&
      !isAuthEndpoint(url) &&
      (status === 401 ||
        (status === 403 && SESSION_DEAD_CODES.has(code)));

    if (sessionDead) {
      clearLocalSession();
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
