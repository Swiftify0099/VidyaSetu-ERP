/**
 * VidyaSetu ERP — Shared PageHeader Component
 * =============================================
 * Reusable top section for all admin pages.
 * Shows title, subtitle, breadcrumb, and action buttons.
 * Usage:
 *   <PageHeader
 *     title="Student List"
 *     subtitle="Manage all student records"
 *     breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Students' }]}
 *     actions={<button>Add Student</button>}
 *   />
 */
import React from 'react';
import { Link } from 'react-router-dom';
import styles from './PageHeader.module.css';

interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: Breadcrumb[];
  actions?: React.ReactNode;
  icon?: string;
  badge?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  breadcrumbs,
  actions,
  icon,
  badge,
}) => {
  return (
    <div className={styles.header}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              {index > 0 && <span className={styles.separator}>›</span>}
              {crumb.href ? (
                <Link to={crumb.href} className={styles.crumbLink}>
                  {crumb.label}
                </Link>
              ) : (
                <span className={styles.crumbCurrent}>{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      {/* Title Row */}
      <div className={styles.titleRow}>
        <div className={styles.titleGroup}>
          {icon && <span className={styles.icon}>{icon}</span>}
          <div>
            <div className={styles.titleLine}>
              <h1 className={styles.title}>{title}</h1>
              {badge && <span className={styles.badge}>{badge}</span>}
            </div>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    </div>
  );
};
