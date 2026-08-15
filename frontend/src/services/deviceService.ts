/**
 * VidyaSetu ERP — Device Service (Browser)
 * ==========================================
 * Manages a browser installation ID using localStorage.
 * 
 * Security Notes:
 * - The installation ID is a high-entropy random UUID.
 * - It is NOT a hardware identifier (not IMEI, MAC address, fingerprint).
 * - It serves only to distinguish browser instances, not to identify the user.
 * - Clearing localStorage will result in a new installation ID being generated.
 *   This is by design — the user will need to re-verify from that browser.
 * - The ID is persisted under DEVICE_ID_KEY in localStorage.
 */

import api from './api';

const DEVICE_ID_KEY = 'vidyasetu_device_id';

// ── Browser Info Extraction ──────────────────────────────────

function getBrowserName(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Firefox/')) return 'Firefox';
  if (ua.includes('Edg/')) return 'Edge';
  if (ua.includes('OPR/') || ua.includes('Opera/')) return 'Opera';
  if (ua.includes('Chrome/')) return 'Chrome';
  if (ua.includes('Safari/') && !ua.includes('Chrome/')) return 'Safari';
  return 'Browser';
}

function getBrowserVersion(): string {
  const ua = navigator.userAgent;
  const matches = ua.match(/(chrome|firefox|safari|edg|opr)[\/\s](\d+)/i);
  return matches ? matches[2] : '';
}

function getOSInfo(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Windows NT 10.0')) return 'Windows 10/11';
  if (ua.includes('Windows NT')) return 'Windows';
  if (ua.includes('Mac OS X')) return 'macOS';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  if (ua.includes('Linux')) return 'Linux';
  return 'Unknown OS';
}

// ── Installation ID ──────────────────────────────────────────

/**
 * Get or generate the browser installation ID.
 * This ID is stable across sessions but reset when localStorage is cleared.
 */
export function getDeviceInstallationId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    // crypto.randomUUID() available in all modern browsers (Chrome 92+, Firefox 95+, Safari 15.4+)
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

// ── Device Context ────────────────────────────────────────────

/**
 * Build the device context object to send with every login request.
 * All fields are optional — backend uses what is available.
 */
export function buildDeviceContext(): Record<string, string | undefined> {
  return {
    device_installation_id: getDeviceInstallationId(),
    device_type: 'web',
    platform: 'web',
    browser_name: getBrowserName(),
    browser_version: getBrowserVersion(),
    os_version: getOSInfo(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language || 'en',
  };
}

// ── API Methods ───────────────────────────────────────────────

const deviceService = {
  getInstallationId: getDeviceInstallationId,
  buildContext: buildDeviceContext,

  /** Verify a new device login ('Yes, This Is Me'). Returns full session tokens on success. */
  async verifyLogin(token: string): Promise<{
    access_token: string;
    refresh_token: string;
    user: object;
    expires_in: number;
  }> {
    const res = await api.post('/auth/login/verify', { token });
    return res.data.data;
  },

  /** Reject a login attempt ('No, This Wasn't Me'). */
  async rejectLogin(token: string): Promise<void> {
    await api.post('/auth/login/reject', { token });
  },

  /** Poll login attempt verification status. */
  async getAttemptStatus(loginAttemptId: string): Promise<{
    status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';
  }> {
    const res = await api.get(`/auth/login-attempt/${loginAttemptId}`);
    return res.data.data;
  },

  /** List all devices registered to the current user. */
  async listMyDevices(): Promise<{ devices: DeviceRecord[]; total: number }> {
    const res = await api.get('/auth/devices');
    return res.data.data;
  },

  /** Revoke a device by its ID. */
  async revokeDevice(deviceId: number): Promise<void> {
    await api.post(`/auth/devices/${deviceId}/revoke`);
  },

  /** Make a device the primary device. */
  async makePrimary(deviceId: number): Promise<void> {
    await api.post(`/auth/devices/${deviceId}/make-primary`);
  },

  /** Get current user's security event log. */
  async getSecurityEvents(page = 1, pageSize = 20): Promise<{
    events: SecurityEvent[];
    total: number;
    page: number;
    page_size: number;
  }> {
    const res = await api.get('/auth/security-events', { params: { page, page_size: pageSize } });
    return res.data.data;
  },
};

export interface DeviceRecord {
  id: number;
  uuid: string;
  device_type?: string;
  platform?: string;
  manufacturer?: string;
  model?: string;
  os_version?: string;
  browser_name?: string;
  user_agent?: string;
  is_primary: boolean;
  is_trusted: boolean;
  is_temporary?: boolean;
  status: string;
  first_seen_at?: string;
  last_seen_at?: string;
  trusted_at?: string;
  temporary_started_at?: string;
  temporary_expires_at?: string;
  revoke_reason?: string;
  display_name: string;
}

export interface SecurityEvent {
  id: number;
  uuid: string;
  event_type: string;
  status?: string;
  ip_address?: string;
  device_type?: string;
  browser?: string;
  os?: string;
  approximate_location?: string;
  risk_score: number;
  failure_reason?: string;
  verification_required: boolean;
  login_at?: string;
  created_at: string;
}

export default deviceService;
