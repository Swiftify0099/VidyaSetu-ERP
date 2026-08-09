/**
 * VidyaSetu ERP — Notification Service
 * ========================================
 * Dedicated frontend service for the new Notification inbox system.
 * Separate from communicationService (which handles outgoing SMS/email/push logs).
 */
import api from './api';
import {
  showNotification,
  requestNotificationPermission,
  playNotificationSound,
  NotificationPayload,
} from '../utils/notificationUtils';

declare global {
  interface Window {
    _fcmForegroundListenerAttached?: boolean;
  }
}

// VAPID key from Firebase Console → Project Settings → Cloud Messaging → Web Push certificates
// If this is not set, FCM token generation will be skipped.
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;

export interface AppNotification {
  id: number;
  sender_id?: number;
  sender_role?: string;
  recipient_id?: number;
  recipient_role?: string;
  category: string;
  notification_type: string;
  priority: 'critical' | 'high' | 'medium' | 'low' | 'silent';
  title: string;
  body: string;
  reference_module?: string;
  reference_id?: string;
  action_url?: string;
  channel: string;
  fcm_message_id?: string;
  delivered_at?: string;
  is_read: boolean;
  read_at?: string;
  seen_at?: string;
  clicked_at?: string;
  expires_at?: string;
  created_at?: string;
}

/** @deprecated Use AppNotification instead */
export type Notification = AppNotification;

export interface NotificationCenterData {
  notifications: AppNotification[];
  total: number;
  unread_count: number;
  category_breakdown: Record<string, number>;
  priority_breakdown: Record<string, number>;
}

export interface NotificationFilters {
  limit?: number;
  offset?: number;
  category?: string;
  priority?: string;
  unread_only?: boolean;
  search?: string;
  date_from?: string;
  date_to?: string;
}

const notificationService = {
  /**
   * Get notification inbox (for Topbar bell dropdown)
   * Role-filtered, sorted by priority then unread
   */
  async getNotifications(filters?: NotificationFilters): Promise<AppNotification[]> {
    const res = await api.get('/communication/notifications', { params: filters });
    return res.data.data ?? [];
  },

  /**
   * Fast unread count for badge. Poll this instead of full list.
   */
  async getUnreadCount(): Promise<number> {
    const res = await api.get('/communication/notifications/unread-count');
    return res.data.data?.unread_count ?? 0;
  },

  /**
   * Full notification center with search, filter, analytics
   */
  async getCenter(filters?: NotificationFilters): Promise<NotificationCenterData> {
    const res = await api.get('/communication/notifications/center', { params: filters });
    return res.data.data;
  },

  /**
   * Mark a single notification as read
   */
  async markRead(id: number): Promise<void> {
    await api.post(`/communication/notifications/${id}/read`);
  },

  /**
   * Track click — marks read AND records click_at for analytics
   */
  async markClicked(id: number): Promise<void> {
    await api.post(`/communication/notifications/${id}/clicked`);
  },

  /**
   * Mark all visible notifications as read
   */
  async markAllRead(): Promise<void> {
    await api.post('/communication/notifications/read-all');
  },

  /**
   * Delete / archive a notification
   */
  async deleteNotification(id: number): Promise<void> {
    await api.delete(`/communication/notifications/${id}`);
  },

  /**
   * Admin: get analytics (delivery rate, read rate, click rate)
   */
  async getAnalytics(): Promise<Record<string, number>> {
    const res = await api.get('/communication/notifications/analytics');
    return res.data.data;
  },

  /**
   * Register/refresh FCM device token for push notifications
   */
  async registerFcmToken(fcmToken: string): Promise<void> {
    await api.post('/communication/notifications/fcm-token', null, {
      params: { fcm_token: fcmToken },
    });
  },

  /**
   * Get cached FCM token from localStorage
   */
  getCachedFcmToken(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem('vidyasetu_fcm_token');
  },

  /**
   * Initialize FCM for the browser:
   * 1. Checks messaging support
   * 2. Requests notification permission
   * 3. Registers service worker and waits for active state
   * 4. Gets FCM token via Firebase Messaging SDK
   * 5. Sets up foreground push message listener (onMessage)
   * 6. Registers token with the backend
   */
  async initFcmToken(): Promise<string | null> {
    try {
      const { isSupported } = await import('firebase/messaging');
      const supported = await isSupported();
      if (!supported) {
        console.warn('[FCM] Firebase Messaging not supported in this browser.');
        return null;
      }

      // Check browser notification permission
      const permission = await requestNotificationPermission();
      if (permission !== 'granted') {
        console.warn('[FCM] Notification permission not granted. FCM token generation deferred.');
        return null;
      }

      if (!VAPID_KEY) {
        console.error('[FCM] VITE_FIREBASE_VAPID_KEY is not set in .env. Cannot generate FCM token.');
        console.info('[FCM] Get it from: Firebase Console → Project Settings → Cloud Messaging → Web Push certificates');
        return null;
      }

      const { getMessaging, getToken, onMessage } = await import('firebase/messaging');
      const { app: firebaseApp } = await import('../config/firebase');
      if (!firebaseApp) {
        console.warn('[FCM] Firebase client configuration is not available.');
        return null;
      }
      const messaging = getMessaging(firebaseApp);

      // Register Service Worker and wait for active ready state
      await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      const swReg = await navigator.serviceWorker.ready;

      const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: swReg });

      if (token) {
        console.log('[FCM] ✅ Token generated:', token.substring(0, 25) + '...');
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('vidyasetu_fcm_token', token);
        }
        await api.post('/communication/notifications/fcm-token', null, { params: { fcm_token: token } });
        console.log('[FCM] ✅ Token registered with backend successfully.');

        // Setup Foreground Push Message Listener (handles messages when app tab is OPEN & ACTIVE)
        if (!window._fcmForegroundListenerAttached) {
          window._fcmForegroundListenerAttached = true;
          onMessage(messaging, (payload) => {
            console.log('[FCM] 🔔 Foreground message received:', payload);
            
            // Trigger native desktop notification with audio sound, deduplication, and click handler
            showNotification(payload as NotificationPayload);

            // Dispatch custom event for UI components (Topbar bell, Inbox list, etc.)
            window.dispatchEvent(new CustomEvent('fcm-message-received', { detail: payload }));
          });
        }

        return token;
      } else {
        console.warn('[FCM] No token returned. Check VAPID key and service worker registration.');
        return null;
      }
    } catch (err) {
      console.error('[FCM] Error initializing FCM token:', err);
      return null;
    }
  },

  /**
   * Priority → CSS class name map for color coding
   */
  getPriorityClass(priority: string): string {
    const map: Record<string, string> = {
      critical: 'priorityCritical',
      high: 'priorityHigh',
      medium: 'priorityMedium',
      low: 'priorityLow',
      silent: 'prioritySilent',
    };
    return map[priority] ?? 'priorityMedium';
  },

  /**
   * Category icon indicator label
   */
  getCategoryIcon(category: string): string {
    const map: Record<string, string> = {
      attendance: 'Attendance',
      exam: 'Exam',
      fee: 'Fee',
      leave: 'Leave',
      library: 'Library',
      security: 'Security',
      system: 'System',
      homework: 'Homework',
      certificate: 'Certificate',
      behaviour: 'Behaviour',
      transport: 'Transport',
      notice: 'Notice',
      birthday: 'Birthday',
      admission: 'Admission',
    };
    return map[category] ?? 'Notification';
  },

  /**
   * Request native system browser notification permission for live desktop popups
   */
  async requestSystemNotificationPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  },

  /**
   * Display a live system desktop pop-up notification banner on device OS notification shade / Windows toast
   */
  async showSystemNotification(title: string, body: string, actionUrl?: string): Promise<void> {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const options: NotificationOptions = {
      body: body || '',
      icon: '/icon.png',
      badge: '/icon.png',
      requireInteraction: true,
      data: { url: actionUrl || '/' },
    };

    try {
      // 1. Try ServiceWorker Registration (required on Chrome Android & PWA desktop for native OS notification shade/toast)
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        if (reg && reg.showNotification) {
          await reg.showNotification(title, options);
          return;
        }
      }

      // 2. Fallback to window.Notification constructor if Service Worker ready is not present
      const notif = new window.Notification(title, options);
      notif.onclick = () => {
        window.focus();
        if (actionUrl) {
          window.location.href = actionUrl;
        }
        notif.close();
      };
    } catch (err) {
      console.warn('[FCM] System notification popup error:', err);
    }
  },

  /**
   * Format relative time (e.g. "2 minutes ago", "Yesterday")
   */
  formatRelativeTime(dateString?: string): string {
    if (!dateString) return 'Just now';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const secs = Math.floor(diff / 1000);
    const mins = Math.floor(secs / 60);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (secs < 60) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  },
};

export default notificationService;
