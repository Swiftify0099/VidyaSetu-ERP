/**
 * VidyaSetu ERP — Unauthorized Page (403)
 * ==========================================
 * Shown when a user navigates to a route they don't have permission for.
 * Also triggered by RBAC middleware when permission is denied.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './UnauthorizedPage.module.css';

export default function UnauthorizedPage() {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {/* Shield Icon */}
        <div className={styles.iconWrap}>
          <span className={styles.icon}>🔐</span>
        </div>

        <div className={styles.code}>403</div>
        <h1 className={styles.title}>Access Denied</h1>
        <p className={styles.message}>
          You don't have permission to access this page.
          <br />
          Please contact your administrator if you believe this is a mistake.
        </p>

        <div className={styles.actions}>
          <button className={styles.btnPrimary} onClick={() => navigate(-1)}>
            ← Go Back
          </button>
          <button className={styles.btnSecondary} onClick={() => navigate('/dashboard')}>
            🏠 Dashboard
          </button>
        </div>

        <p className={styles.helpText}>
          This access attempt has been logged for security purposes.
        </p>
      </div>
    </div>
  );
}
