import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import authService, { type LoginCredentials, type AuthUser } from '../services/authService';
import { getPortalPath } from '../utils/rolePortals';
import notificationService from '../services/notificationService';
import fcmService from '../services/fcmService';

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (roleCode: string) => boolean;
  isSuperAdmin: () => boolean;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // ── Init: restore session from storage ───────────────────────
  useEffect(() => {
    const initAuth = async () => {
      const storedUser = authService.getStoredUser();
      const token = authService.getAccessToken();

      if (storedUser && token) {
        setUser(storedUser);
        try {
          const freshUser = await authService.getMe();
          setUser(freshUser);
          authService.storeUser(freshUser);
          // Re-initialize FCM on session restore (handles token rotation)
          void fcmService.init();
        } catch (err: any) {
          const status = err?.response?.status;
          if (status === 401 || status === 403) {
            authService.clearStorage();
            setUser(null);
          } else {
            // Keep stored user session so page reloads remain on current tab/route
            setUser(storedUser);
          }
        }
      }
      setIsLoading(false);
    };
    initAuth();
  }, []);

  // ── Login ──────────────────────────────────────────────────────
  const login = useCallback(async (credentials: LoginCredentials) => {
    const response = await authService.login(credentials);
    setUser(response.user);
    // Initialize FCM after login — request permission + register token with backend
    // Runs in background; never blocks the login flow.
    void fcmService.init();
    const roleCode = response.user.roles?.[0]?.code;
    navigate(getPortalPath(roleCode ?? ''), { replace: true });
  }, [navigate]);

  // ── Logout ─────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    // Unregister FCM token BEFORE clearing storage (needs auth token)
    void fcmService.unregisterCurrentToken();
    try { await authService.logout(); } finally {
      setUser(null);
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  const logoutAll = useCallback(async () => {
    try { await authService.logoutAll(); } finally {
      setUser(null);
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  // ── Permission helpers ─────────────────────────────────────────
  const hasPermission = useCallback((permission: string): boolean => {
    if (!user) return false;
    if (user.roles.some(r => r.code === 'super_admin')) return true;
    return user.permissions.includes(permission);
  }, [user]);

  const hasRole = useCallback((roleCode: string): boolean => {
    if (!user) return false;
    return user.roles.some(r => r.code === roleCode);
  }, [user]);

  const isSuperAdmin = useCallback(() => hasRole('super_admin'), [hasRole]);

  const refreshUser = useCallback(async () => {
    try {
      const freshUser = await authService.getMe();
      setUser(freshUser);
      authService.storeUser(freshUser);
    } catch { /* ignore */ }
  }, []);

  return (
    <AuthContext.Provider value={{
      user, isAuthenticated: !!user, isLoading,
      login, logout, logoutAll,
      hasPermission, hasRole, isSuperAdmin, refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
