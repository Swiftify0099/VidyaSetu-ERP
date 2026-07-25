import firebase from '@react-native-firebase/app';

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
 * Initialize Firebase App for React Native.
 * If native google-services.json / GoogleService-Info.plist is configured, @react-native-firebase initializes automatically.
 * Otherwise, secondary app initialization can be performed using firebaseConfig.
 */
export const initializeMobileFirebase = async () => {
  try {
    if (!firebase.apps.length) {
      await firebase.initializeApp(firebaseConfig);
      console.log('Firebase initialized successfully in Mobile app');
    } else {
      console.log('Firebase already initialized');
    }
  } catch (error) {
    console.error('Error initializing Firebase in Mobile app:', error);
  }
};

export default firebase;
