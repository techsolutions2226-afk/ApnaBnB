import axios from 'axios';

// Create axios instance with base URL
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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

// Response interceptor — only redirect on 401s that actually indicate an
// expired session for an already-authenticated user.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    const hadToken = !!localStorage.getItem('auth_token');

    if (status === 401 && hadToken && !isAuthEndpoint(url)) {
      // A request authenticated with a token came back 401 → token is
      // expired/invalid. Wipe local session and bounce to login.
      localStorage.removeItem('auth_token');
      localStorage.removeItem('current_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
