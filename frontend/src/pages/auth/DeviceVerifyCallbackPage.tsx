/**
 * VidyaSetu ERP — Device Verify Callback Page
 * =============================================
 * Handles: /auth/verify-device?token=...
 * User arrives here by clicking "Yes, This Is Me" in the email.
 * Calls the backend to verify the token and establish a session.
 */
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import deviceService from '../../services/deviceService';
import authService from '../../services/authService';
import { useAuth } from '../../contexts/AuthContext';
import { getPortalPath } from '../../utils/rolePortals';
import fcmService from '../../services/fcmService';
import styles from './DeviceVerificationPendingPage.module.css';

type State = 'loading' | 'success' | 'error';

export default function DeviceVerifyCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const { refreshUser } = useAuth();

  const [state, setState] = useState<State>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setState('error');
      setErrorMsg('Invalid verification link. The token is missing.');
      return;
    }

    const verify = async () => {
      try {
        const data = await deviceService.verifyLogin(token);

        // Store tokens (session is now active)
        localStorage.setItem('vidyasetu_access_token', data.access_token);
        localStorage.setItem('vidyasetu_refresh_token', (data as any).refresh_token || '');
        localStorage.setItem('vidyasetu_user', JSON.stringify(data.user));

        // Refresh the auth context so the app knows we're logged in
        await refreshUser();

        // Init FCM
        void fcmService.init();

        setState('success');

        // Redirect to appropriate portal
        const user = data.user as any;
        const roleCode = user?.roles?.[0]?.code ?? '';
        setTimeout(() => navigate(getPortalPath(roleCode), { replace: true }), 2000);
      } catch (err: any) {
        const msg =
          err?.response?.data?.detail ||
          err?.response?.data?.message ||
          'Verification failed. The link may have expired or already been used.';
        setState('error');
        setErrorMsg(msg);
      }
    };

    verify();
  }, [token, navigate, refreshUser]);

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.iconWrap} style={{ animationPlayState: state === 'loading' ? 'running' : 'paused' }}>
            {state === 'loading' && <Loader size={32} style={{ animation: 'spin 1s linear infinite' }} />}
            {state === 'success' && <CheckCircle size={32} style={{ color: '#34d399' }} />}
            {state === 'error' && <XCircle size={32} style={{ color: '#f87171' }} />}
          </div>
          <div
            className={styles.statusBadge}
            data-status={state === 'success' ? 'verified' : state === 'error' ? 'rejected' : undefined}
          >
            {state === 'loading' && 'Verifying...'}
            {state === 'success' && 'Verified!'}
            {state === 'error' && 'Failed'}
          </div>
        </div>

        {state === 'loading' && (
          <>
            <h1 className={styles.title}>Verifying Your Device</h1>
            <p className={styles.subtitle}>Please wait while we verify your device and set up your session...</p>
          </>
        )}

        {state === 'success' && (
          <>
            <h1 className={styles.title}>Device Approved! 🎉</h1>
            <p className={styles.subtitle}>
              Your device has been verified and is now trusted.
              You'll be redirected to your dashboard in a moment...
            </p>
          </>
        )}

        {state === 'error' && (
          <>
            <h1 className={styles.title}>Verification Failed</h1>
            <p className={styles.subtitle}>{errorMsg}</p>
            <Link to="/login" replace className={styles.backBtn} style={{ textDecoration: 'none' }}>
              Back to Login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
