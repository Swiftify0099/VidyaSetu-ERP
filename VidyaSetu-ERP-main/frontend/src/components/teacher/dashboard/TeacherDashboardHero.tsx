import React from 'react';
import { UserCheck, ClipboardList, BookOpen, Users, CalendarDays } from 'lucide-react';
import styles from '../../../pages/portals/TeacherPortalPage.module.css';

interface TeacherDashboardHeroProps {
  teacher: any;
  stats: any;
  onMarkAttendance: () => void;
  onNavigateTab: (tab: any) => void;
}

export const TeacherDashboardHero: React.FC<TeacherDashboardHeroProps> = ({
  teacher,
  stats,
  onMarkAttendance,
  onNavigateTab,
}) => {
  const classes = teacher?.classes_assigned
    ? (typeof teacher.classes_assigned === 'string'
        ? teacher.classes_assigned.split(',')
        : teacher.classes_assigned)
    : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5, 1.25rem)' }}>
      {/* ── Page Header ────────────────────────────────────────── */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>
            <UserCheck size={24} color="var(--color-primary)" />
            <span>Teacher Digital Workspace</span>
          </h1>
          <p className={styles.pageSub}>
            <span>
              Welcome, {teacher?.salutation || 'Prof.'} {teacher?.full_name} • EMP: {teacher?.employee_id || 'EMP-001'} • {teacher?.designation || 'Teacher'}
            </span>
          </p>
        </div>
        <button className={styles.primaryBtn} onClick={onMarkAttendance}>
          <ClipboardList size={16} /> <span>Mark Attendance</span>
        </button>
      </div>

      {/* ── Welcome Hero Banner (Gradient Card) ────────────────── */}
      <div className={styles.hero}>
        <div className={styles.avatar}>
          {teacher?.photo_path ? (
            <img src={`/storage/${teacher.photo_path}`} alt={teacher.full_name} />
          ) : (
            <span>{teacher?.full_name?.[0] || 'T'}</span>
          )}
        </div>
        <div className={styles.heroInfo}>
          <h2 className={styles.heroName}>
            {teacher?.salutation} {teacher?.full_name}
          </h2>
          {teacher?.full_name_marathi && (
            <p className={styles.heroNameMr}>
              <span>{teacher.full_name_marathi}</span>
            </p>
          )}
          <div className={styles.heroBadges}>
            <span className={styles.badge}>EMP ID: {teacher?.employee_id || 'EMP-001'}</span>
            <span className={styles.badge}>{teacher?.designation || 'Teacher'}</span>
            {classes.map((c: string) => (
              <span key={c} className={styles.badge}>
                Std {c}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Metric Overview Cards ──────────────────────────────── */}
      <div className={styles.overviewGrid}>
        <div
          className={styles.overviewCard}
          style={{ '--c': 'var(--color-primary)' } as React.CSSProperties}
          onClick={() => onNavigateTab('students')}
        >
          <div className={styles.overviewIcon}>
            <BookOpen size={20} />
          </div>
          <div className={styles.overviewVal}>{stats?.assigned_classes ?? 0}</div>
          <div className={styles.overviewLabel}>Assigned Classes</div>
        </div>
        <div
          className={styles.overviewCard}
          style={{ '--c': 'var(--color-success)' } as React.CSSProperties}
          onClick={() => onNavigateTab('students')}
        >
          <div className={styles.overviewIcon}>
            <Users size={20} />
          </div>
          <div className={styles.overviewVal}>{stats?.total_students ?? 0}</div>
          <div className={styles.overviewLabel}>Total Students</div>
        </div>
        <div
          className={styles.overviewCard}
          style={{ '--c': 'var(--color-warning)' } as React.CSSProperties}
          onClick={() => onNavigateTab('timetable')}
        >
          <div className={styles.overviewIcon}>
            <CalendarDays size={20} />
          </div>
          <div className={styles.overviewVal}>{stats?.today_periods ?? 0}</div>
          <div className={styles.overviewLabel}>Today's Periods</div>
        </div>
        <div
          className={styles.overviewCard}
          style={{ '--c': 'var(--color-danger)' } as React.CSSProperties}
          onClick={() => onNavigateTab('attendance')}
        >
          <div className={styles.overviewIcon}>
            <ClipboardList size={20} />
          </div>
          <div className={styles.overviewVal}>{stats?.academic_year || '2025-26'}</div>
          <div className={styles.overviewLabel}>Academic Year</div>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboardHero;
