/**
 * VidyaSetu Mobile — API Service
 * Connects to the VidyaSetu ERP backend.
 * Base URL is set via ENV or defaults to local dev server.
 */
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// ── Keys ─────────────────────────────────────────────────────
export const STORAGE_KEYS = {
  ACCESS_TOKEN:  'vs_access_token',
  REFRESH_TOKEN: 'vs_refresh_token',
  USER:          'vs_user',
  LANGUAGE:      'vs_language',
  THEME:         'vs_theme',
};

// ── Base URL — change for production ─────────────────────────
// Android emulator uses 10.0.2.2 to connect to host machine localhost
const DEV_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost'; 
const BASE_URL = __DEV__
  ? `http://${DEV_HOST}:8000/api/v1`
  : 'https://your-production-domain.com/api/v1';

// ── Axios Instance ────────────────────────────────────────────
const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ── Request Interceptor — attach JWT ─────────────────────────
api.interceptors.request.use(async config => {
  const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response Interceptor — handle 401 ────────────────────────
api.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER,
      ]);
      // Navigation to login is handled at the app level via auth state
    }
    return Promise.reject(error);
  }
);

export default api;

// ── Auth API ──────────────────────────────────────────────────
export const authAPI = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),

  logout: () =>
    api.post('/auth/logout'),

  me: () =>
    api.get('/auth/me'),

  changePassword: (old_password: string, new_password: string) =>
    api.post('/auth/change-password', { old_password, new_password }),
};

// ── Students API ──────────────────────────────────────────────
export const studentsAPI = {
  list: (params?: Record<string, string | number>) =>
    api.get('/students', { params }),
  get: (id: number) =>
    api.get(`/students/${id}`),
};

// ── Attendance API ────────────────────────────────────────────
export const attendanceAPI = {
  getClassAttendance: (standard: string, division: string, date: string) =>
    api.get('/attendance/class', { params: { standard, division, date } }),

  markAttendance: (records: object[]) =>
    api.post('/attendance/mark', { records }),

  getStudentSummary: (studentId: number, academic_year: string) =>
    api.get(`/attendance/student/${studentId}/summary`, { params: { academic_year } }),
};

// ── Finance API ───────────────────────────────────────────────
export const financeAPI = {
  getStudentFees: (studentId: number, academic_year: string) =>
    api.get(`/finance/students/${studentId}/fee-status`, { params: { academic_year } }),

  getRecentReceipts: (params?: Record<string, string | number>) =>
    api.get('/finance/receipts', { params }),
};

// ── Announcements API ─────────────────────────────────────────
export const communicationAPI = {
  getAnnouncements: (params?: Record<string, string | number>) =>
    api.get('/communication/announcements', { params }),

  markRead: (id: number) =>
    api.patch(`/communication/announcements/${id}/read`),
};

// ── Leave API ─────────────────────────────────────────────────
export const leaveAPI = {
  getBalance: (academic_year: string) =>
    api.get('/leave/balance', { params: { academic_year } }),
  getMyApplications: (academic_year?: string) =>
    api.get('/leave/my-applications', { params: { academic_year } }),
  apply: (data: object) =>
    api.post('/leave/apply', data),
};

// ── Analytics / Dashboard API ─────────────────────────────────
export const dashboardAPI = {
  getSummary: (academic_year: string) =>
    api.get('/analytics/summary', { params: { academic_year } }),
};

// ── Health Check ──────────────────────────────────────────────
export const healthAPI = {
  check: () =>
    api.get('/health'),
};
