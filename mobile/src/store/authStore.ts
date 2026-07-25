/**
 * VidyaSetu Mobile — Auth Store (Zustand)
 * Manages login state, tokens, and user info globally.
 */
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI, STORAGE_KEYS } from '../services/api';

interface Role { id: number; name: string; code: string; color: string; }
interface User {
  id: number;
  username: string;
  full_name: string;
  mobile?: string;
  employee_id?: string;
  photo_path?: string;
  roles: Role[];
  preferred_language: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
  clearError: () => void;
  hasRole: (code: string) => boolean;
  hasPermission: (permission: string) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (username: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authAPI.login(username, password);
      const { access_token, user } = res.data?.data ?? res.data;

      await AsyncStorage.multiSet([
        [STORAGE_KEYS.ACCESS_TOKEN,  access_token],
        [STORAGE_KEYS.USER,          JSON.stringify(user)],
      ]);

      set({
        user,
        accessToken: access_token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Login failed. Please check your credentials.';
      set({ isLoading: false, error: msg, isAuthenticated: false });
    }
  },

  logout: async () => {
    try { await authAPI.logout(); } catch { /* ignore */ }
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.ACCESS_TOKEN,
      STORAGE_KEYS.REFRESH_TOKEN,
      STORAGE_KEYS.USER,
    ]);
    set({ user: null, accessToken: null, isAuthenticated: false, error: null });
  },

  loadFromStorage: async () => {
    set({ isLoading: true });
    try {
      const [token, userStr] = await AsyncStorage.multiGet([
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.USER,
      ]);
      const accessToken = token[1];
      const user = userStr[1] ? JSON.parse(userStr[1]) : null;

      if (accessToken && user) {
        set({ accessToken, user, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  clearError: () => set({ error: null }),

  hasRole: (code: string) => {
    const { user } = get();
    return user?.roles?.some(r => r.code === code) ?? false;
  },

  hasPermission: (_permission: string) => {
    // Simplified for mobile — full permission check is on backend
    const { user } = get();
    return !!user;
  },
}));
