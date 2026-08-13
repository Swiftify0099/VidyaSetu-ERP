/**
 * VidyaSetu ERP — Device Reject Callback Page
 * =============================================
 * Handles: /auth/reject-device?token=...
 * User arrives here by clicking "No, Block This Login" in the email.
 */
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ShieldAlert, ShieldCheck, Loader } from 'lucide-react';
import deviceService from '../../services/deviceService';
import styles from './DeviceVerificationPendingPage.module.css';

type State = 'loading' | 'success' | 'error';

export default function DeviceRejectCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [state, setState] = useState<State>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setState('error');
      setErrorMsg('Invalid link. Token is missing.');
      return;
    }

    deviceService.rejectLogin(token)
      .then(() => {
        setState('success');
      })
      .catch((err: any) => {
        const msg =
          err?.response?.data?.detail ||
          err?.response?.data?.message ||
          'Failed to block login. The link may have already expired.';
        setState('error');
        setErrorMsg(msg);
      });
  }, [token]);

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.iconWrap}>
            {state === 'loading' && <Loader size={32} style={{ animation: 'spin 1s linear infinite' }} />}
            {state === 'success' && <ShieldCheck size={32} style={{ color: '#34d399' }} />}
            {state === 'error' && <ShieldAlert size={32} style={{ color: '#f87171' }} />}
          </div>
          <div
            className={styles.statusBadge}
            data-status={state === 'success' ? 'verified' : state === 'error' ? 'rejected' : undefined}
          >
            {state === 'loading' && 'Processing...'}
            {state === 'success' && 'Login Blocked'}
            {state === 'error' && 'Error'}
          </div>
        </div>

        {state === 'loading' && (
          <>
            <h1 className={styles.title}>Blocking Login...</h1>
            <p className={styles.subtitle}>Please wait while we block the unauthorized login attempt.</p>
          </>
        )}

        {state === 'success' && (
          <>
            <h1 className={styles.title}>Login Blocked ✓</h1>
            <p className={styles.subtitle}>
              The suspicious login attempt has been blocked. Your account is safe.
            </p>
            <div className={styles.securityNote}>
              <ShieldAlert size={13} />
              <span>
                <strong>Recommended:</strong> Change your password immediately if you believe
                someone else has your credentials. Contact your school administrator.
              </span>
            </div>
            <Link to="/login" replace className={styles.backBtn} style={{ textDecoration: 'none', marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              Back to Login
            </Link>
          </>
        )}

        {state === 'error' && (
          <>
            <h1 className={styles.title}>Could Not Block Login</h1>
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
