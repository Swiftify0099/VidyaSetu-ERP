import firebase from '@react-native-firebase/app';
import messaging from '@react-native-firebase/messaging';

// Mobile Firebase configuration object
export const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyDa-hfmThLygBtQ138MFvc6OX9f54GwhMM",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "amc-ticketmanagement.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "amc-ticketmanagement",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "amc-ticketmanagement.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "769130712470",
  appId: process.env.FIREBASE_APP_ID || "1:769130712470:web:3a3e9fa0783715c24161b7",
  measurementId: process.env.FIREBASE_MEASUREMENT_ID || "G-M8MNRYNMQ7",
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

    // Request Notification permission for live on-screen popups
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('FCM Push Notification permission granted');

      // Foreground message listener (when app is open and active)
      messaging().onMessage(async remoteMessage => {
        console.log('🔔 Live foreground push notification received in mobile:', remoteMessage);
      });

      // Set background handler for live notifications outside app / on home screen
      messaging().setBackgroundMessageHandler(async remoteMessage => {
        console.log('Live background push notification received:', remoteMessage?.notification?.title);
      });
    }
  } catch (error) {
    console.error('Error initializing Firebase in Mobile app:', error);
  }
};

export default firebase;
