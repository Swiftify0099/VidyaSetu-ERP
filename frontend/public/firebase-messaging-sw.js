/**
 * VidyaSetu ERP — Firebase Messaging Service Worker
 * ====================================================
 * Handles background FCM push notifications when the app tab is
 * closed or not in focus.
 *
 * IMPORTANT: This file MUST be placed in the /public directory so
 * it is served from the root path (/firebase-messaging-sw.js).
 *
 * The VAPID key is NOT needed here — it's used in the main app
 * thread when generating the token. This file only handles incoming
 * push events in the background.
 */

// ── Import Firebase scripts (use compat for Service Workers) ──
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

// ── Firebase config must be hardcoded here (no Vite/env vars in SW) ──
// These values are the same as your VITE_FIREBASE_* env vars
// They are PUBLIC client values — safe to include in JS files.
const firebaseConfig = {
  apiKey: "AIzaSyBp-Td8PYLudqOebOEcvp9APT8Za-XQpQY",
  authDomain: "amc-ticketmanagement.firebaseapp.com",
  projectId: "amc-ticketmanagement",
  storageBucket: "amc-ticketmanagement.firebasestorage.app",
  messagingSenderId: "769130712470",
  appId: "1:769130712470:web:3a3e9fa0783715c24161b7",
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// ── Background message handler ─────────────────────────────────
// Called when the app is NOT in the foreground (tab closed / background)
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background message received:', payload);

  const notificationTitle =
    payload.notification?.title ||
    payload.data?.title ||
    'VidyaSetu ERP';

  const notificationBody =
    payload.notification?.body ||
    payload.data?.body ||
    'You have a new notification.';

  const notificationOptions = {
    body: notificationBody,
    icon: '/icon.png',
    badge: '/icon.png',
    image: payload.notification?.image || payload.data?.image_url,
    data: {
      url: payload.data?.url || payload.fcmOptions?.link || '/',
      ...payload.data,
    },
    requireInteraction: false,
    vibrate: [200, 100, 200],
    // Group notifications by category to avoid spamming
    tag: payload.data?.category || 'vidyasetu-notification',
    renotify: true,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// ── Notification click handler ─────────────────────────────────
// Opens the app when the user taps the notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';
  const fullUrl = self.location.origin + targetUrl;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If app is already open in a tab, focus it and navigate
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(fullUrl);
          return;
        }
      }
      // Otherwise open a new tab
      if (clients.openWindow) {
        return clients.openWindow(fullUrl);
      }
    })
  );
});

// ── Push event fallback ────────────────────────────────────────
// Handles raw push events not processed by Firebase SDK
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { notification: { title: 'VidyaSetu ERP', body: event.data.text() } };
  }

  // Only show if Firebase SDK didn't already handle it
  if (data.handled) return;
});
