import React from 'react';
import { GraduationCap, Bot, CalendarDays, CreditCard, Library, Ticket } from 'lucide-react';
import styles from '../../../pages/portals/StudentPortalPage.module.css';

interface StudentDashboardHeroProps {
  profile: any;
  onNavigateTab: (tab: any) => void;
}

export const StudentDashboardHero: React.FC<StudentDashboardHeroProps> = ({
  profile,
  onNavigateTab,
}) => {
  if (!profile) return null;
  const p = profile;
  const getInitials = (name?: string): string => {
    if (!name || typeof name !== 'string') return 'ST';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'ST';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };
  const initials = getInitials(p?.full_name);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5, 1.25rem)' }}>
      {/* ── Page Header ────────────────────────────────────────── */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>
            <GraduationCap size={24} color="var(--color-primary)" />
            Student Digital Workspace
          </h1>
          <p className={styles.pageSub}>
            Welcome, {p.full_name} • Standard {p.standard}-{p.division || 'A'} • Academic Year {p.academic_year || '2025-2026'}
          </p>
        </div>
        <button className={styles.primaryBtn} onClick={() => onNavigateTab('aichat')}>
          <Bot size={16} /> Ask AI Tutor
        </button>
      </div>

      {/* ── Welcome Hero Card ──────────────────────────────────── */}
      <div className={styles.hero}>
        <div className={styles.avatar}>
          {p.photo_path ? (
            <img
              src={`/storage/${p.photo_path}`}
              alt={p.full_name}
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
                if (e.currentTarget.parentElement) {
                  e.currentTarget.parentElement.innerText = initials;
                }
              }}
            />
          ) : initials}
        </div>
        <div className={styles.heroInfo}>
          <h2 className={styles.heroName}>{p.full_name}</h2>
          {p.full_name_marathi && <p className={styles.heroNameMr}>{p.full_name_marathi}</p>}
          <div className={styles.heroBadges}>
            <span className={styles.badge}>Std {p.standard}-{p.division || 'A'}</span>
            <span className={styles.badge}>GR: {p.gr_number}</span>
            {p.roll_number && <span className={styles.badge}>Roll #{p.roll_number}</span>}
            <span className={styles.badge}>Pratap House</span>
          </div>
        </div>
      </div>

      {/* ── Metric Stats Overview Grid ─────────────────────────── */}
      <div className={styles.overviewGrid}>
        <div className={styles.overviewCard} style={{ '--c': 'var(--color-success)' } as React.CSSProperties} onClick={() => onNavigateTab('attendance')}>
          <div className={styles.overviewIcon}><CalendarDays size={20} /></div>
          <div className={styles.overviewVal}>{p.stats.attendance_percentage}%</div>
          <div className={styles.overviewLabel}>Attendance Percentage</div>
        </div>
        <div className={styles.overviewCard} style={{ '--c': 'var(--color-danger)' } as React.CSSProperties} onClick={() => onNavigateTab('fees')}>
          <div className={styles.overviewIcon}><CreditCard size={20} /></div>
          <div className={styles.overviewVal}>₹{p.stats.pending_fees}</div>
          <div className={styles.overviewLabel}>Pending Fees</div>
        </div>
        <div className={styles.overviewCard} style={{ '--c': 'var(--color-primary)' } as React.CSSProperties} onClick={() => onNavigateTab('library')}>
          <div className={styles.overviewIcon}><Library size={20} /></div>
          <div className={styles.overviewVal}>{p.stats.issued_books}</div>
          <div className={styles.overviewLabel}>Issued Library Books</div>
        </div>
        <div className={styles.overviewCard} style={{ '--c': 'var(--color-warning)' } as React.CSSProperties} onClick={() => onNavigateTab('examination')}>
          <div className={styles.overviewIcon}><Ticket size={20} /></div>
          <div className={styles.overviewVal}>{p.stats.upcoming_exams}</div>
          <div className={styles.overviewLabel}>Upcoming Exams</div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboardHero;
