import axios from 'axios';
import { showToast } from '../utils/toastBus.js';
import { getToken, setToken, clearToken } from './tokenStore.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise = null;

export function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = api
      .post('/auth/refresh')
      .then((res) => {
        const { token } = res.data;
        setToken(token);
        return token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

function clearSession() {
  clearToken();
  localStorage.removeItem('user');
}

function notifyExpiredAndRedirect(message) {
  clearSession();
  if (window.location.pathname !== '/login') {
    if (message) showToast(message, 'error');
    window.location.href = '/login';
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const url = error.config?.url || '';
    // Auth endpoints handle their own errors with an inline form message
    // (invalid OTP, wrong password, a failed session-restore check on app
    // startup) - a toast on top of that would just be noise.
    const isAuthEndpoint = url.includes('/auth/');
    const isRefreshEndpoint = url.includes('/auth/refresh');
    const isLoginAttempt =
      url.includes('/auth/staff/login') ||
      url.includes('/auth/patient/verify-otp') ||
      url.includes('/auth/msg91-login');

    if (
      error.response?.status === 401 &&
      !isRefreshEndpoint &&
      !isLoginAttempt &&
      !error.config?._retriedAfterRefresh
    ) {
      
      try {
        const newToken = await refreshAccessToken();
        error.config._retriedAfterRefresh = true;
        error.config.headers.Authorization = `Bearer ${newToken}`;
        return api.request(error.config);
      } catch {
        if (isAuthEndpoint) {
          
          
          
          
          
          clearSession();
        } else {
          notifyExpiredAndRedirect('Your session has expired. Please sign in again.');
        }
        return Promise.reject(error);
      }
    }

    if (error.response?.status === 401 && !isAuthEndpoint) {
      notifyExpiredAndRedirect('Your session has expired. Please sign in again.');
    } else if (!isAuthEndpoint && error.response?.status !== undefined) {
      
      
      
      const message = error.response?.data?.error || 'Something went wrong. Please try again.';
      showToast(message, 'error');
    } else if (!isAuthEndpoint && !error.response) {
      showToast('Network error - please check your connection.', 'error');
    }
    return Promise.reject(error);
  }
);

export default api;
