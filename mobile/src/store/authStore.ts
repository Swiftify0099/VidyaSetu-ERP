import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, authAPI, STORAGE_KEYS } from '../services/api';
import mobileFcmService from '../services/fcmService';
import { buildMobileDeviceContext } from '../services/deviceService';

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

  login: (username: string, password: string, navigation?: any) => Promise<void>;
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

  login: async (username: string, password: string, navigation?: any) => {
    set({ isLoading: true, error: null });
    try {
      // Build device context — sends installation ID, platform, OS version.
      // Never contains IMEI, MAC address, or other hardware identifiers.
      const deviceContext = await buildMobileDeviceContext();

      const res = await api.post('/auth/login', {
        username,
        password,
        ...deviceContext,
      });

      const responseData = res.data?.data ?? res.data;

      // ── HTTP 202: New device detected — verification email sent ──
      // Backend returns 202 with requires_verification=true and login_attempt_id.
      // Navigate to the DeviceVerification screen to wait for email approval.
      if (res.status === 202 || responseData?.requires_verification) {
        set({ isLoading: false });
        const loginAttemptId = responseData?.login_attempt_id ?? '';
        if (navigation) {
          navigation.navigate('DeviceVerification', { loginAttemptId });
        }
        return;
      }

      // ── HTTP 200: Normal successful login ──
      const { access_token, refresh_token, user } = responseData;

      const itemsToSave: [string, string][] = [
        [STORAGE_KEYS.ACCESS_TOKEN, access_token],
        [STORAGE_KEYS.USER,         JSON.stringify(user)],
      ];
      if (refresh_token) {
        itemsToSave.push([STORAGE_KEYS.REFRESH_TOKEN, refresh_token]);
      }

      await AsyncStorage.multiSet(itemsToSave);

      set({
        user,
        accessToken: access_token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      // Initialize FCM after successful login — fire-and-forget
      mobileFcmService.init().catch(console.warn);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string; message?: string }; status?: number }; message?: string; code?: string };
      const responseData = axiosErr?.response?.data;
      const status = axiosErr?.response?.status;
      const rawMsg = axiosErr?.message ?? '';

      let msg: string;
      if (!axiosErr.response) {
        // Pure network error — no response received
        msg = rawMsg || 'Network Error: Cannot reach the server.\n\nMake sure your phone and PC are on the same WiFi, and the backend is running.';
      } else if (status === 401 || status === 403) {
        msg = responseData?.detail ?? responseData?.message ?? 'Invalid username or password.';
      } else if (status === 422) {
        msg = 'Invalid input. Please check your username and password.';
      } else {
        msg = responseData?.detail ?? responseData?.message ?? rawMsg ?? 'Login failed. Please try again.';
      }
      set({ isLoading: false, error: msg, isAuthenticated: false });
    }
  },

  logout: async () => {
    // Unregister FCM token before clearing storage (needs auth token)
    mobileFcmService.unregisterCurrentToken().catch(console.warn);
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
        mobileFcmService.init().catch(console.warn);
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
