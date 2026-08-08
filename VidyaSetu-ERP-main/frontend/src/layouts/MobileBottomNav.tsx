/**
 * VidyaSetu ERP — Mobile Bottom Navigation Bar
 * ============================================
 * Glassmorphic native-app bottom tab bar for mobile viewports (≤ 768px).
 * Dynamically displays role-specific primary actions:
 *   - Student: Home, Attendance, Timetable, Notices, Menu
 *   - Teacher: Dashboard, Attendance, Timetable, Students, Menu
 *   - Parent:  Children, Attendance, Timetable, Notices, Menu
 *   - Staff/Admin: Dashboard, Students, Attendance, Finance, Menu
 */
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, CalendarDays, ClipboardList,
  Bell, DollarSign, Menu, GraduationCap, UserCheck
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import styles from './MobileBottomNav.module.css';

interface MobileBottomNavProps {
  onOpenMobileMenu: () => void;
}

export default function MobileBottomNav({ onOpenMobileMenu }: MobileBottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, hasRole, isSuperAdmin } = useAuth();

  const isStudent = hasRole('student') && !isSuperAdmin() && !hasRole('admin') && !hasRole('teacher');
  const isTeacher = (hasRole('teacher') || hasRole('class_teacher')) && !isSuperAdmin() && !hasRole('admin');
  const isParent  = hasRole('parent') && !isSuperAdmin() && !hasRole('admin') && !hasRole('teacher');

  const getNavItems = () => {
    if (isStudent) {
      return [
        { label: 'Home',       icon: <LayoutDashboard size={20} />, path: '/student-portal?tab=dashboard' },
        { label: 'Attendance', icon: <CalendarDays size={20} />,    path: '/student-portal?tab=attendance' },
        { label: 'Timetable',  icon: <ClipboardList size={20} />,   path: '/student-portal?tab=timetable' },
        { label: 'Notices',    icon: <Bell size={20} />,            path: '/student-portal?tab=communication' },
      ];
    }
    if (isTeacher) {
      return [
        { label: 'Dashboard',  icon: <LayoutDashboard size={20} />, path: '/teacher-portal?tab=dashboard' },
        { label: 'Attendance', icon: <ClipboardList size={20} />,   path: '/teacher-portal?tab=attendance' },
        { label: 'Timetable',  icon: <CalendarDays size={20} />,    path: '/teacher-portal?tab=timetable' },
        { label: 'Students',   icon: <Users size={20} />,           path: '/teacher-portal?tab=students' },
      ];
    }
    if (isParent) {
      return [
        { label: 'Children',   icon: <Users size={20} />,           path: '/parent-portal?tab=children' },
        { label: 'Attendance', icon: <CalendarDays size={20} />,    path: '/parent-portal?tab=attendance' },
        { label: 'Timetable',  icon: <ClipboardList size={20} />,   path: '/parent-portal?tab=timetable' },
        { label: 'Notices',    icon: <Bell size={20} />,            path: '/parent-portal?tab=notices' },
      ];
    }
    // Admin / Staff
    return [
      { label: 'Dashboard',  icon: <LayoutDashboard size={20} />, path: '/dashboard' },
      { label: 'Students',   icon: <GraduationCap size={20} />,   path: '/students' },
      { label: 'Attendance', icon: <ClipboardList size={20} />,   path: '/attendance' },
      { label: 'Finance',    icon: <DollarSign size={20} />,      path: '/finance' },
    ];
  };

  const navItems = getNavItems();

  const isLinkActive = (path: string): boolean => {
    if (!path.includes('?')) {
      return location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
    }
    const [pathname, search] = path.split('?');
    return location.pathname === pathname && location.search === '?' + search;
  };

  return (
    <nav className={styles.mobileBottomNav} aria-label="Mobile bottom navigation">
      {navItems.map((item) => {
        const active = isLinkActive(item.path);
        return (
          <button
            key={item.label}
            className={`${styles.navItem} ${active ? styles.active : ''}`}
            onClick={() => navigate(item.path)}
          >
            {active && <div className={styles.activeIndicator} />}
            <div className={styles.iconWrap}>{item.icon}</div>
            <span className={styles.label}>{item.label}</span>
          </button>
        );
      })}

      {/* 5th Action: All Apps / Menu Drawer Trigger */}
      <button
        className={styles.navItem}
        onClick={onOpenMobileMenu}
        aria-label="Open main menu"
      >
        <div className={styles.iconWrap}><Menu size={20} /></div>
        <span className={styles.label}>Menu</span>
      </button>
    </nav>
  );
}
