/**
 * VidyaSetu Mobile — Entry Point
 * @format
 */

import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './App';
import { name as appName } from './app.json';

/**
 * FCM Background/Quit State Handler
 * ====================================
 * MUST be registered here at the root — before AppRegistry.
 * This runs when the app is in background or completely killed.
 * The OS delivers the notification natively; this handler can
 * process data payloads (e.g., update a badge count) without
 * showing a UI.
 */
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('[FCM Mobile] Background message received:', remoteMessage);
  // The OS automatically shows the notification from remoteMessage.notification.
  // Handle any data-only messages here (e.g., silent sync).
});

AppRegistry.registerComponent(appName, () => App);

