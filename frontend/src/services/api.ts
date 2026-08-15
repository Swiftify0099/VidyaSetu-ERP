import axios from 'axios';
import authService from './authService';

// IMPORTANT: Never use a relative path here — relative paths break when the
// frontend is hosted on a different domain (e.g. Cloudflare Workers/Pages) from
// the backend (Render). A relative /api/v1 would hit Cloudflare, not Render.
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  'https://vidyasetu-erp.onrender.com/api/v1';  // absolute fallback — never relative
export const STORAGE_BASE_URL = import.meta.env.VITE_STORAGE_URL || '/storage';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  // 90s timeout — Render free-tier backend can take up to 90s to cold-start.
  timeout: 90000,
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
      } catch (refreshErr: any) {
        refreshQueue = [];
        const isAuthError = refreshErr?.response?.status === 401 || refreshErr?.response?.status === 400 || refreshErr?.response?.status === 403;
        if (isAuthError) {
          authService.clearStorage();
          if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
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
