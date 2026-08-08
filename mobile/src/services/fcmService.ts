/**
 * VidyaSetu Mobile — FCM Service (React Native)
 * ================================================
 * Manages Firebase Cloud Messaging token lifecycle for the mobile app.
 * Uses @react-native-firebase/messaging (already in package.json).
 *
 * Usage:
 *   import mobileFcmService from '../services/fcmService';
 *
 *   // After login — register token
 *   await mobileFcmService.init();
 *
 *   // On logout — unregister token
 *   await mobileFcmService.unregisterCurrentToken();
 */
import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Alert } from 'react-native';
import { api } from './api';

// ── Storage key for cached FCM token ─────────────────────────
const FCM_TOKEN_KEY = 'vs_fcm_token';

// ── Types ─────────────────────────────────────────────────────

export interface FCMDeviceInfo {
  device_type: 'android' | 'ios' | 'web';
  platform?: string;
  browser?: string;
  os?: string;
  device_name?: string;
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

// ── Device info helper ────────────────────────────────────────

function getDeviceInfo(): FCMDeviceInfo {
  const device_type = Platform.OS === 'ios' ? 'ios' : 'android';
  const os = `${Platform.OS === 'ios' ? 'iOS' : 'Android'} ${Platform.Version}`;
  const platform = Platform.OS;
  const device_name = `${platform} Device`;

  return { device_type, platform, os, device_name };
}

// ── Mobile FCM Service ────────────────────────────────────────

const mobileFcmService = {
  /**
   * Get cached token from AsyncStorage.
   */
  async getCachedToken(): Promise<string | null> {
    return AsyncStorage.getItem(FCM_TOKEN_KEY);
  },

  /**
   * Cache token in AsyncStorage.
   */
  async cacheToken(token: string): Promise<void> {
    await AsyncStorage.setItem(FCM_TOKEN_KEY, token);
  },

  /**
   * Clear cached token.
   */
  async clearCachedToken(): Promise<void> {
    await AsyncStorage.removeItem(FCM_TOKEN_KEY);
  },

  /**
   * Full FCM initialization for mobile:
   * 1. Request notification permission (iOS requires explicit request)
   * 2. Get FCM registration token
   * 3. Register token with backend
   * 4. Set up foreground and background message handlers
   * 5. Handle token refresh
   *
   * @returns FCM token string, or null if permission denied
   */
  async init(): Promise<string | null> {
    try {
      // Step 1 — Request permission (required on iOS; Android grants by default)
      const granted = await this.requestPermission();
      if (!granted) {
        console.warn('[FCM Mobile] Notification permission denied.');
        return null;
      }

      // Step 2 — Get FCM token
      const token = await messaging().getToken();
      if (!token) {
        console.warn('[FCM Mobile] Could not get FCM token.');
        return null;
      }

      console.log('[FCM Mobile] ✅ Token generated:', token.substring(0, 30) + '...');

      // Step 3 — Cache and register with backend
      await this.cacheToken(token);
      await this.registerToken(token);

      // Step 4 — Set up message handlers
      this._attachMessageHandlers();

      // Step 5 — Listen for token refresh
      this._watchTokenRefresh();

      return token;
    } catch (err) {
      console.error('[FCM Mobile] Init error:', err);
      return null;
    }
  },

  /**
   * Request notification permission.
   * - Android 13+: requires explicit permission
   * - iOS: always requires explicit permission
   * Returns true if permission granted.
   */
  async requestPermission(): Promise<boolean> {
    try {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      console.log(`[FCM Mobile] Permission status: ${authStatus} (enabled: ${enabled})`);
      return enabled;
    } catch (err) {
      console.error('[FCM Mobile] Permission request error:', err);
      return false;
    }
  },

  /**
   * Register the FCM token with the VidyaSetu backend.
   * Sends device metadata for the device management panel.
   */
  async registerToken(token: string): Promise<void> {
    const deviceInfo = getDeviceInfo();
    try {
      await api.post('/fcm/register', {
        fcm_token: token,
        ...deviceInfo,
      });
      console.log('[FCM Mobile] ✅ Token registered with backend.');
    } catch (err) {
      console.error('[FCM Mobile] Failed to register token:', err);
    }
  },

  /**
   * Unregister the current device's FCM token (on logout).
   */
  async unregisterCurrentToken(): Promise<void> {
    const token = await this.getCachedToken();
    if (!token) return;

    try {
      await api.delete('/fcm/unregister', { data: { fcm_token: token } });
      console.log('[FCM Mobile] ✅ Token unregistered from backend.');
    } catch (err) {
      console.warn('[FCM Mobile] Failed to unregister token:', err);
    } finally {
      await this.clearCachedToken();
      // Also delete from Firebase SDK
      try {
        await messaging().deleteToken();
      } catch {
        // ignore
      }
    }
  },

  /**
   * Unregister all tokens for this user (logout-all).
   */
  async unregisterAllTokens(): Promise<void> {
    try {
      await api.delete('/fcm/unregister-all');
      console.log('[FCM Mobile] ✅ All tokens unregistered.');
    } catch (err) {
      console.warn('[FCM Mobile] Failed to unregister all tokens:', err);
    } finally {
      await this.clearCachedToken();
    }
  },

  /**
   * Get all registered devices for the current user.
   */
  async getMyDevices() {
    const res = await api.get('/fcm/tokens');
    return res.data.data ?? [];
  },

  // ── Admin send helpers ──────────────────────────────────────

  async sendToUser(userId: number, payload: SendNotificationPayload): Promise<NotificationSendResult> {
    const res = await api.post(`/fcm/send/user/${userId}`, payload);
    return res.data.data;
  },

  async sendToUsers(payload: SendToUsersPayload): Promise<NotificationSendResult> {
    const res = await api.post('/fcm/send/users', payload);
    return res.data.data;
  },

  async broadcast(payload: SendNotificationPayload): Promise<NotificationSendResult> {
    const res = await api.post('/fcm/send/broadcast', payload);
    return res.data.data;
  },

  async sendToRole(roleCode: string, payload: SendNotificationPayload): Promise<NotificationSendResult> {
    const res = await api.post(`/fcm/send/role/${roleCode}`, payload);
    return res.data.data;
  },

  async sendToTopic(topic: string, payload: SendNotificationPayload): Promise<NotificationSendResult> {
    const res = await api.post(`/fcm/send/topic/${topic}`, payload);
    return res.data.data;
  },

  // ── Internal handlers ────────────────────────────────────────

  /**
   * Attach foreground + background notification handlers.
   * These are app-level — must be called once at startup.
   */
  _attachMessageHandlers(): void {
    // ── Foreground messages (app is open) ──────────────────────
    // Note: react-native-firebase shows an in-app alert for foreground messages
    // by default. You can customize this behavior here.
    messaging().onMessage(async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
      console.log('[FCM Mobile] 🔔 Foreground message:', remoteMessage);

      const title = remoteMessage.notification?.title ?? remoteMessage.data?.title ?? 'VidyaSetu ERP';
      const body = remoteMessage.notification?.body ?? remoteMessage.data?.body ?? '';

      // Show an in-app Alert for foreground messages
      // In production, replace this with a toast notification component
      Alert.alert(title, body);
    });

    // ── Background / Quit state messages ──────────────────────
    // These are handled natively by the device OS notification system.
    // The onBackgroundMessage handler is registered in index.js (see below).
  },

  /**
   * Watch for FCM token refresh.
   * Called automatically when Firebase rotates the token.
   */
  _watchTokenRefresh(): void {
    messaging().onTokenRefresh(async (newToken: string) => {
      console.log('[FCM Mobile] 🔄 Token refreshed:', newToken.substring(0, 30) + '...');
      await this.cacheToken(newToken);
      await this.registerToken(newToken);
    });
  },
};

export default mobileFcmService;
