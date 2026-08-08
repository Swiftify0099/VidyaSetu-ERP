import styles from './LoadingScreen.module.css';

export default function LoadingScreen() {
  return (
    <div className={styles.screen}>
      <div className={styles.content}>
        <div className={styles.logoWrap}>
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <rect width="40" height="40" rx="12" fill="var(--color-primary)"/>
            <path d="M10 28L20 12L30 28" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M14 24h12" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        </div>
        <div className={styles.spinner}/>
        <p className={styles.text}>VidyaSetu ERP</p>
      </div>
    </div>
  );
}
