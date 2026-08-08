import React from 'react';
import { Users } from 'lucide-react';
import styles from '../../../pages/portals/ParentPortalPage.module.css';

interface ParentDashboardHeroProps {
  activeChild: any;
  childrenList: any[];
  onSelectChild: (child: any) => void;
}

export const ParentDashboardHero: React.FC<ParentDashboardHeroProps> = ({
  activeChild,
  childrenList,
  onSelectChild,
}) => {
  const k = activeChild;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5, 1.25rem)' }}>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>
            <Users size={24} color="var(--color-primary)" />
            Parent Digital Portal
          </h1>
          <p className={styles.pageSub}>Track your child's academic journey — attendance, results, fees, and more</p>
        </div>
      </div>

      {/* Hero Banner */}
      {k && (
        <div className={styles.hero}>
          <div className={styles.avatar}>{k.full_name[0]}</div>
          <div className={styles.heroInfo}>
            <h2 className={styles.heroName}>{k.full_name}</h2>
            <p className={styles.heroSub}>Standard {k.standard}-{k.division || 'A'} • GR: {k.gr_number} • Roll #{k.roll_number || '—'}</p>
            {childrenList.length > 1 && (
              <div className={styles.childSwitcher}>
                {childrenList.map(child => (
                  <button
                    key={child.id}
                    className={`${styles.childBtn} ${child.id === k.id ? styles.childBtnActive : ''}`}
                    onClick={() => onSelectChild(child)}
                  >
                    {child.full_name.split(' ')[0]}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className={styles.heroStats}>
            <div className={styles.heroStat}>
              <span className={styles.heroStatVal} style={{ color: (k.attendance_pct || 0) >= 90 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                {k.attendance_pct || 0}%
              </span>
              <span className={styles.heroStatLabel}>Attendance</span>
            </div>
            <div className={styles.heroStat}>
              <span className={styles.heroStatVal} style={{ color: 'var(--color-primary)' }}>Std {k.standard}</span>
              <span className={styles.heroStatLabel}>Class</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParentDashboardHero;
