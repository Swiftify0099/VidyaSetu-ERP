/**
 * VidyaSetu ERP — FCM Service (Web / React)
 * ============================================
 * Manages Firebase Cloud Messaging token lifecycle for the web app.
 *
 * Usage:
 *   import fcmService from '../services/fcmService';
 *
 *   // After login — initialize FCM and register token
 *   await fcmService.init();
 *
 *   // On logout — unregister token
 *   await fcmService.unregisterCurrentToken();
 *
 *   // Get registered devices
 *   const devices = await fcmService.getMyDevices();
 */
import api from './api';

// ── Storage keys ─────────────────────────────────────────────
const FCM_TOKEN_KEY = 'vidyasetu_fcm_token';
const FCM_PERMISSION_DENIED_KEY = 'vidyasetu_fcm_denied';

// ── Env vars ─────────────────────────────────────────────────
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;

// ── Types ─────────────────────────────────────────────────────

export interface FCMDeviceInfo {
  device_type: 'web' | 'android' | 'ios';
  platform?: string;
  browser?: string;
  os?: string;
  device_name?: string;
}

export interface FCMTokenRecord {
  id: number;
  uuid: string;
  user_id: number;
  device_type: string;
  platform?: string;
  browser?: string;
  os?: string;
  device_name?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_used_at?: string;
  token_preview: string;
}

export interface SendNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  image_url?: string;
}

export interface SendToUsersPayload extends SendNotificationPayload {
  user_ids: number[];
}

export interface NotificationSendResult {
  success_count: number;
  failure_count: number;
  invalid_tokens_removed: number;
  message_id?: string;
}

// ── Device detection helpers ─────────────────────────────────

function detectDeviceInfo(): FCMDeviceInfo {
  const ua = navigator.userAgent;
  const platform = navigator.platform ?? 'Unknown';

  // Detect OS
  let os = 'Unknown';
  if (/Windows NT/.test(ua)) os = `Windows ${ua.match(/Windows NT ([\d.]+)/)?.[1] ?? ''}`;
  else if (/Mac OS X/.test(ua)) os = `macOS ${ua.match(/Mac OS X ([\d_]+)/)?.[1]?.replace(/_/g, '.') ?? ''}`;
  else if (/Android/.test(ua)) os = `Android ${ua.match(/Android ([\d.]+)/)?.[1] ?? ''}`;
  else if (/iPhone|iPad/.test(ua)) os = `iOS ${ua.match(/OS ([\d_]+)/)?.[1]?.replace(/_/g, '.') ?? ''}`;
  else if (/Linux/.test(ua)) os = 'Linux';

  // Detect browser
  let browser = 'Unknown';
  if (/Edg\//.test(ua)) browser = `Edge ${ua.match(/Edg\/([\d.]+)/)?.[1] ?? ''}`;
  else if (/Chrome\//.test(ua)) browser = `Chrome ${ua.match(/Chrome\/([\d.]+)/)?.[1] ?? ''}`;
  else if (/Firefox\//.test(ua)) browser = `Firefox ${ua.match(/Firefox\/([\d.]+)/)?.[1] ?? ''}`;
  else if (/Safari\//.test(ua)) browser = `Safari ${ua.match(/Version\/([\d.]+)/)?.[1] ?? ''}`;

  // Detect device_type
  const isMobile = /Mobi|Android|iPhone|iPad/.test(ua);
  const device_type: 'web' | 'android' | 'ios' = 'web';

  // Device name — compose from OS + browser for web
  const device_name = `${browser} on ${os}`;

  return { device_type, platform, browser: browser.trim(), os: os.trim(), device_name };
}

// ── Core FCM Service object ──────────────────────────────────

const fcmService = {
  /**
   * Get the cached FCM token from localStorage.
   */
  getCachedToken(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(FCM_TOKEN_KEY);
  },

  /**
   * Store the token in localStorage.
   */
  cacheToken(token: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(FCM_TOKEN_KEY, token);
    }
  },

  /**
   * Clear the locally cached token.
   */
  clearCachedToken(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(FCM_TOKEN_KEY);
    }
  },

  /**
   * Check if the user has previously denied permission.
   * We store this flag to avoid showing the prompt again.
   */
  isPermissionDenied(): boolean {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(FCM_PERMISSION_DENIED_KEY) === 'true';
  },

  /**
   * Full FCM initialization flow:
   * 1. Check messaging support
   * 2. Request notification permission (if not denied before)
   * 3. Register the service worker
   * 4. Generate the FCM token via Firebase
   * 5. Register the token with the backend
   * 6. Set up foreground message listener
   * 7. Set up token refresh listener
   *
   * @returns The FCM token string, or null if unavailable
   */
  async init(): Promise<string | null> {
    try {
      // Step 1 — Check browser support
      const { isSupported } = await import('firebase/messaging');
      const supported = await isSupported();
      if (!supported) {
        console.warn('[FCM] Firebase Messaging is not supported in this browser.');
        return null;
      }

      // Step 2 — Request notification permission
      if (Notification.permission === 'denied' || this.isPermissionDenied()) {
        console.warn('[FCM] Notification permission denied by user. Skipping FCM init.');
        return null;
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('[FCM] Notification permission not granted.');
        if (permission === 'denied') {
          localStorage.setItem(FCM_PERMISSION_DENIED_KEY, 'true');
        }
        return null;
      }

      // Step 3 — Validate VAPID key
      if (!VAPID_KEY) {
        console.error(
          '[FCM] VITE_FIREBASE_VAPID_KEY is missing from .env\n' +
          '→ Get it from Firebase Console → Project Settings → Cloud Messaging → Web Push certificates'
        );
        return null;
      }

      // Step 4 — Import Firebase app and messaging
      const { getMessaging, getToken, onMessage, deleteToken } = await import('firebase/messaging');
      const { app: firebaseApp } = await import('../config/firebase');

      if (!firebaseApp) {
        console.warn('[FCM] Firebase app is not initialized. Check VITE_FIREBASE_* env vars.');
        return null;
      }

      const messaging = getMessaging(firebaseApp);

      // Step 5 — Register service worker (wait for it to become active)
      let swRegistration: ServiceWorkerRegistration | undefined;
      if ('serviceWorker' in navigator) {
        try {
          swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
            scope: '/',
          });
          // Wait for service worker to become active
          await navigator.serviceWorker.ready;
          console.log('[FCM] ✅ Service worker registered and active.');
        } catch (swErr) {
          console.warn('[FCM] Service worker registration failed:', swErr);
          // Continue without SW — FCM still works for foreground
        }
      }

      // Step 6 — Get the FCM registration token
      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: swRegistration,
      });

      if (!token) {
        console.warn('[FCM] No token returned. Check VAPID key and service worker.');
        return null;
      }

      console.log('[FCM] ✅ Token generated:', token.substring(0, 30) + '...');

      // Step 7 — Cache token locally
      this.cacheToken(token);

      // Step 8 — Register token with backend
      await this.registerToken(token);

      // Step 9 — Set up foreground message listener (only once per session)
      this._attachForegroundListener(messaging, onMessage);

      // Step 10 — Handle token refresh
      // The Firebase SDK refreshes the token automatically. We watch for it
      // by calling getToken() again. For continuous refresh detection,
      // re-call init() on each app focus (done in AuthContext).
      this._watchTokenRefresh(messaging, getToken, deleteToken);

      return token;
    } catch (err) {
      console.error('[FCM] Initialization error:', err);
      return null;
    }
  },

  /**
   * Register an FCM token with the backend.
   * Sends device metadata along with the token for the device list feature.
   */
  async registerToken(token: string): Promise<void> {
    const deviceInfo = detectDeviceInfo();
    try {
      await api.post('/fcm/register', {
        fcm_token: token,
        ...deviceInfo,
      });
      console.log('[FCM] ✅ Token registered with backend.');
    } catch (err) {
      console.error('[FCM] Failed to register token with backend:', err);
    }
  },

  /**
   * Unregister the current device's FCM token.
   * Call this on logout to stop receiving push notifications.
   */
  async unregisterCurrentToken(): Promise<void> {
    const token = this.getCachedToken();
    if (!token) return;

    try {
      await api.delete('/fcm/unregister', { data: { fcm_token: token } });
      console.log('[FCM] ✅ Token unregistered from backend.');
    } catch (err) {
      console.warn('[FCM] Failed to unregister token:', err);
    } finally {
      this.clearCachedToken();
      // Also delete from Firebase SDK side
      try {
        const { getMessaging, deleteToken: fbDeleteToken } = await import('firebase/messaging');
        const { app: firebaseApp } = await import('../config/firebase');
        if (firebaseApp) {
          await fbDeleteToken(getMessaging(firebaseApp));
        }
      } catch {
        // ignore cleanup errors
      }
    }
  },

  /**
   * Unregister ALL tokens for the current user (call on logout-all).
   */
  async unregisterAllTokens(): Promise<void> {
    try {
      await api.delete('/fcm/unregister-all');
      console.log('[FCM] ✅ All tokens unregistered.');
    } catch (err) {
      console.warn('[FCM] Failed to unregister all tokens:', err);
    } finally {
      this.clearCachedToken();
    }
  },

  /**
   * Get all registered devices for the current user.
   */
  async getMyDevices(): Promise<FCMTokenRecord[]> {
    const res = await api.get('/fcm/tokens');
    return res.data.data ?? [];
  },

  // ── Admin send helpers ──────────────────────────────────────

  /** Admin: send to a single user */
  async sendToUser(userId: number, payload: SendNotificationPayload): Promise<NotificationSendResult> {
    const res = await api.post(`/fcm/send/user/${userId}`, payload);
    return res.data.data;
  },

  /** Admin: send to multiple users */
  async sendToUsers(payload: SendToUsersPayload): Promise<NotificationSendResult> {
    const res = await api.post('/fcm/send/users', payload);
    return res.data.data;
  },

  /** Admin: broadcast to everyone */
  async broadcast(payload: SendNotificationPayload): Promise<NotificationSendResult> {
    const res = await api.post('/fcm/send/broadcast', payload);
    return res.data.data;
  },

  /** Admin: send by role code */
  async sendToRole(roleCode: string, payload: SendNotificationPayload): Promise<NotificationSendResult> {
    const res = await api.post(`/fcm/send/role/${roleCode}`, payload);
    return res.data.data;
  },

  /** Admin: send to FCM topic */
  async sendToTopic(topic: string, payload: SendNotificationPayload): Promise<NotificationSendResult> {
    const res = await api.post(`/fcm/send/topic/${topic}`, payload);
    return res.data.data;
  },

  /** Admin: send to a class */
  async sendToClass(classId: number, payload: SendNotificationPayload): Promise<NotificationSendResult> {
    const res = await api.post(`/fcm/send/class/${classId}`, payload);
    return res.data.data;
  },

  /** Admin: get notification history logs */
  async getLogs(params?: { limit?: number; offset?: number; user_id?: number; delivery_status?: string }) {
    const res = await api.get('/fcm/logs', { params });
    return res.data.data ?? [];
  },

  /** Admin: get all registered devices */
  async getAllDevices(params?: { limit?: number; offset?: number; user_id?: number; device_type?: string }) {
    const res = await api.get('/fcm/admin/devices', { params });
    return res.data.data ?? [];
  },

  // ── Internal helpers ─────────────────────────────────────────

  /**
   * Attach the foreground message handler.
   * Only attaches once per session — guarded by a window flag.
   */
  _attachForegroundListener(messaging: any, onMessage: any): void {
    if ((window as any)._fcmForegroundListenerAttached) return;
    (window as any)._fcmForegroundListenerAttached = true;

    onMessage(messaging, (payload: any) => {
      console.log('[FCM] 🔔 Foreground message received:', payload);

      // Show native desktop notification
      const title = payload.notification?.title ?? payload.data?.title ?? 'New Notification';
      const body = payload.notification?.body ?? payload.data?.body ?? '';
      const actionUrl = payload.data?.url ?? payload.fcmOptions?.link ?? '/';

      if (Notification.permission === 'granted') {
        try {
          // Prefer service worker notification (persistent, shown in OS notification shade)
          navigator.serviceWorker.ready.then(reg => {
            reg.showNotification(title, {
              body,
              icon: '/icon.png',
              badge: '/icon.png',
              data: { url: actionUrl },
              requireInteraction: false,
            });
          }).catch(() => {
            // Fallback to browser notification
            new Notification(title, { body, icon: '/icon.png' });
          });
        } catch {
          // Last-resort fallback
          new Notification(title, { body });
        }
      }

      // Dispatch event so UI components (Topbar bell, inbox) can react
      window.dispatchEvent(new CustomEvent('fcm-message-received', { detail: payload }));
    });
  },

  /**
   * Periodically check if the FCM token has changed (rotation).
   * Re-registers with the backend if a new token is detected.
   */
  _watchTokenRefresh(messaging: any, getToken: any, deleteToken: any): void {
    // Re-check token every 7 days using a lazy approach:
    // On next app startup, the token is fetched fresh from Firebase.
    // If it differs from the cached one, we re-register automatically.
    const cachedToken = this.getCachedToken();
    if (!cachedToken) return;

    getToken(messaging, { vapidKey: VAPID_KEY }).then((freshToken: string) => {
      if (freshToken && freshToken !== cachedToken) {
        console.log('[FCM] 🔄 Token rotated — re-registering with backend.');
        this.cacheToken(freshToken);
        this.registerToken(freshToken).catch(console.error);
      }
    }).catch(console.warn);
  },
};

export default fcmService;
