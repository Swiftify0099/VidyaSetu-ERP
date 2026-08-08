import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, AlertTriangle } from 'lucide-react';
import styles from './ErrorPage.module.css';

export default function NotFoundPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <div className={styles.code}>404</div>
        <h1 className={styles.title}>{t('errors.page_not_found')}</h1>
        <p className={styles.sub}>The page you are looking for does not exist or has been moved.</p>
        <button className={styles.btn} onClick={() => navigate('/dashboard')}>
          <Home size={16} /> {t('errors.go_home')}
        </button>
      </div>
    </div>
  );
}
