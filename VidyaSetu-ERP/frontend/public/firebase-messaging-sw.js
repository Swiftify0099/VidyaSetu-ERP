// VidyaSetu ERP — Firebase Cloud Messaging Service Worker
// This file MUST be served at /firebase-messaging-sw.js (root of your site)
// It handles background push notifications, native OS tray popups, and notification clicks.

importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDa-hfmThLygBtQ138MFvc6OX9f54GwhMM",
  authDomain: "amc-ticketmanagement.firebaseapp.com",
  projectId: "amc-ticketmanagement",
  storageBucket: "amc-ticketmanagement.firebasestorage.app",
  messagingSenderId: "769130712470",
  appId: "1:769130712470:web:3a3e9fa0783715c24161b7",
});

const messaging = firebase.messaging();

// Instant service worker activation lifecycle hooks
self.addEventListener('install', (event) => {
  console.log('[firebase-messaging-sw.js] ⚙️ Installing Service Worker...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[firebase-messaging-sw.js] 🚀 Activating Service Worker & claiming clients...');
  event.waitUntil(self.clients.claim());
});

// Handle background push messages (when app tab is closed or minimized)
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] 🔔 Background message received:', payload);

  const rawTitle = payload.notification?.title || payload.data?.title || 'VidyaSetu ERP';
  const rawBody = payload.notification?.body || payload.data?.body || '';
  const category = payload.data?.category || '';
  const priority = payload.data?.priority || '';

  let titlePrefix = '';
  if (priority === 'critical') titlePrefix = '🚨 [CRITICAL] ';
  else if (priority === 'high') titlePrefix = '🔴 [HIGH] ';
  else if (category) titlePrefix = `[${category.toUpperCase()}] `;

  const title = titlePrefix ? `${titlePrefix}${rawTitle}` : rawTitle;
  const body = rawBody;
  const icon = payload.notification?.icon || '/icon.png';
  const badge = payload.notification?.badge || '/icon.png';
  const image = payload.notification?.image || payload.data?.image;
  const actionUrl = payload.data?.url || payload.data?.action_url || payload.fcmOptions?.link || '/';
  const tag = payload.messageId || payload.data?.id || `notif_${Date.now()}`;
  const timestamp = payload.notification?.timestamp
    ? new Date(payload.notification.timestamp).getTime()
    : Date.now();

  const notificationOptions = {
    body,
    icon,
    badge,
    image,
    timestamp,
    tag,
    requireInteraction: true,
    renotify: true,
    vibrate: [200, 100, 200],
    data: {
      url: actionUrl,
      id: payload.data?.id,
      payload,
    },
    actions: [
      { action: 'open', title: 'Open App' },
      { action: 'mark_as_read', title: 'Mark as Read' },
    ],
  };

  return self.registration.showNotification(title, notificationOptions);
});

// Fallback listener for raw Web Push events outside FCM SDK payload wrapping
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    console.log('[firebase-messaging-sw.js] 📩 Native Push event received:', data);
    // If onBackgroundMessage already handled it or if it's FCM format, FCM compat SDK processes it.
    // If it's custom push format missing notification key:
    if (data && !data.notification && data.data && data.data.title) {
      const title = data.data.title;
      const body = data.data.body || '';
      const options = {
        body,
        icon: '/icon.png',
        badge: '/icon.png',
        requireInteraction: true,
        data: { url: data.data.url || '/' },
      };
      event.waitUntil(self.registration.showNotification(title, options));
    }
  } catch (e) {
    console.warn('[firebase-messaging-sw.js] Push event parse non-JSON:', event.data.text());
  }
});

// Handle notification click event -> focus existing tab or open new tab & navigate to target URL
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] 🖱️ Notification clicked:', event.notification, 'Action:', event.action);

  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';
  const notificationId = event.notification.data?.id;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 1. If action is 'mark_as_read', notify clients to mark as read without opening new tabs if tab is open
      if (event.action === 'mark_as_read') {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin)) {
            client.postMessage({
              type: 'MARK_NOTIFICATION_READ',
              notificationId,
            });
          }
        }
        return;
      }

      // 2. Default click or 'open' action: focus open tab and navigate
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus().then(() => {
            // Post message to client for React Router navigation
            client.postMessage({
              type: 'FCM_NOTIFICATION_CLICKED',
              url: targetUrl,
              id: notificationId,
            });
            if ('navigate' in client && typeof client.navigate === 'function') {
              return client.navigate(targetUrl);
            }
          });
        }
      }

      // 3. No open tab found -> open new browser window/tab
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
