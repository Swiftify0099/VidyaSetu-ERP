/**
 * VidyaSetu ERP — Notification Utilities
 * ========================================
 * Production-ready notification helper utilities covering:
 * - Native browser desktop popups (Foreground & Background)
 * - Audio sound chime generation (Web Audio API + Audio file fallback)
 * - Notification permission requesting & status handling
 * - Deduplication tracking
 * - Click focus & URL routing navigation
 */

export interface NotificationPayload {
  notification?: {
    title?: string;
    body?: string;
    icon?: string;
    badge?: string;
    image?: string;
    timestamp?: number | string;
  };
  data?: {
    url?: string;
    action_url?: string;
    type?: string;
    id?: string;
    title?: string;
    body?: string;
    [key: string]: any;
  };
  fcmOptions?: {
    link?: string;
  };
  messageId?: string;
  tag?: string;
}

// Deduplication cache: tracks recent message identifiers for 10 seconds
const processedNotificationCache = new Set<string>();
const CACHE_TTL_MS = 10000;

/**
 * Checks whether a notification is duplicate to prevent double alerts
 */
export function isDuplicateNotification(payload: NotificationPayload): boolean {
  const id =
    payload.messageId ||
    payload.tag ||
    `${payload.notification?.title || payload.data?.title}_${payload.notification?.body || payload.data?.body}`;

  if (processedNotificationCache.has(id)) {
    return true;
  }

  processedNotificationCache.add(id);
  setTimeout(() => {
    processedNotificationCache.delete(id);
  }, CACHE_TTL_MS);

  return false;
}

/**
 * Plays a crisp dual-tone notification chime using Web Audio API synthesis
 * with fallback to HTML Audio if an audio file path is provided.
 */
export function playNotificationSound(soundUrl?: string): void {
  try {
    if (soundUrl) {
      const audio = new Audio(soundUrl);
      audio.play().catch(() => playSynthesizedChime());
      return;
    }
    playSynthesizedChime();
  } catch (err) {
    console.warn('[NotificationUtils] Audio playback warning:', err);
  }
}

function playSynthesizedChime(): void {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const now = ctx.currentTime;

    // First note: D5 (587.33 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.25);

    // Second note: A5 (880.00 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.0, now + 0.1);
    gain2.gain.setValueAtTime(0.2, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.55);
  } catch (err) {
    // Browser autoplay policy might restrict audio before first user gesture
    console.debug('[NotificationUtils] Synthesized chime suppressed by browser policy');
  }
}

/**
 * Requests browser notification permission gracefully
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.warn('[NotificationUtils] Browser does not support native notifications.');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (err) {
      console.error('[NotificationUtils] Error requesting notification permission:', err);
      return 'denied';
    }
  }

  return Notification.permission;
}

/**
 * Handles target URL redirection when user clicks on a notification
 */
export function handleNotificationClick(url?: string, customNavigate?: (path: string) => void): void {
  if (typeof window === 'undefined') return;

  window.focus();

  if (!url || url === '/') return;

  // Handle absolute URL vs relative application route
  if (url.startsWith('http://') || url.startsWith('https://')) {
    const isSameOrigin = url.startsWith(window.location.origin);
    if (isSameOrigin) {
      const path = url.replace(window.location.origin, '');
      if (customNavigate) {
        customNavigate(path);
      } else {
        window.location.href = url;
      }
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  } else {
    // Relative path e.g. "/student/profile/15"
    if (customNavigate) {
      customNavigate(url);
    } else {
      window.location.href = url;
    }
  }
}

export interface ExtendedNotificationOptions extends NotificationOptions {
  image?: string;
  actions?: Array<{ action: string; title: string; icon?: string }>;
  timestamp?: number;
  renotify?: boolean;
  vibrate?: number[];
}

/**
 * Displays a native desktop popup notification using the Notification API or ServiceWorker registration
 */
export async function showNotification(
  payload: NotificationPayload,
  customNavigate?: (path: string) => void
): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  // Deduplication check
  if (isDuplicateNotification(payload)) {
    console.log('[NotificationUtils] Suppressed duplicate notification popup.');
    return;
  }

  // Play audio sound chime
  playNotificationSound();

  const rawTitle = payload.notification?.title || payload.data?.title || 'VidyaSetu ERP';
  const rawBody = payload.notification?.body || payload.data?.body || '';
  const category = payload.data?.category || '';
  const priority = payload.data?.priority || '';

  // Format rich title for Windows Notification Tray / OS notification shade
  let titlePrefix = '';
  if (priority === 'critical') titlePrefix = '[CRITICAL] ';
  else if (priority === 'high') titlePrefix = '[HIGH] ';
  else if (category) titlePrefix = `[${category.toUpperCase()}] `;

  const resolveUrl = (path?: string) => {
    if (!path) return undefined;
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path;
    return `${window.location.origin}${path.startsWith('/') ? '' : '/'}${path}`;
  };

  const title = titlePrefix ? `${titlePrefix}${rawTitle}` : rawTitle;
  const body = rawBody;
  const icon = resolveUrl(payload.notification?.icon || '/icon.png');
  const badge = resolveUrl(payload.notification?.badge || '/icon.png');
  const image = resolveUrl(payload.notification?.image || payload.data?.image);
  const targetUrl = payload.data?.url || payload.data?.action_url || payload.fcmOptions?.link || '/';
  const timestamp = payload.notification?.timestamp
    ? new Date(payload.notification.timestamp).getTime()
    : Date.now();
  const tag = payload.tag || payload.messageId || `notif_${Date.now()}`;

  const serviceWorkerOptions: ExtendedNotificationOptions = {
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
      url: targetUrl,
      payload,
    },
    actions: [
      { action: 'open', title: 'Open App' },
      { action: 'mark_as_read', title: 'Mark as Read' },
    ],
  };

  // Standard window.Notification constructor options (without 'actions' which Chrome forbids)
  const windowNotificationOptions: ExtendedNotificationOptions = {
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
      url: targetUrl,
      payload,
    },
  };

  try {
    // 1. Primary approach: Use Service Worker registration for native OS tray popups
    if ('serviceWorker' in navigator) {
      const swReg = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js') || await navigator.serviceWorker.ready;
      if (swReg && swReg.showNotification) {
        await swReg.showNotification(title, serviceWorkerOptions);
        return;
      }
    }

    // 2. Fallback approach: Standard window.Notification constructor (no 'actions' key)
    const notif = new window.Notification(title, windowNotificationOptions);
    notif.onclick = (event) => {
      event.preventDefault();
      handleNotificationClick(targetUrl, customNavigate);
      notif.close();
    };
  } catch (err) {
    console.warn('[NotificationUtils] ServiceWorker showNotification failed, using fallback:', err);
    try {
      const fallbackNotif = new window.Notification(title, {
        body,
        icon,
        image,
        data: { url: targetUrl },
      } as ExtendedNotificationOptions);
      fallbackNotif.onclick = () => {
        handleNotificationClick(targetUrl, customNavigate);
        fallbackNotif.close();
      };
    } catch (fallbackErr) {
      console.error('[NotificationUtils] Critical notification rendering error:', fallbackErr);
    }
  }
}

/**
 * Schedule a delayed OS popup notification.
 * Designed to test notifications when the user minimizes or navigates away from the app.
 */
export function scheduleDelayedSystemNotification(
  delaySeconds: number,
  title: string = 'VidyaSetu Outside-App Push Test',
  body: string = 'Success! Background OS Push notifications are working outside of VidyaSetu ERP.',
  actionUrl: string = '/notifications'
): void {
  setTimeout(() => {
    showNotification({
      notification: {
        title,
        body,
        icon: '/icon.png',
        badge: '/icon.png',
      },
      data: {
        url: actionUrl,
        category: 'system',
        priority: 'high',
      },
    });
  }, delaySeconds * 1000);
}

