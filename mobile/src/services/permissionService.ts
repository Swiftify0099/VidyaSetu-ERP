/**
 * VidyaSetu Mobile — Permission Management Service
 * ===================================================
 * Centralized service to handle runtime permission requests on Android and iOS:
 * - Notifications (POST_NOTIFICATIONS / Firebase Push)
 * - Camera (QR attendance, ID card scanning, profile photos)
 * - Media / Storage (Attachments, receipts, report cards)
 */
import { PermissionsAndroid, Platform, Permission } from 'react-native';
import messaging from '@react-native-firebase/messaging';

export interface PermissionStatusResult {
  notifications: boolean;
  camera: boolean;
  storage: boolean;
}

class PermissionService {
  /**
   * Request Notification Permission
   * - Android 13+ (API 33+): Explicit POST_NOTIFICATIONS runtime permission
   * - iOS / Firebase Messaging: System prompt for remote notifications
   */
  async requestNotificationPermission(): Promise<boolean> {
    try {
      let androidGranted = true;

      if (Platform.OS === 'android' && Platform.Version >= 33) {
        const postNotifPermission = 'android.permission.POST_NOTIFICATIONS' as Permission;
        const hasPermission = await PermissionsAndroid.check(postNotifPermission);

        if (!hasPermission) {
          const status = await PermissionsAndroid.request(postNotifPermission, {
            title: 'Enable Notifications',
            message: 'VidyaSetu needs notification permission to send you real-time school alerts, exam results, timetable changes, and fee reminders.',
            buttonNeutral: 'Ask Later',
            buttonNegative: 'Deny',
            buttonPositive: 'Allow',
          });
          androidGranted = status === PermissionsAndroid.RESULTS.GRANTED;
        }
      }

      // Also request Firebase Cloud Messaging permission (essential for iOS & token generation)
      const authStatus = await messaging().requestPermission();
      const fcmEnabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      console.log(`[PermissionService] Notifications status: Android=${androidGranted}, FCM=${fcmEnabled}`);
      return androidGranted && fcmEnabled;
    } catch (error) {
      console.warn('[PermissionService] Failed to request notification permission:', error);
      return false;
    }
  }

  /**
   * Request Camera Permission
   * Required for QR Attendance scanning, library barcode scanning, and profile photo capture.
   */
  async requestCameraPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        const hasPermission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
        if (hasPermission) return true;

        const status = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Access Needed',
            message: 'VidyaSetu requires camera access to scan QR attendance codes, digital ID passes, and capture student/staff photos.',
            buttonNeutral: 'Ask Later',
            buttonNegative: 'Deny',
            buttonPositive: 'Allow',
          }
        );
        return status === PermissionsAndroid.RESULTS.GRANTED;
      }
      // On iOS, camera permissions are prompted automatically on first usage by native modules
      return true;
    } catch (error) {
      console.warn('[PermissionService] Failed to request camera permission:', error);
      return false;
    }
  }

  /**
   * Request Storage or Media Access Permission
   * Required for uploading assignment attachments, downloading receipts & report cards.
   */
  async requestStoragePermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        if (Platform.Version >= 33) {
          // Android 13+ uses granular media permissions
          const readImages = 'android.permission.READ_MEDIA_IMAGES' as Permission;
          const hasImages = await PermissionsAndroid.check(readImages);
          if (hasImages) return true;

          const results = await PermissionsAndroid.requestMultiple([
            readImages,
            'android.permission.READ_MEDIA_VIDEO' as Permission,
          ]);

          return (
            results[readImages] === PermissionsAndroid.RESULTS.GRANTED
          );
        } else {
          // Android 12 and below
          const readStorage = PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
          const writeStorage = PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE;

          const hasRead = await PermissionsAndroid.check(readStorage);
          if (hasRead) return true;

          const results = await PermissionsAndroid.requestMultiple([
            readStorage,
            writeStorage,
          ]);

          return (
            results[readStorage] === PermissionsAndroid.RESULTS.GRANTED ||
            results[writeStorage] === PermissionsAndroid.RESULTS.GRANTED
          );
        }
      }
      return true;
    } catch (error) {
      console.warn('[PermissionService] Failed to request storage permission:', error);
      return false;
    }
  }

  /**
   * Request all essential permissions sequentially on app startup.
   * Prompts user for Notifications first, then Camera and Storage.
   */
  async requestEssentialPermissions(): Promise<PermissionStatusResult> {
    console.log('[PermissionService] 🚀 Requesting essential app permissions on startup...');

    // 1. Notification Permission (Top Priority)
    const notifications = await this.requestNotificationPermission();

    // 2. Camera Permission (Essential for QR scanner / ID Pass)
    const camera = await this.requestCameraPermission();

    // 3. Storage / Media Permission (Essential for attachments & PDF downloads)
    const storage = await this.requestStoragePermission();

    console.log('[PermissionService] ✅ Permission summary:', { notifications, camera, storage });
    return { notifications, camera, storage };
  }

  /**
   * Check status of all essential permissions without prompting
   */
  async checkPermissionsStatus(): Promise<PermissionStatusResult> {
    try {
      let notifications = true;
      let camera = true;
      let storage = true;

      if (Platform.OS === 'android') {
        if (Platform.Version >= 33) {
          notifications = await PermissionsAndroid.check('android.permission.POST_NOTIFICATIONS' as Permission);
          storage = await PermissionsAndroid.check('android.permission.READ_MEDIA_IMAGES' as Permission);
        } else {
          storage = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);
        }
        camera = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
      }

      return { notifications, camera, storage };
    } catch (error) {
      console.warn('[PermissionService] Error checking permission statuses:', error);
      return { notifications: false, camera: false, storage: false };
    }
  }
}

export const permissionService = new PermissionService();
export default permissionService;
