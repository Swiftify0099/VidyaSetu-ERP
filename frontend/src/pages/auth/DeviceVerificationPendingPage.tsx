/**
 * VidyaSetu ERP — Device Verification Pending Page
 * ==================================================
 * Shown after login from a new device.
 * Polls the backend every 5 seconds to detect when the user
 * clicks 'Yes, This Is Me' in their email.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Shield, Clock, RefreshCw, LogIn, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import deviceService from '../../services/deviceService';
import authService from '../../services/authService';
import styles from './DeviceVerificationPendingPage.module.css';

type PollStatus = 'polling' | 'verified' | 'rejected' | 'expired' | 'error';

export default function DeviceVerificationPendingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const loginAttemptId = searchParams.get('id') || '';

  const [pollStatus, setPollStatus] = useState<PollStatus>('polling');
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const POLL_INTERVAL_MS = 5000;
  const MAX_WAIT_SECONDS = 30 * 60; // 30 minutes (matches backend token expiry)

  useEffect(() => {
    if (!loginAttemptId) {
      navigate('/login', { replace: true });
      return;
    }

    // Elapsed seconds counter
    timerRef.current = setInterval(() => {
      setSecondsElapsed(prev => {
        if (prev >= MAX_WAIT_SECONDS) {
          setPollStatus('expired');
          clearInterval(timerRef.current!);
          clearInterval(intervalRef.current!);
        }
        return prev + 1;
      });
    }, 1000);

    // Poll backend
    const doPoll = async () => {
      try {
        const res = await deviceService.getAttemptStatus(loginAttemptId);
        if (res.status === 'VERIFIED') {
          setPollStatus('verified');
          clearInterval(intervalRef.current!);
          clearInterval(timerRef.current!);
          setIsRedirecting(true);
          toast.success('Device verified! Logging you in...');
          // Navigate to special redirect page that will actually set up session
          setTimeout(() => navigate(`/auth/verify-complete?id=${loginAttemptId}`, { replace: true }), 1500);
        } else if (res.status === 'REJECTED') {
          setPollStatus('rejected');
          clearInterval(intervalRef.current!);
          clearInterval(timerRef.current!);
        } else if (res.status === 'EXPIRED') {
          setPollStatus('expired');
          clearInterval(intervalRef.current!);
          clearInterval(timerRef.current!);
        }
      } catch {
        // Don't change state on network errors — just keep polling
      }
    };

    doPoll(); // Immediate first poll
    intervalRef.current = setInterval(doPoll, POLL_INTERVAL_MS);

    return () => {
      clearInterval(intervalRef.current!);
      clearInterval(timerRef.current!);
    };
  }, [loginAttemptId, navigate]);

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
            {pollStatus === 'verified' && <CheckCircle size={32} />}
            {pollStatus === 'rejected' && <XCircle size={32} />}
            {pollStatus === 'expired' && <Clock size={32} />}
          </div>
          <div className={styles.statusBadge} data-status={pollStatus}>
            {pollStatus === 'polling' && 'Waiting for Approval'}
            {pollStatus === 'verified' && 'Approved!'}
            {pollStatus === 'rejected' && 'Login Rejected'}
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
              <span>Auto-checking...</span>
            </div>

            <div className={styles.securityNote}>
              <Shield size={13} />
              <span>
                If you did <strong>not</strong> attempt this login, click{' '}
                <strong>"Block This Login"</strong> in the email immediately.
              </span>
            </div>
          </>
        )}

        {pollStatus === 'verified' && (
          <>
            <h1 className={styles.title}>Device Approved!</h1>
            <p className={styles.subtitle}>
              Your device has been verified and trusted.{' '}
              {isRedirecting && 'Redirecting you to the dashboard...'}
            </p>
          </>
        )}

        {pollStatus === 'rejected' && (
          <>
            <h1 className={styles.title}>Login Blocked</h1>
            <p className={styles.subtitle}>
              You rejected this login attempt. Your account is safe.
              Please change your password if you believe someone else has your credentials.
            </p>
            <button className={styles.backBtn} onClick={() => navigate('/login', { replace: true })}>
              <LogIn size={16} /> Back to Login
            </button>
          </>
        )}

        {pollStatus === 'expired' && (
          <>
            <h1 className={styles.title}>Link Expired</h1>
            <p className={styles.subtitle}>
              The verification link has expired. Please try logging in again.
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
