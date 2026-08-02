import { useNotificationContext } from '../contexts/NotificationContext';
import { requestNotificationPermission, showNotification, NotificationPayload } from '../utils/notificationUtils';

/**
 * Primary React Hook to access notification state, FCM token, inbox notifications, sound options,
 * and permission management methods.
 */
export function useNotifications() {
  return useNotificationContext();
}

/**
 * Lightweight Hook specifically for FCM Token generation & permission handling.
 */
export function useFcmToken() {
  const { fcmToken, permission, requestPermission, isLoading } = useNotificationContext();

  return {
    fcmToken,
    permission,
    requestPermission,
    isLoading,
    isPermissionGranted: permission === 'granted',
    isPermissionDenied: permission === 'denied',
  };
}

/**
 * Standalone hook to manually trigger native desktop notifications without requiring context
 */
export function useNativeNotification() {
  const trigger = async (payload: NotificationPayload) => {
    await showNotification(payload);
  };

  const request = async () => {
    return await requestNotificationPermission();
  };

  return {
    triggerNotification: trigger,
    requestPermission: request,
  };
}
