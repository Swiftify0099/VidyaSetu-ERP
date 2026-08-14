import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ExternalLink, Flame, Check } from 'lucide-react';
import notificationService from '../../services/notificationService';
import { handleNotificationClick } from '../../utils/notificationUtils';
import { NotificationCategoryIcon } from '../shared/NotificationCategoryIcon';
import styles from './FCMNotificationToast.module.css';

export interface FCMToastData {
  id: string;
  title: string;
  body: string;
  category?: string;
  priority?: 'critical' | 'high' | 'medium' | 'low' | string;
  actionUrl?: string;
  imageUrl?: string;
  timestamp?: number;
  dbId?: number;
}

interface FCMNotificationToastProps {
  toasts: FCMToastData[];
  onDismiss: (id: string) => void;
  onMarkRead?: (dbId: number) => void;
}

const DURATION_MS = 7000;

export const FCMNotificationToast: React.FC<FCMNotificationToastProps> = ({
  toasts,
  onDismiss,
  onMarkRead,
}) => {
  return (
    <div className={styles.toastContainer} aria-live="polite" role="region">
      {toasts.map((toast) => (
        <SingleToastItem
          key={toast.id}
          toast={toast}
          onDismiss={onDismiss}
          onMarkRead={onMarkRead}
        />
      ))}
    </div>
  );
};

const SingleToastItem: React.FC<{
  toast: FCMToastData;
  onDismiss: (id: string) => void;
  onMarkRead?: (dbId: number) => void;
}> = ({ toast, onDismiss, onMarkRead }) => {
  const navigate = useNavigate();
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);
  const [isHovered, setIsHovered] = useState(false);
  const [imageExpanded, setImageExpanded] = useState(false);

  const startTimeRef = useRef<number>(Date.now());
  const remainingMsRef = useRef<number>(DURATION_MS);
  const animationFrameRef = useRef<number | null>(null);

  const priority = toast.priority || 'medium';
  const category = toast.category || 'notice';
  const categoryIcon = notificationService.getCategoryIcon(category);

  // Auto-dismiss countdown timer logic (pauses on hover or when image expanded)
  useEffect(() => {
    let lastTick = Date.now();

    const tick = () => {
      if (!isHovered && !imageExpanded) {
        const now = Date.now();
        const delta = now - lastTick;
        remainingMsRef.current = Math.max(0, remainingMsRef.current - delta);
        const pct = (remainingMsRef.current / DURATION_MS) * 100;
        setProgress(pct);

        if (remainingMsRef.current <= 0) {
          handleClose();
          return;
        }
      }
      lastTick = Date.now();
      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isHovered, imageExpanded]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(toast.id);
    }, 280);
  };

  const handleActionClick = () => {
    if (toast.dbId && onMarkRead) {
      onMarkRead(toast.dbId);
    }
    handleClose();
    if (toast.actionUrl) {
      handleNotificationClick(toast.actionUrl, (path) => navigate(path));
    }
  };

  const priorityClass =
    priority === 'critical'
      ? styles.priorityCritical
      : priority === 'high'
      ? styles.priorityHigh
      : priority === 'medium'
      ? styles.priorityMedium
      : styles.priorityLow;

  const priorityPillClass =
    priority === 'critical'
      ? styles.priorityPillCritical
      : priority === 'high'
      ? styles.priorityPillHigh
      : priority === 'medium'
      ? styles.priorityPillMedium
      : styles.priorityPillLow;

  return (
    <div
      className={`${styles.toastCard} ${priorityClass} ${isExiting ? styles.toastCardExiting : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="alert"
    >
      {/* Instagram/LinkedIn-Style Header */}
      <div className={styles.toastHeader}>
        <div className={styles.brandBadge}>
          <Flame size={13} className={styles.fcmFlameIcon} />
          <span>VidyaSetu Live</span>
        </div>

        <div className={styles.toastMeta}>
          <span className={`${styles.priorityPill} ${priorityPillClass}`}>
            {priority}
          </span>
          <button
            className={styles.closeBtn}
            onClick={handleClose}
            title="Dismiss notification"
            aria-label="Dismiss"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Main Content Group */}
      <div className={styles.toastContent}>
        <div className={styles.categoryIconWrap} title={category}>
          <NotificationCategoryIcon category={category} size={18} />
        </div>
        <div className={styles.textGroup}>
          <div className={styles.toastTitle}>{toast.title}</div>
          <div className={styles.toastBody}>{toast.body}</div>
        </div>
      </div>

      {/* Instagram / LinkedIn Style Rich Image Card Banner */}
      {toast.imageUrl && (
        <div className={styles.imageCardContainer}>
          <img
            src={toast.imageUrl}
            alt="Notification media"
            className={`${styles.toastImage} ${imageExpanded ? styles.toastImageExpanded : ''}`}
            onClick={() => setImageExpanded(!imageExpanded)}
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div className={styles.imageOverlayHint}>
            <span>{imageExpanded ? 'Click to collapse' : 'Click image to preview'}</span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className={styles.toastActions}>
        <button className={styles.actionBtnPrimary} onClick={handleActionClick}>
          <span>View Details</span>
          <ExternalLink size={12} />
        </button>
        <button className={styles.actionBtnSecondary} onClick={handleClose}>
          <Check size={12} />
          <span>Dismiss</span>
        </button>
      </div>

      {/* Countdown Progress Bar */}
      <div className={styles.progressBarTrack}>
        <div
          className={styles.progressBarFill}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default FCMNotificationToast;
