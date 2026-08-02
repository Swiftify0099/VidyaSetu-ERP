import axios from 'axios';
import authService from './authService';

const configuredApiUrl = import.meta.env.VITE_API_URL;
const isReplitPreview =
  typeof window !== 'undefined' &&
  (window.location.hostname.endsWith('.replit.dev') ||
    window.location.hostname.endsWith('.repl.co'));

export const API_BASE_URL =
  isReplitPreview && configuredApiUrl?.includes('localhost')
    ? '/api/v1'
    : configuredApiUrl || '/api/v1';

const api = axios.create({
  // Replit proxies /api to FastAPI. Docker can still use its configured URL.
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// Request interceptor — attach token
api.interceptors.request.use(config => {
  const token = authService.getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor — handle 401 and refresh token
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

api.interceptors.response.use(
  response => response,
  async error => {
    const original = error.config;
    const isAuthRequest = original?.url?.includes('/auth/login') || original?.url?.includes('/auth/refresh');

    if (error.response?.status === 401 && !original?._retry && !isAuthRequest) {
      if (isRefreshing) {
        return new Promise(resolve => {
          refreshQueue.push(token => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(api(original));
          });
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const newToken = await authService.refreshToken();
        refreshQueue.forEach(cb => cb(newToken));
        refreshQueue = [];
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (refreshErr) {
        authService.clearStorage();
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
