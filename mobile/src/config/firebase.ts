import firebase from '@react-native-firebase/app';
import messaging from '@react-native-firebase/messaging';
import { PermissionsAndroid, Platform } from 'react-native';

declare const process: any;

// Mobile Firebase configuration object
export const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyBp-Td8PYLudqOebOEcvp9APT8Za-XQpQY",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "amc-ticketmanagement.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "amc-ticketmanagement",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "amc-ticketmanagement.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "769130712470",
  appId: process.env.FIREBASE_APP_ID || "1:769130712470:android:a77694d05e821a6a4161b7",
  measurementId: process.env.FIREBASE_MEASUREMENT_ID || "G-M8MNRYNMQ7",
};

let cachedFcmToken: string | null = null;

/**
 * Request explicit Android POST_NOTIFICATIONS permission & iOS Messaging Permission
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        {
          title: 'Notification Permission Required',
          message: 'VidyaSetu needs notification permission to send real-time school alerts, exam results, and messages.',
          buttonNeutral: 'Ask Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'Allow',
        }
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        console.warn('Android POST_NOTIFICATIONS permission denied by user');
      }
    }

    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    console.log('Firebase messaging authorization status:', authStatus, 'enabled:', enabled);
    return enabled;
  } catch (err) {
    console.error('Failed to request notification permission:', err);
    return false;
  }
};

/**
 * Retrieve FCM device token and print it to Metro console
 */
export const getFcmToken = async (): Promise<string> => {
  if (cachedFcmToken) return cachedFcmToken;

  try {
    // Register device for remote messages
    if (!messaging().isDeviceRegisteredForRemoteMessages) {
      await messaging().registerDeviceForRemoteMessages();
    }

    const token = await messaging().getToken();
    if (token) {
      cachedFcmToken = token;
      console.log('\n================================================================');
      console.log('🔥🔥🔥 FIREBASE FCM DEVICE TOKEN FOR CONSOLE TESTING 🔥🔥🔥');
      console.log(`FCM TOKEN: ${token}`);
      console.log('================================================================\n');
      return token;
    }
  } catch (err: any) {
    console.warn('FCM getToken error (using device fallback for test mode):', err?.message || err);
  }

  // Fallback token for testing when Google Play Services / network token generation is pending
  const fallbackToken = `fcm_token_amc_ticketmanagement_test_${Date.now()}`;
  cachedFcmToken = fallbackToken;
  console.log('\n================================================================');
  console.log('🔑 FCM TOKEN (Test Mode / Device Fallback):');
  console.log(fallbackToken);
  console.log('================================================================\n');
  return fallbackToken;
};

/**
 * Initialize Firebase App for React Native and setup live background push notifications.
 */
export const initializeMobileFirebase = async () => {
  try {
    if (!firebase.apps.length) {
      await firebase.initializeApp(firebaseConfig);
      console.log('Firebase initialized successfully in Mobile app');
    } else {
      console.log('Firebase already initialized');
    }

    // Request permissions
    await requestNotificationPermission();

    // Fetch and print FCM Token to console
    await getFcmToken();

    // Subscribe to topic fallback ('students')
    try {
      await messaging().subscribeToTopic('students');
      console.log('Subscribed to FCM topic: students');
    } catch { /* ignore */ }

    // Foreground message listener
    messaging().onMessage(async remoteMessage => {
      console.log('🔔 Live foreground push notification received in mobile:', remoteMessage);
    });

    // Background message listener
    messaging().setBackgroundMessageHandler(async remoteMessage => {
      console.log('Live background push notification received:', remoteMessage?.notification?.title);
    });
  } catch (error) {
    console.error('Error initializing Firebase in Mobile app:', error);
  }
};

export default firebase;
