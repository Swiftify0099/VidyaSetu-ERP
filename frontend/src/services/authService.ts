import api from './api';
import { buildDeviceContext } from './deviceService';

export interface AuthRole {
  id: number;
  name: string;
  code: string;
  color?: string;
}

export interface AuthUser {
  id: number;
  uuid: string;
  username: string;
  full_name: string;
  mobile?: string;
  email?: string;
  employee_id?: string;
  gr_number?: string;
  photo_path?: string;
  preferred_language: string;
  preferred_theme: string;
  must_change_password: boolean;
  last_login?: string;
  roles: AuthRole[];
  permissions: string[];
}

export interface LoginCredentials {
  username: string;
  password: string;
  remember_me?: boolean;
  device_name?: string;
}

const TOKEN_KEY = 'vidyasetu_access_token';
const REFRESH_KEY = 'vidyasetu_refresh_token';
const USER_KEY = 'vidyasetu_user';
const PENDING_ATTEMPT_KEY = 'vidyasetu_pending_attempt_id';

const authService = {
  async login(credentials: LoginCredentials): Promise<{ user: AuthUser; access_token: string } | { requires_verification: true; login_attempt_id: string }> {
    const deviceContext = buildDeviceContext();
    const res = await api.post('/auth/login', { ...credentials, ...deviceContext });
    const { data } = res.data;

    // HTTP 202 — new device, verification required
    if (res.status === 202 || data?.requires_verification) {
      const attemptId = data?.login_attempt_id || '';
      localStorage.setItem(PENDING_ATTEMPT_KEY, attemptId);
      return { requires_verification: true, login_attempt_id: attemptId };
    }

    // HTTP 200 — normal successful login
    localStorage.setItem(TOKEN_KEY, data.access_token);
    localStorage.setItem(REFRESH_KEY, data.refresh_token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    localStorage.removeItem(PENDING_ATTEMPT_KEY);
    return { user: data.user, access_token: data.access_token };
  },

  async logout(): Promise<void> {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    this.clearStorage();
  },

  async logoutAll(): Promise<void> {
    try { await api.post('/auth/logout-all'); } catch { /* ignore */ }
    this.clearStorage();
  },

  async getMe(): Promise<AuthUser> {
    const res = await api.get('/auth/me');
    return res.data.data;
  },

  async refreshToken(): Promise<string> {
    const refresh = localStorage.getItem(REFRESH_KEY);
    if (!refresh) throw new Error('No refresh token');
    const res = await api.post('/auth/refresh', { refresh_token: refresh });
    const { data } = res.data;
    localStorage.setItem(TOKEN_KEY, data.access_token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    return data.access_token;
  },

  getAccessToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  },

  getStoredUser(): AuthUser | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  },

  storeUser(user: AuthUser): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  clearStorage(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

export default authService;
