/**
 * VidyaSetu ERP — Socket.IO Real-Time Client Service
 * ====================================================
 * Manages WebSocket connections for:
 * 1. Real-time login approval / rejection on waiting devices.
 * 2. Active device revocation / temporary session expiration alerts.
 */

import { io, Socket } from 'socket.io-client';

function getSocketServerUrl(): string {
  const apiUrl =
    (import.meta.env.VITE_API_BASE_URL as string) ||
    (import.meta.env.VITE_API_URL as string) ||
    '';
  if (apiUrl.startsWith('http')) {
    return apiUrl.replace(/\/api\/v1\/?$/, '').replace(/\/api\/?$/, '');
  }
  return typeof window !== 'undefined' ? window.location.origin : '';
}

class SocketService {
  private socket: Socket | null = null;
  private currentLoginAttemptId: string | null = null;
  private currentDeviceId: number | null = null;

  /**
   * Get or initialize the singleton Socket.IO connection.
   */
  public getSocket(): Socket {
    if (!this.socket) {
      const serverUrl = getSocketServerUrl();
      this.socket = io(serverUrl, {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 15,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        autoConnect: true,
      });

      this.socket.on('connect', () => {
        // Re-join active rooms on reconnect
        if (this.currentLoginAttemptId) {
          this.socket?.emit('join_login_attempt', {
            login_attempt_id: this.currentLoginAttemptId,
          });
        }
        if (this.currentDeviceId) {
          this.socket?.emit('join_device_session', {
            device_id: this.currentDeviceId,
          });
        }
      });

      this.socket.on('disconnect', (reason) => {
        // Disconnected
      });

      this.socket.on('connect_error', (error) => {
        // Error handling
      });
    }

    if (!this.socket.connected) {
      this.socket.connect();
    }

    return this.socket;
  }

  /**
   * Join the private room for a pending login attempt.
   */
  public joinLoginAttempt(loginAttemptId: string): void {
    if (!loginAttemptId) return;
    this.currentLoginAttemptId = loginAttemptId;
    const socket = this.getSocket();
    socket.emit('join_login_attempt', { login_attempt_id: loginAttemptId });
  }

  /**
   * Leave / clear pending login attempt state.
   */
  public leaveLoginAttempt(): void {
    this.currentLoginAttemptId = null;
  }

  /**
   * Join the private room for an authenticated device session.
   */
  public joinDeviceSession(deviceId: number): void {
    if (!deviceId) return;
    this.currentDeviceId = deviceId;
    const socket = this.getSocket();
    socket.emit('join_device_session', { device_id: deviceId });
  }

  /**
   * Listen for LOGIN_APPROVED event.
   * Returns a cleanup function to unsubscribe.
   */
  public onLoginApproved(callback: (payload: any) => void): () => void {
    const socket = this.getSocket();
    socket.on('LOGIN_APPROVED', callback);
    return () => {
      socket.off('LOGIN_APPROVED', callback);
    };
  }

  /**
   * Listen for LOGIN_REJECTED event.
   * Returns a cleanup function to unsubscribe.
   */
  public onLoginRejected(callback: (payload: any) => void): () => void {
    const socket = this.getSocket();
    socket.on('LOGIN_REJECTED', callback);
    return () => {
      socket.off('LOGIN_REJECTED', callback);
    };
  }

  /**
   * Listen for DEVICE_REVOKED event.
   * Returns a cleanup function to unsubscribe.
   */
  public onDeviceRevoked(callback: (payload: any) => void): () => void {
    const socket = this.getSocket();
    socket.on('DEVICE_REVOKED', callback);
    return () => {
      socket.off('DEVICE_REVOKED', callback);
    };
  }

  /**
   * Listen for TEMPORARY_DEVICE_EXPIRED event.
   * Returns a cleanup function to unsubscribe.
   */
  public onDeviceExpired(callback: (payload: any) => void): () => void {
    const socket = this.getSocket();
    socket.on('TEMPORARY_DEVICE_EXPIRED', callback);
    return () => {
      socket.off('TEMPORARY_DEVICE_EXPIRED', callback);
    };
  }

  /**
   * Disconnect socket on logout or cleanup.
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.currentLoginAttemptId = null;
    this.currentDeviceId = null;
  }
}

export const socketService = new SocketService();
export default socketService;
