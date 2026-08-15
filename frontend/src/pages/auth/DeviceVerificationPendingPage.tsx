/**
 * VidyaSetu ERP — Device Verification Pending Page
 * ==================================================
 * Shown after login from a new / unrecognized device.
 * Listens for real-time Socket.IO approval ('Yes, This Is Me')
 * and falls back to HTTP polling every 5 seconds.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Shield, Clock, RefreshCw, LogIn, CheckCircle, XCircle, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import deviceService from '../../services/deviceService';
import authService from '../../services/authService';
import socketService from '../../services/socketService';
import { useAuth } from '../../contexts/AuthContext';
import { getPortalPath } from '../../utils/rolePortals';
import fcmService from '../../services/fcmService';
import styles from './DeviceVerificationPendingPage.module.css';

type PollStatus = 'polling' | 'verified' | 'rejected' | 'expired' | 'error';

export default function DeviceVerificationPendingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const loginAttemptId = searchParams.get('id') || '';
  const { refreshUser } = useAuth();

  const [pollStatus, setPollStatus] = useState<PollStatus>('polling');
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const handledRef = useRef(false);

  const POLL_INTERVAL_MS = 5000;
  const MAX_WAIT_SECONDS = 30 * 60; // 30 minutes (matches backend token expiry)

  // ── Handle Successful Login Approval ──────────────────────
  const handleLoginSuccess = useCallback(async (authData?: any) => {
    if (handledRef.current) return;
    handledRef.current = true;

    setPollStatus('verified');
    setIsRedirecting(true);
    toast.success('Device approved! Logging you in...');

    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timerRef.current) clearInterval(timerRef.current);

    if (authData?.access_token && authData?.user) {
      localStorage.setItem('vidyasetu_access_token', authData.access_token);
      if (authData.refresh_token) {
        localStorage.setItem('vidyasetu_refresh_token', authData.refresh_token);
      }
      localStorage.setItem('vidyasetu_user', JSON.stringify(authData.user));

      await refreshUser();
      void fcmService.init();

      const user = authData.user;
      const roleCode = user?.roles?.[0]?.code ?? '';
      setTimeout(() => {
        navigate(getPortalPath(roleCode), { replace: true });
      }, 1200);
    } else {
      // If tokens weren't in socket payload, redirect to login
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 1500);
    }
  }, [navigate, refreshUser]);

  // ── Handle Rejection ──────────────────────────────────────
  const handleLoginRejected = useCallback(() => {
    if (handledRef.current) return;
    handledRef.current = true;
    setPollStatus('rejected');
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    toast.error('This login attempt was rejected.');
  }, []);

  useEffect(() => {
    if (!loginAttemptId) {
      navigate('/login', { replace: true });
      return;
    }

    handledRef.current = false;

    // ── 1. Connect to Real-Time Socket.IO ───────────────────
    socketService.joinLoginAttempt(loginAttemptId);

    const unsubApproved = socketService.onLoginApproved((payload: any) => {
      const authData = payload?.data;
      void handleLoginSuccess(authData);
    });

    const unsubRejected = socketService.onLoginRejected(() => {
      handleLoginRejected();
    });

    // ── 2. Countdown Timer ───────────────────────────────────
    timerRef.current = setInterval(() => {
      setSecondsElapsed(prev => {
        if (prev >= MAX_WAIT_SECONDS) {
          setPollStatus('expired');
          if (timerRef.current) clearInterval(timerRef.current);
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
        return prev + 1;
      });
    }, 1000);

    // ── 3. Fallback HTTP Polling ─────────────────────────────
    const doPoll = async () => {
      if (handledRef.current) return;
      try {
        const res = await deviceService.getAttemptStatus(loginAttemptId);
        if (res.status === 'VERIFIED') {
          void handleLoginSuccess();
        } else if (res.status === 'REJECTED') {
          handleLoginRejected();
        } else if (res.status === 'EXPIRED') {
          setPollStatus('expired');
          if (intervalRef.current) clearInterval(intervalRef.current);
          if (timerRef.current) clearInterval(timerRef.current);
        }
      } catch {
        // Keep polling on network errors
      }
    };

    intervalRef.current = setInterval(doPoll, POLL_INTERVAL_MS);

    return () => {
      unsubApproved();
      unsubRejected();
      socketService.leaveLoginAttempt();
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loginAttemptId, navigate, handleLoginSuccess, handleLoginRejected]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const remainingSeconds = Math.max(0, MAX_WAIT_SECONDS - secondsElapsed);

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.iconWrap}>
            {pollStatus === 'polling' && <Mail size={32} />}
            {pollStatus === 'verified' && <CheckCircle size={32} style={{ color: '#34d399' }} />}
            {pollStatus === 'rejected' && <XCircle size={32} style={{ color: '#f87171' }} />}
            {pollStatus === 'expired' && <Clock size={32} style={{ color: '#f59e0b' }} />}
          </div>
          <div className={styles.statusBadge} data-status={pollStatus}>
            {pollStatus === 'polling' && 'Waiting for Approval'}
            {pollStatus === 'verified' && 'Approved!'}
            {pollStatus === 'rejected' && 'Login Blocked'}
            {pollStatus === 'expired' && 'Link Expired'}
          </div>
        </div>

        {/* Content */}
        {pollStatus === 'polling' && (
          <>
            <h1 className={styles.title}>Check Your Email</h1>
            <p className={styles.subtitle}>
              We detected a login from a new device. A verification email has been sent to your
              registered email address. Please click{' '}
              <strong className={styles.highlight}>"Yes, This Is Me"</strong> to approve this login.
            </p>

            <div className={styles.steps}>
              <div className={styles.step}>
                <span className={styles.stepNum}>1</span>
                <span>Open your registered email inbox</span>
              </div>
              <div className={styles.step}>
                <span className={styles.stepNum}>2</span>
                <span>Find the email from <strong>VidyaSetu ERP</strong></span>
              </div>
              <div className={styles.step}>
                <span className={styles.stepNum}>3</span>
                <span>Click <strong>"Yes, This Is Me — Allow Login"</strong></span>
              </div>
            </div>

            <div className={styles.timerRow}>
              <Clock size={15} />
              <span>Link expires in <strong>{formatTime(remainingSeconds)}</strong></span>
              <span className={styles.dot} />
              <RefreshCw size={14} className={styles.spinIcon} />
              <span>Instant sync active...</span>
            </div>

            <div className={styles.securityNote}>
              <Shield size={13} />
              <span>
                If you did <strong>not</strong> attempt this login, click{' '}
                <strong>"Block This Login"</strong> in the email immediately to secure your account.
              </span>
            </div>
          </>
        )}

        {pollStatus === 'verified' && (
          <>
            <h1 className={styles.title}>Device Approved! 🎉</h1>
            <p className={styles.subtitle}>
              Your device has been verified and authenticated.{' '}
              {isRedirecting && 'Signing you in seamlessly...'}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
              <RefreshCw size={24} className={styles.spinIcon} style={{ color: '#6366f1' }} />
            </div>
          </>
        )}

        {pollStatus === 'rejected' && (
          <>
            <h1 className={styles.title}>Login Blocked</h1>
            <p className={styles.subtitle}>
              This login attempt was rejected. Your account remains protected.
              Please change your password if you suspect unauthorized access.
            </p>
            <button className={styles.backBtn} onClick={() => navigate('/login', { replace: true })}>
              <LogIn size={16} /> Back to Login
            </button>
          </>
        )}

        {pollStatus === 'expired' && (
          <>
            <h1 className={styles.title}>Verification Link Expired</h1>
            <p className={styles.subtitle}>
              The approval link has expired. Please log in again to receive a fresh verification link.
            </p>
            <button className={styles.backBtn} onClick={() => navigate('/login', { replace: true })}>
              <LogIn size={16} /> Try Again
            </button>
          </>
        )}
      </div>
    </div>
  );
}
