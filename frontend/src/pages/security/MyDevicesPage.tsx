/**
 * VidyaSetu ERP — My Devices Page
 * ==================================
 * Users can view and manage their trusted devices.
 * - See all registered devices with device info, last seen, trust status
 * - Revoke individual devices
 * - Change which device is the primary
 * - View recent security events
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Monitor, Smartphone, Globe, Shield, ShieldCheck, ShieldX,
  Star, StarOff, Trash2, RefreshCw, ChevronLeft, Clock, AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';
import deviceService, { type DeviceRecord, type SecurityEvent } from '../../services/deviceService';
import styles from './MyDevicesPage.module.css';

function DeviceIcon({ deviceType }: { deviceType?: string }) {
  if (deviceType === 'android' || deviceType === 'ios') return <Smartphone size={20} />;
  if (deviceType === 'web') return <Monitor size={20} />;
  return <Globe size={20} />;
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    ACTIVE:   { label: 'Trusted',  cls: styles.pillActive },
    PENDING:  { label: 'Pending',  cls: styles.pillPending },
    REVOKED:  { label: 'Revoked',  cls: styles.pillRevoked },
    BLOCKED:  { label: 'Blocked',  cls: styles.pillRevoked },
  };
  const info = map[status] ?? { label: status, cls: styles.pillPending };
  return <span className={`${styles.pill} ${info.cls}`}>{info.label}</span>;
}

function EventTypeLabel({ type }: { type: string }) {
  const labels: Record<string, string> = {
    LOGIN_SUCCESS: '✅ Login success',
    LOGIN_FAILED: '❌ Login failed',
    NEW_DEVICE: '🆕 New device detected',
    DEVICE_VERIFICATION_REQUESTED: '📧 Verification email sent',
    DEVICE_VERIFICATION_SUCCESS: '✅ Device verified',
    DEVICE_VERIFICATION_FAILED: '❌ Verification failed',
    DEVICE_REVOKED: '🔒 Device revoked',
    PRIMARY_DEVICE_CHANGED: '⭐ Primary device changed',
    SUSPICIOUS_LOGIN: '⚠️ Suspicious login blocked',
    ACCOUNT_LOCKED: '🔐 Account locked',
    DEVICE_REGISTERED: '📱 Device registered',
    LOGIN_ATTEMPT: '🔑 Login attempt',
    LOGOUT: '👋 Logout',
  };
  return <span>{labels[type] ?? type}</span>;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return 'Never';
  try {
    return new Date(dateStr).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  } catch {
    return dateStr;
  }
}

export default function MyDevicesPage() {
  const navigate = useNavigate();
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'devices' | 'events'>('devices');

  const loadDevices = useCallback(async () => {
    try {
      const data = await deviceService.listMyDevices();
      setDevices(data.devices);
    } catch {
      toast.error('Failed to load devices.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const data = await deviceService.getSecurityEvents(1, 30);
      setEvents(data.events);
    } catch {
      toast.error('Failed to load security events.');
    } finally {
      setEventsLoading(false);
    }
  }, []);

  useEffect(() => { loadDevices(); }, [loadDevices]);
  useEffect(() => {
    if (activeTab === 'events') loadEvents();
  }, [activeTab, loadEvents]);

  const handleRevoke = async (device: DeviceRecord) => {
    if (device.is_primary) {
      toast.error('Cannot revoke your primary device. First make another device primary.');
      return;
    }
    if (!confirm(`Revoke "${device.display_name}"? You will need to re-verify this device on next login.`)) return;
    setActionLoading(device.id);
    try {
      await deviceService.revokeDevice(device.id);
      toast.success('Device revoked.');
      loadDevices();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to revoke device.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleMakePrimary = async (device: DeviceRecord) => {
    setActionLoading(device.id);
    try {
      await deviceService.makePrimary(device.id);
      toast.success(`"${device.display_name}" is now your primary device.`);
      loadDevices();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to change primary device.');
    } finally {
      setActionLoading(null);
    }
  };

  const activeDevices = devices.filter(d => d.status !== 'REVOKED');
  const revokedDevices = devices.filter(d => d.status === 'REVOKED');

  return (
    <div className={styles.page}>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          <ChevronLeft size={18} /> Back
        </button>
        <div className={styles.headerInfo}>
          <div className={styles.headerIcon}><Shield size={22} /></div>
          <div>
            <h1 className={styles.pageTitle}>My Devices & Security</h1>
            <p className={styles.pageSubtitle}>Manage trusted devices and review login activity</p>
          </div>
        </div>
        <button className={styles.refreshBtn} onClick={loadDevices} title="Refresh">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'devices' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('devices')}
        >
          <Monitor size={15} /> Trusted Device ({activeDevices.length}/1)
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'events' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('events')}
        >
          <Clock size={15} /> Login History
        </button>
      </div>

      {/* Devices Tab */}
      {activeTab === 'devices' && (
        <div className={styles.content}>
          {loading ? (
            <div className={styles.loading}><RefreshCw size={20} className={styles.spinIcon} /> Loading devices...</div>
          ) : (
            <>
              {/* Device Limit Info */}
              <div className={styles.limitBanner}>
                <ShieldCheck size={15} />
                <span>Single-Device Policy: Only <strong>1 active device</strong> is allowed per account. When logging in from a new device, email verification is required and will make the new device your active primary device, revoking all previous sessions.</span>
              </div>

              {/* Active Devices */}
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Active Trusted Devices</h2>
                {activeDevices.length === 0 ? (
                  <div className={styles.empty}>No active devices. Log in from a device to register it.</div>
                ) : (
                  <div className={styles.deviceGrid}>
                    {activeDevices.map(device => (
                      <div key={device.id} className={`${styles.deviceCard} ${device.is_primary ? styles.deviceCardPrimary : ''}`}>
                        {device.is_primary && (
                          <div className={styles.primaryBadge}><Star size={11} /> Primary</div>
                        )}
                        <div className={styles.deviceHeader}>
                          <div className={styles.deviceIconWrap}>
                            <DeviceIcon deviceType={device.device_type} />
                          </div>
                          <div className={styles.deviceMeta}>
                            <div className={styles.deviceName}>{device.display_name}</div>
                            <StatusPill status={device.status} />
                          </div>
                        </div>

                        <div className={styles.deviceDetails}>
                          {device.os_version && (
                            <div className={styles.detailRow}>
                              <span className={styles.detailLabel}>OS</span>
                              <span>{device.os_version}</span>
                            </div>
                          )}
                          {device.browser_name && (
                            <div className={styles.detailRow}>
                              <span className={styles.detailLabel}>Browser</span>
                              <span>{device.browser_name}</span>
                            </div>
                          )}
                          <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>First seen</span>
                            <span>{formatDate(device.first_seen_at)}</span>
                          </div>
                          <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>Last active</span>
                            <span>{formatDate(device.last_seen_at)}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className={styles.deviceActions}>
                          {!device.is_primary && (
                            <button
                              className={styles.actionBtn}
                              onClick={() => handleMakePrimary(device)}
                              disabled={actionLoading === device.id}
                              title="Make primary"
                            >
                              {actionLoading === device.id
                                ? <RefreshCw size={13} className={styles.spinIcon} />
                                : <Star size={13} />
                              }
                              Make Primary
                            </button>
                          )}
                          {!device.is_primary && (
                            <button
                              className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                              onClick={() => handleRevoke(device)}
                              disabled={actionLoading === device.id}
                              title="Revoke device"
                            >
                              <Trash2 size={13} /> Revoke
                            </button>
                          )}
                          {device.is_primary && (
                            <span className={styles.primaryNote}>
                              <ShieldCheck size={13} /> Primary device — cannot be revoked
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Revoked Devices */}
              {revokedDevices.length > 0 && (
                <section className={styles.section}>
                  <h2 className={styles.sectionTitle}>Revoked Devices</h2>
                  <div className={styles.deviceGrid}>
                    {revokedDevices.map(device => (
                      <div key={device.id} className={`${styles.deviceCard} ${styles.deviceCardRevoked}`}>
                        <div className={styles.deviceHeader}>
                          <div className={`${styles.deviceIconWrap} ${styles.deviceIconRevoked}`}>
                            <DeviceIcon deviceType={device.device_type} />
                          </div>
                          <div className={styles.deviceMeta}>
                            <div className={styles.deviceName}>{device.display_name}</div>
                            <StatusPill status={device.status} />
                          </div>
                        </div>
                        <div className={styles.deviceDetails}>
                          <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>Revoked at</span>
                            <span>{formatDate(device.trusted_at)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      )}

      {/* Events Tab */}
      {activeTab === 'events' && (
        <div className={styles.content}>
          {eventsLoading ? (
            <div className={styles.loading}><RefreshCw size={20} className={styles.spinIcon} /> Loading events...</div>
          ) : events.length === 0 ? (
            <div className={styles.empty}>No security events found.</div>
          ) : (
            <div className={styles.eventList}>
              {events.map(event => (
                <div
                  key={event.id}
                  className={`${styles.eventRow} ${event.risk_score >= 60 ? styles.eventRowRisk : ''}`}
                >
                  <div className={styles.eventIcon}>
                    {event.risk_score >= 60
                      ? <AlertTriangle size={14} />
                      : event.event_type.includes('SUCCESS') || event.event_type === 'DEVICE_REGISTERED'
                        ? <ShieldCheck size={14} />
                        : event.event_type.includes('FAILED') || event.event_type.includes('SUSPICIOUS')
                          ? <ShieldX size={14} />
                          : <Clock size={14} />
                    }
                  </div>
                  <div className={styles.eventInfo}>
                    <div className={styles.eventType}><EventTypeLabel type={event.event_type} /></div>
                    <div className={styles.eventMeta}>
                      {event.ip_address && <span>IP: {event.ip_address}</span>}
                      {event.browser && <span>{event.browser}</span>}
                      {event.os && <span>{event.os}</span>}
                      {event.approximate_location && <span>📍 {event.approximate_location}</span>}
                    </div>
                    {event.failure_reason && (
                      <div className={styles.eventReason}>{event.failure_reason}</div>
                    )}
                  </div>
                  <div className={styles.eventTime}>{formatDate(event.login_at || event.created_at)}</div>
                  {event.risk_score >= 60 && (
                    <div className={styles.riskBadge}>Risk: {event.risk_score}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
