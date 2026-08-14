import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import RootNavigator from './src/navigation/RootNavigator';
import { ThemeProvider } from './src/theme/ThemeContext';
import permissionService from './src/services/permissionService';
import { initializeMobileFirebase } from './src/config/firebase';

export default function App() {
  useEffect(() => {
    const bootstrapApp = async () => {
      try {
        // Request essential runtime permissions (Notifications, Camera, Storage)
        await permissionService.requestEssentialPermissions();
        // Initialize Firebase & FCM live push notification listeners
        await initializeMobileFirebase();
      } catch (err) {
        console.warn('[App] Startup initialization error:', err);
      }
    };
    bootstrapApp();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <RootNavigator />
          <Toast />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
