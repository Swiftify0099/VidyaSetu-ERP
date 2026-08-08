import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import notificationService, { AppNotification } from '../services/notificationService';
import {
  requestNotificationPermission,
  showNotification,
  playNotificationSound,
  NotificationPayload,
  handleNotificationClick,
} from '../utils/notificationUtils';
import FCMNotificationToast, { FCMToastData } from '../components/notifications/FCMNotificationToast';

export interface NotificationContextType {
  fcmToken: string | null;
  permission: NotificationPermission;
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  soundEnabled: boolean;
  activeToasts: FCMToastData[];
  requestPermission: () => Promise<NotificationPermission>;
  refreshNotifications: () => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  toggleSound: () => void;
  triggerNativeNotification: (payload: NotificationPayload) => Promise<void>;
  triggerToastNotification: (toast: Omit<FCMToastData, 'id'>) => void;
  dismissToast: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [fcmToken, setFcmToken] = useState<string | null>(notificationService.getCachedFcmToken());
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeToasts, setActiveToasts] = useState<FCMToastData[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    if (typeof localStorage === 'undefined') return true;
    return localStorage.getItem('vidyasetu_notif_sound') !== 'disabled';
  });

  const refreshNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const items = await notificationService.getNotifications({ limit: 15 });
      setNotifications(items);
      const count = items.filter((n) => !n.is_read).length;
      setUnreadCount(count);
    } catch (err) {
      console.warn('[NotificationContext] Failed to load inbox notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const triggerToastNotification = useCallback(
    (toastData: Omit<FCMToastData, 'id'>) => {
      const newToast: FCMToastData = {
        ...toastData,
        id: `toast_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      };
      if (soundEnabled) {
        playNotificationSound();
      }
      setActiveToasts((prev) => [newToast, ...prev].slice(0, 4)); // Max 4 visible toasts
    },
    [soundEnabled]
  );

  const dismissToast = useCallback((id: string) => {
    setActiveToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const initFcm = useCallback(async () => {
    if (typeof window === 'undefined') return;
    try {
      const token = await notificationService.initFcmToken();
      if (token) {
        setFcmToken(token);
      }
      if ('Notification' in window) {
        setPermission(Notification.permission);
      }
    } catch (err) {
      console.error('[NotificationContext] Error initializing FCM:', err);
    }
  }, []);

  const handlePermissionRequest = useCallback(async (): Promise<NotificationPermission> => {
    const result = await requestNotificationPermission();
    setPermission(result);
    if (result === 'granted') {
      await initFcm();
    }
    return result;
  }, [initFcm]);

  const markAsRead = useCallback(async (id: number) => {
    try {
      await notificationService.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('[NotificationContext] Failed to mark notification as read:', err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() })));
      setUnreadCount(0);
    } catch (err) {
      console.error('[NotificationContext] Failed to mark all notifications as read:', err);
    }
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('vidyasetu_notif_sound', next ? 'enabled' : 'disabled');
      }
      return next;
    });
  }, []);

  const triggerNativeNotification = useCallback(
    async (payload: NotificationPayload) => {
      if (soundEnabled) {
        playNotificationSound();
      }
      await showNotification(payload);
    },
    [soundEnabled]
  );

  // Set up initial load and listeners
  useEffect(() => {
    const hasToken = typeof localStorage !== 'undefined' && !!localStorage.getItem('vidyasetu_access_token');
    if (hasToken) {
      initFcm();
      refreshNotifications();
    }

    // Listen for FCM foreground messages received event
    const handleFcmMessage = (event: Event) => {
      const customEvent = event as CustomEvent<NotificationPayload>;
      const payload = customEvent.detail;
      console.log('[NotificationContext] Live FCM event received in Context:', payload);

      const title = payload?.notification?.title || payload?.data?.title || 'New Push Notification';
      const body = payload?.notification?.body || payload?.data?.body || '';
      const category = payload?.data?.category || 'notice';
      const priority = payload?.data?.priority || 'medium';
      const actionUrl = payload?.data?.url || payload?.data?.action_url || '/notifications';
      const imageUrl = payload?.notification?.image || payload?.data?.image || payload?.data?.image_url;

      // DUAL-MODE ROUTING:
      // If user is IN APP (foreground/visible tab) -> show in-app overlay notification card
      // If user is OUTSIDE APP (background tab / minimized) -> trigger native system OS notification shade
      if (document.hidden) {
        showNotification(payload);
      } else {
        triggerToastNotification({
          title,
          body,
          category,
          priority,
          actionUrl,
          imageUrl,
        });
      }

      refreshNotifications();
    };

    window.addEventListener('fcm-message-received', handleFcmMessage);

    // Listen for Service Worker postMessages (background/foreground clicks & actions)
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== 'object') return;
      const { type, url, notificationId } = event.data;

      if (type === 'FCM_NOTIFICATION_CLICKED' && url) {
        console.log('[NotificationContext] SW Click message received for URL:', url);
        handleNotificationClick(url);
      } else if (type === 'MARK_NOTIFICATION_READ' && notificationId) {
        markAsRead(Number(notificationId));
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }

    return () => {
      window.removeEventListener('fcm-message-received', handleFcmMessage);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  }, [initFcm, refreshNotifications, soundEnabled, markAsRead, triggerToastNotification]);

  return (
    <NotificationContext.Provider
      value={{
        fcmToken,
        permission,
        notifications,
        unreadCount,
        isLoading,
        soundEnabled,
        activeToasts,
        requestPermission: handlePermissionRequest,
        refreshNotifications,
        markAsRead,
        markAllAsRead,
        toggleSound,
        triggerNativeNotification,
        triggerToastNotification,
        dismissToast,
      }}
    >
      {children}
      <FCMNotificationToast
        toasts={activeToasts}
        onDismiss={dismissToast}
        onMarkRead={markAsRead}
      />
    </NotificationContext.Provider>
  );
};

export const useNotificationContext = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
};
