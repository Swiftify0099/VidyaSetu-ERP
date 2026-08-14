import styles from './LoadingScreen.module.css';

export default function LoadingScreen() {
  return (
    <div className={styles.screen}>
      {/* Elegant Background Curved Elements */}
      <div className={styles.backgroundCurves}>
        <svg width="100%" height="100%" viewBox="0 0 1440 900" fill="none" preserveAspectRatio="xMidYMid slice">
          {/* Curve 1: Violet/Indigo swoop */}
          <path 
            d="M -100,500 C 300,750 350,150 850,200" 
            stroke="var(--color-primary)" 
            strokeWidth="1.5" 
            opacity="0.25" 
            className={styles.curveLine1}
          />
          {/* Curve 2: Light subtle swooping backdrop */}
          <path 
            d="M 500,850 C 900,600 850,100 1500,450" 
            stroke="var(--color-secondary)" 
            strokeWidth="1" 
            opacity="0.12" 
            className={styles.curveLine2}
          />
        </svg>
      </div>

      <div className={styles.content}>
        {/* Orbital Logo Spinner Wrapper */}
        <div className={styles.logoAndSpinnerContainer}>
          <div className={styles.spinnerRing}>
            <svg viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="44" className={styles.spinnerTrack} />
              <circle cx="50" cy="50" r="44" className={styles.spinnerGlow} />
            </svg>
          </div>
          
          <div className={styles.logoWrap}>
            <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
              <path d="M10 28L20 12L30 28" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14 23h12" stroke="white" strokeWidth="3" strokeLinecap="round"/>
            </svg>
          </div>
        </div>

        {/* Text and Infinite Progress Bar */}
        <div className={styles.textContainer}>
          <p className={styles.text}>VidyaSetu ERP</p>
          <div className={styles.progressBarTrack}>
            <div className={styles.progressBarFill} />
          </div>
        </div>
      </div>
    </div>
  );
}