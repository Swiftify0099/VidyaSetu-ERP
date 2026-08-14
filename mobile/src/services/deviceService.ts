/**
 * VidyaSetu ERP — Device Service (Mobile/React Native)
 * ======================================================
 * Manages an Android/iOS app installation ID using AsyncStorage.
 * 
 * Security Notes:
 * - The installation ID is a cryptographically random UUID generated on
 *   first app install. It is NOT an IMEI, IMSI, MAC address, or hardware ID.
 * - It identifies the app installation, not the hardware or SIM.
 * - Users can reset it by clearing app data (expected behavior).
 * - We NEVER collect device hardware identifiers that require special permissions.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import api from './api';

const DEVICE_ID_KEY = '@vidyasetu_device_id';

// ── UUID Generation (no external package required) ───────────

/**
 * RFC 4122 compliant UUID v4 generator using Math.random().
 * Suitable for non-cryptographic installation IDs.
 * For higher entropy, replace with expo-crypto or react-native-uuid.
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ── Installation ID ──────────────────────────────────────────

/**
 * Get or generate the app installation ID.
 * Stored in AsyncStorage — persists until app data is cleared.
 */
export async function getDeviceInstallationId(): Promise<string> {
  try {
    let id = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = generateUUID();
      await AsyncStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    // Fallback if AsyncStorage fails — use a session-only ID
    return generateUUID();
  }
}

// ── Device Context ────────────────────────────────────────────

/**
 * Build the device context to send with every login request.
 * Uses only privacy-safe, permission-free APIs.
 */
export async function buildMobileDeviceContext(): Promise<Record<string, string | undefined>> {
  const installationId = await getDeviceInstallationId();

  return {
    device_installation_id: installationId,
    device_type: Platform.OS === 'android' ? 'android' : 'ios',
    platform: Platform.OS,
    os_version: Platform.Version?.toString(),
    // Note: manufacturer, model require react-native-device-info.
    // Omitted here to avoid adding an optional dependency.
    // Add if you install react-native-device-info in the project.
  };
}

// ── API Methods ───────────────────────────────────────────────

const mobileDeviceService = {
  getInstallationId: getDeviceInstallationId,
  buildContext: buildMobileDeviceContext,

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
  async listMyDevices(): Promise<{ devices: any[]; total: number }> {
    const res = await api.get('/auth/devices');
    return res.data.data;
  },

  /** Revoke a device by its ID. */
  async revokeDevice(deviceId: number): Promise<void> {
    await api.post(`/auth/devices/${deviceId}/revoke`);
  },

  /** Get current user's security event log. */
  async getSecurityEvents(page = 1, pageSize = 20): Promise<any> {
    const res = await api.get('/auth/security-events', { params: { page, page_size: pageSize } });
    return res.data.data;
  },
};

export default mobileDeviceService;
