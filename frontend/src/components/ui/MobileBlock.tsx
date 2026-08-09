import { useEffect, useState } from 'react';
import styles from './MobileBlock.module.css';

/* ──────────────────────────────────────────────────────────────
   Mobile phone detection:
   A "phone" is any touch device with a viewport width < 768px.
   Tablets (768px+) and desktops are allowed through.
   We re-check on resize so that rotating a phone still works.
────────────────────────────────────────────────────────────── */
function useIsPhone() {
  const [isPhone, setIsPhone] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(
      '(max-width: 767px) and (pointer: coarse)'
    );

    const update = () => setIsPhone(mq.matches);
    update(); // initial check

    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return isPhone;
}

/* ── Play Store URL — update this when the app is published ── */
const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.vidyasetu.erp';

export default function MobileBlock() {
  const isPhone = useIsPhone();
  if (!isPhone) return null;

  return (
    <div className={styles.overlay} role="alert" aria-live="assertive">
      {/* Decorative gradient blob */}
      <div className={styles.blob} aria-hidden="true" />

      <div className={styles.card}>
        {/* App icon */}
        <div className={styles.iconWrap} aria-hidden="true">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <path
              d="M10 28L20 12L30 28"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M14 23h12"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <h1 className={styles.title}>VidyaSetu ERP</h1>

        {/* Phone illustration */}
        <div className={styles.deviceRow} aria-hidden="true">
          {/* Phone with X */}
          <div className={styles.deviceItem}>
            <div className={styles.phoneIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="2" width="14" height="20" rx="2"/>
                <circle cx="12" cy="17.5" r="1"/>
              </svg>
              <div className={styles.crossBadge} aria-label="Not available">
                <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M2 2l6 6M8 2l-6 6"/>
                </svg>
              </div>
            </div>
            <span className={styles.deviceLabel}>Mobile</span>
          </div>

          <div className={styles.divider} aria-hidden="true">→</div>

          {/* Tablet with check */}
          <div className={styles.deviceItem}>
            <div className={styles.tabletIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="16" rx="2"/>
                <circle cx="12" cy="19.5" r="0.5" fill="currentColor"/>
              </svg>
              <div className={styles.checkBadge} aria-label="Supported">
                <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 5l2.5 2.5L8 3"/>
                </svg>
              </div>
            </div>
            <span className={styles.deviceLabel}>Tablet</span>
          </div>

          {/* Desktop with check */}
          <div className={styles.deviceItem}>
            <div className={styles.desktopIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2"/>
                <path d="M8 21h8M12 17v4"/>
              </svg>
              <div className={styles.checkBadge} aria-label="Supported">
                <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 5l2.5 2.5L8 3"/>
                </svg>
              </div>
            </div>
            <span className={styles.deviceLabel}>PC / Laptop</span>
          </div>
        </div>

        <p className={styles.message}>
          Please download the <strong>Android app</strong> to use VidyaSetu ERP on your phone.
          The web app is only available on <strong>PC, Laptop,</strong> and <strong>Tablet</strong> devices.
        </p>

        <a
          href={PLAY_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.downloadBtn}
          id="mobile-block-download-btn"
        >
          {/* Google Play badge icon */}
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M3.18 23.76a2 2 0 0 0 2.16-.22l12-7-3.31-3.31L3.18 23.76zM1.05 1.05C.71 1.5.5 2.12.5 2.9v18.2c0 .78.21 1.4.55 1.85L13.59 12 1.05 1.05zm20.53 9.08-3.14-1.83-3.65 3.7 3.65 3.7 3.17-1.85A2.04 2.04 0 0 0 22.5 12c0-.73-.36-1.37-.92-1.87zm-18.4-8.4L14.1 12 3.18.76A2 2 0 0 0 1.18 1.73z"/>
          </svg>
          Get it on Google Play
        </a>

        <p className={styles.footer}>
          VidyaSetu ERP &mdash; School Management System
        </p>
      </div>
    </div>
  );
}
