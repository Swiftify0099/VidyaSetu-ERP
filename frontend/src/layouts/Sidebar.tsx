import { useState, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, DollarSign,
  Package, Library, FileText, Building2, Bell,
  BarChart3, Settings, Shield, ChevronDown, ChevronRight,
  LogOut, Menu, X, CalendarDays, ClipboardList, Palmtree, NotebookPen, ScanLine, ShieldAlert,
  Video, Bot, QrCode, Ticket, Award, Download, CreditCard, HelpCircle, UserCheck, CheckSquare, Sparkles, FolderOpen,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import styles from './Sidebar.module.css';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path?: string;
  permission?: string;
  role?: string;
  children?: NavItem[];
}

export default function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  const { hasPermission, hasRole, isSuperAdmin, user, logout } = useAuth();
  const location = useLocation();
  const [openMenus, setOpenMenus] = useState<string[]>([]);

  /**
   * Custom active state checker for portal tab links.
   * NavLink's built-in `isActive` only matches by pathname.
   * Portal tabs use ?tab=X query params on the same pathname,
   * so we need to compare both pathname AND search string.
   */
  const isPortalTabActive = useCallback((path: string): boolean => {
    if (!path.includes('?')) {
      // Normal route — match by pathname prefix
      return location.pathname === path || location.pathname.startsWith(path + '/');
    }
    // Portal tab route — match pathname + exact search param
    const [pathname, search] = path.split('?');
    return location.pathname === pathname && location.search === '?' + search;
  }, [location.pathname, location.search]);

  const isStudent = hasRole('student') && !isSuperAdmin() && !hasRole('admin') && !hasRole('teacher') && !hasRole('clerk');
  const isTeacher = (hasRole('teacher') || hasRole('class_teacher')) && !isSuperAdmin() && !hasRole('admin') && !hasRole('principal');
  const isParent  = hasRole('parent') && !isSuperAdmin() && !hasRole('admin') && !hasRole('teacher');

  const studentNavItems: NavItem[] = [
    { label: 'Dashboard', icon: <LayoutDashboard size={18} />, path: '/student-portal?tab=dashboard' },
    { label: 'My Profile', icon: <Users size={18} />, path: '/student-portal?tab=profile' },
    { label: 'Attendance', icon: <CalendarDays size={18} />, path: '/student-portal?tab=attendance' },
    { label: 'Homework', icon: <BookOpen size={18} />, path: '/student-portal?tab=homework' },
    { label: 'Assignments', icon: <ClipboardList size={18} />, path: '/student-portal?tab=assignments' },
    { label: 'Notes & Study', icon: <FolderOpen size={18} />, path: '/student-portal?tab=study_materials' },
    { label: 'Video Lectures', icon: <Video size={18} />, path: '/student-portal?tab=videos' },
    { label: 'AI Tutor', icon: <Bot size={18} />, path: '/student-portal?tab=aichat' },
    { label: 'QR Scanner', icon: <QrCode size={18} />, path: '/student-portal?tab=qr_learning' },
    { label: 'Timetable', icon: <CalendarDays size={18} />, path: '/student-portal?tab=timetable' },
    { label: 'Hall Ticket', icon: <Ticket size={18} />, path: '/student-portal?tab=examination' },
    { label: 'Results', icon: <BarChart3 size={18} />, path: '/student-portal?tab=results' },
    { label: 'Certificates', icon: <Award size={18} />, path: '/student-portal?tab=certificates' },
    { label: 'Library', icon: <Library size={18} />, path: '/student-portal?tab=library' },
    { label: 'Fees', icon: <CreditCard size={18} />, path: '/student-portal?tab=fees' },
    { label: 'Leave Request', icon: <Palmtree size={18} />, path: '/student-portal?tab=leave' },
    { label: 'Portfolio', icon: <Award size={18} />, path: '/student-portal?tab=portfolio' },
    { label: 'Doubt & Notice', icon: <HelpCircle size={18} />, path: '/student-portal?tab=communication' },
    { label: 'Downloads', icon: <Download size={18} />, path: '/student-portal?tab=downloads' },
    { label: 'Analytics', icon: <BarChart3 size={18} />, path: '/student-portal?tab=analytics' },
    { label: 'Digital ID Card', icon: <UserCheck size={18} />, path: '/student-portal?tab=idcard' },
    { label: 'Settings', icon: <Settings size={18} />, path: '/student-portal?tab=settings' },
  ];

  const teacherNavItems: NavItem[] = [
    { label: 'Teacher Dashboard', icon: <LayoutDashboard size={18} />, path: '/teacher-portal?tab=dashboard' },
    { label: 'Mark Attendance', icon: <ClipboardList size={18} />, path: '/teacher-portal?tab=attendance' },
    { label: 'My Timetable', icon: <CalendarDays size={18} />, path: '/teacher-portal?tab=timetable' },
    { label: 'Class Students', icon: <Users size={18} />, path: '/teacher-portal?tab=students' },
    { label: 'Lesson Plans', icon: <NotebookPen size={18} />, path: '/lesson-plans' },
    { label: 'Behaviour Log', icon: <ShieldAlert size={18} />, path: '/behaviour' },
    { label: 'Apply Leave', icon: <Palmtree size={18} />, path: '/teacher-portal?tab=leaves' },
    { label: 'Notice Board', icon: <Bell size={18} />, path: '/teacher-portal?tab=notices' },
    { label: 'AI Studio', icon: <Bot size={18} />, path: '/ai-hub' },
    { label: 'Teacher Profile', icon: <UserCheck size={18} />, path: '/teacher-portal?tab=profile' },
  ];

  const parentNavItems: NavItem[] = [
    { label: 'My Children', icon: <Users size={18} />, path: '/parent-portal?tab=children' },
    { label: 'Attendance Calendar', icon: <CalendarDays size={18} />, path: '/parent-portal?tab=attendance' },
    { label: 'Class Timetable', icon: <CalendarDays size={18} />, path: '/parent-portal?tab=timetable' },
    { label: 'School Notices', icon: <Bell size={18} />, path: '/parent-portal?tab=notices' },
  ];

  const staffNavItems: NavItem[] = [
    {
      label: t('nav.dashboard'),
      icon: <LayoutDashboard size={18} />,
      path: '/dashboard',
    },
    {
      label: 'Student Workspace',
      icon: <GraduationCap size={18} />,
      path: '/student-portal',
    },
    {
      label: t('nav.students'),
      icon: <GraduationCap size={18} />,
      permission: 'student.read',
      children: [
        { label: 'All Students', icon: <Users size={16} />, path: '/students', permission: 'student.read' },
        { label: 'Add Student', icon: <Users size={16} />, path: '/students/add', permission: 'student.create' },
        { label: 'Attendance', icon: <FileText size={16} />, path: '/students/attendance', permission: 'student.read' },
      ],
    },
    {
      label: t('nav.teachers'),
      icon: <Users size={18} />,
      permission: 'teacher.read',
      children: [
        { label: 'All Teachers', icon: <Users size={16} />, path: '/teachers', permission: 'teacher.read' },
        { label: 'Add Teacher', icon: <Users size={16} />, path: '/teachers/add', permission: 'teacher.create' },
      ],
    },
    {
      label: t('nav.admission'),
      icon: <FileText size={18} />,
      permission: 'admission.read',
      children: [
        { label: 'New Admission', icon: <FileText size={16} />, path: '/admission/new', permission: 'admission.create' },
        { label: 'GR Register', icon: <BookOpen size={16} />, path: '/admission/gr', permission: 'clerk.read' },
        { label: 'Promotions', icon: <GraduationCap size={16} />, path: '/admission/promotions', permission: 'clerk.update' },
      ],
    },
    {
      label: t('finance.title'),
      icon: <DollarSign size={18} />,
      permission: 'finance.read',
      path: '/finance',
    },
    {
      label: 'Attendance',
      icon: <ClipboardList size={18} />,
      permission: 'attendance.read',
      path: '/attendance',
    },
    {
      label: 'Timetable',
      icon: <CalendarDays size={18} />,
      permission: 'timetable.read',
      path: '/timetable',
    },
    {
      label: 'Leave',
      icon: <Palmtree size={18} />,
      permission: 'leave.read',
      path: '/leave',
    },
    {
      label: 'Lesson Plans',
      icon: <NotebookPen size={18} />,
      permission: 'lesson_plan.read',
      path: '/lesson-plans',
    },
    {
      label: 'Behaviour Log',
      icon: <ShieldAlert size={18} />,
      permission: 'behaviour.read',
      path: '/behaviour',
    },
    {
      label: 'QR Scan Center',
      icon: <ScanLine size={18} />,
      permission: 'qr.read',
      path: '/qr-center',
    },
    {
      label: 'AI Studio & Bot',
      icon: <NotebookPen size={18} />,
      path: '/ai-hub',
    },
    {
      label: 'Examinations',
      icon: <ClipboardList size={18} />,
      permission: 'examination.read',
      path: '/exams',
    },
    {
      label: t('library.title'),
      icon: <Library size={18} />,
      permission: 'library.read',
      path: '/library',
    },
    {
      label: 'Inventory',
      icon: <Package size={18} />,
      permission: 'inventory.read',
      path: '/inventory',
    },
    {
      label: t('nav.office'),
      icon: <Building2 size={18} />,
      permission: 'office.read',
      path: '/office',
    },
    {
      label: 'Communication',
      icon: <Bell size={18} />,
      permission: 'communication.read',
      path: '/communication',
    },
    {
      label: t('nav.analytics'),
      icon: <BarChart3 size={18} />,
      permission: 'analytics.view_analytics',
      path: '/analytics',
    },
    {
      label: t('nav.admin'),
      icon: <Shield size={18} />,
      role: 'super_admin',
      children: [
        { label: 'Users',           icon: <Users size={16} />,    path: '/admin/users',       permission: 'admin.manage_users' },
        { label: 'Roles',           icon: <Shield size={16} />,   path: '/admin/roles',       permission: 'admin.manage_users' },
        { label: 'Permissions',     icon: <Shield size={16} />,   path: '/admin/permissions', permission: 'admin.manage_users' },
        { label: 'System Settings', icon: <Settings size={16} />, path: '/admin/settings',    permission: 'admin.manage_settings' },
        { label: 'Audit Logs',      icon: <FileText size={16} />, path: '/admin/audit',       permission: 'admin.read' },
      ],
    },
    {
      label: t('nav.settings'),
      icon: <Settings size={18} />,
      path: '/settings',
      role: 'admin',
    },
  ];

  const navItems = isStudent
    ? studentNavItems
    : isTeacher
    ? teacherNavItems
    : isParent
    ? parentNavItems
    : staffNavItems;

  const canShow = (item: NavItem): boolean => {
    if (isSuperAdmin()) return true;
    if (item.role && !hasRole(item.role)) return false;
    if (item.permission && !hasPermission(item.permission)) return false;
    return true;
  };

  const toggleMenu = (label: string) => {
    setOpenMenus(prev =>
      prev.includes(label) ? prev.filter(m => m !== label) : [...prev, label]
    );
  };

  const isMenuOpen = (label: string) =>
    openMenus.includes(label) ||
    navItems.find(n => n.label === label)?.children?.some(c => c.path && location.pathname.startsWith(c.path));

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      {/* Header */}
      <div className={styles.header}>
        {!collapsed && (
          <div className={styles.brand}>
            <div className={styles.brandIcon}>
              <GraduationCap size={20} />
            </div>
            <div className={styles.brandText}>
              <span className={styles.brandName}>VidyaSetu</span>
              <span className={styles.brandSub}>ERP</span>
            </div>
          </div>
        )}
        <button className={styles.toggleBtn} onClick={onToggle} aria-label="Toggle sidebar">
          {collapsed ? <Menu size={18} /> : <X size={18} />}
        </button>
      </div>

      {/* User Info */}
      {!collapsed && user && (
        <div className={styles.userInfo}>
          <div className={styles.userAvatar}>
            {user.photo_path
              ? <img src={`${import.meta.env.VITE_STORAGE_URL}/${user.photo_path}`} alt={user.full_name} />
              : <span>{user.full_name.charAt(0).toUpperCase()}</span>
            }
          </div>
          <div className={styles.userMeta}>
            <span className={styles.userName}>{user.full_name}</span>
            <span className={styles.userRole}>
              {user.roles[0]?.name || 'User'}
            </span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className={styles.nav}>
        {navItems.filter(canShow).map(item => {
          if (item.children) {
            const open = isMenuOpen(item.label);
            const visibleChildren = item.children.filter(canShow);
            if (visibleChildren.length === 0) return null;

            return (
              <div key={item.label} className={styles.menuGroup}>
                <button
                  className={`${styles.menuBtn} ${open ? styles.menuBtnOpen : ''}`}
                  onClick={() => toggleMenu(item.label)}
                  title={collapsed ? item.label : undefined}
                >
                  <span className={styles.menuIcon}>{item.icon}</span>
                  {!collapsed && (
                    <>
                      <span className={styles.menuLabel}>{item.label}</span>
                      <span className={styles.menuChevron}>
                        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </span>
                    </>
                  )}
                </button>

                {!collapsed && open && (
                  <div className={styles.submenu}>
                    {visibleChildren.map(child => (
                      <NavLink
                        key={child.path}
                        to={child.path!}
                        className={({ isActive }) =>
                          `${styles.subItem} ${isActive ? styles.subItemActive : ''}`
                        }
                      >
                        <span className={styles.subIcon}>{child.icon}</span>
                        <span>{child.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <NavLink
              key={item.path}
              to={item.path!}
              title={collapsed ? item.label : undefined}
              className={() =>
                `${styles.navItem} ${isPortalTabActive(item.path!) ? styles.navItemActive : ''}`
              }
            >
              <span className={styles.menuIcon}>{item.icon}</span>
              {!collapsed && <span className={styles.menuLabel}>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Logout */}
      <div className={styles.footer}>
        <button
          className={styles.logoutBtn}
          onClick={logout}
          title={collapsed ? t('auth.logout') : undefined}
        >
          <LogOut size={17} />
          {!collapsed && <span>{t('auth.logout')}</span>}
        </button>
      </div>
    </aside>
  );
}
