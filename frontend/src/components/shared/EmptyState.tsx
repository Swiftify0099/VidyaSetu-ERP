/**
 * VidyaSetu ERP — Shared EmptyState Component
 * =============================================
 * Displays a friendly empty state when no data is found.
 * Usage:
 *   <EmptyState
 *     icon="📚"
 *     title="No books found"
 *     description="Add your first book to the library"
 *     action={<button>Add Book</button>}
 *   />
 */
import React from 'react';
import styles from './EmptyState.module.css';

interface EmptyStateProps {
  icon?: string | React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = '📭',
  title,
  description,
  action,
  size = 'md',
}) => {
  return (
    <div className={`${styles.container} ${styles[size]}`}>
      <span className={styles.icon}>{icon}</span>
      <h3 className={styles.title}>{title}</h3>
      {description && <p className={styles.description}>{description}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
};
