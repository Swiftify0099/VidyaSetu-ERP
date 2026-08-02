import { useState, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, DollarSign,
  Package, Library, FileText, Building2, Bell,
  BarChart3, Settings, Shield, ChevronDown, ChevronRight,
  LogOut, Menu, X, CalendarDays, ClipboardList, Palmtree, NotebookPen, ScanLine, ShieldAlert,
  Video, Bot, QrCode, Ticket, Award, Download, CreditCard, HelpCircle, UserCheck, CheckSquare, Sparkles, FolderOpen, MessageSquare, Bus,
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
  mobileOpen = false,
  onCloseMobile,
}: {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
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

  const primaryRole = user?.roles?.[0]?.code;

  const isStudent = primaryRole === 'student' || (hasRole('student') && !isSuperAdmin() && !hasRole('admin') && !hasRole('teacher') && !hasRole('clerk'));
  const isTeacher = (primaryRole === 'teacher' || primaryRole === 'class_teacher') || ((hasRole('teacher') || hasRole('class_teacher')) && !isSuperAdmin() && !hasRole('admin') && !hasRole('principal'));
  const isParent  = primaryRole === 'parent' || (hasRole('parent') && !isSuperAdmin() && !hasRole('admin') && !hasRole('teacher'));

  const studentNavItems: NavItem[] = [
    { label: t('nav.dashboard'), icon: <LayoutDashboard size={18} />, path: '/student-portal?tab=dashboard' },
    { label: t('nav.attendance'), icon: <CalendarDays size={18} />, path: '/student-portal?tab=attendance' },
    { label: t('nav.homework'), icon: <BookOpen size={18} />, path: '/student-portal?tab=homework' },
    { label: t('nav.assignments'), icon: <ClipboardList size={18} />, path: '/student-portal?tab=assignments' },
    { label: t('nav.notes_study'), icon: <FolderOpen size={18} />, path: '/student-portal?tab=study_materials' },
    { label: t('nav.video_lectures'), icon: <Video size={18} />, path: '/student-portal?tab=videos' },
    { label: t('nav.ai_tutor'), icon: <Bot size={18} />, path: '/student-portal?tab=aichat' },
    { label: t('nav.qr_scanner'), icon: <QrCode size={18} />, path: '/student-portal?tab=qr_learning' },
    { label: t('nav.timetable'), icon: <CalendarDays size={18} />, path: '/student-portal?tab=timetable' },
    { label: t('nav.hall_ticket'), icon: <Ticket size={18} />, path: '/student-portal?tab=examination' },
    { label: t('nav.results'), icon: <BarChart3 size={18} />, path: '/student-portal?tab=results' },
    { label: t('nav.certificates'), icon: <Award size={18} />, path: '/student-portal?tab=certificates' },
    { label: t('nav.library'), icon: <Library size={18} />, path: '/student-portal?tab=library' },
    { label: t('nav.fees'), icon: <CreditCard size={18} />, path: '/student-portal?tab=fees' },
    { label: t('nav.leave'), icon: <Palmtree size={18} />, path: '/student-portal?tab=leave' },
    { label: t('nav.portfolio'), icon: <Award size={18} />, path: '/student-portal?tab=portfolio' },
    { label: t('nav.notice_doubts'), icon: <HelpCircle size={18} />, path: '/student-portal?tab=communication' },
    { label: t('nav.downloads'), icon: <Download size={18} />, path: '/student-portal?tab=downloads' },
    { label: t('nav.analytics'), icon: <BarChart3 size={18} />, path: '/student-portal?tab=analytics' },
    { label: t('nav.digital_id'), icon: <UserCheck size={18} />, path: '/student-portal?tab=idcard' },
    { label: t('nav.settings'), icon: <Settings size={18} />, path: '/student-portal?tab=settings' },
  ];

  const teacherNavItems: NavItem[] = [
    { label: t('nav.teacher_dashboard'), icon: <LayoutDashboard size={18} />, path: '/teacher-portal?tab=dashboard' },
    { label: t('nav.mark_attendance'), icon: <ClipboardList size={18} />, path: '/teacher-portal?tab=attendance' },
    { label: t('nav.my_timetable'), icon: <CalendarDays size={18} />, path: '/teacher-portal?tab=timetable' },
    { label: t('nav.class_students'), icon: <Users size={18} />, path: '/teacher-portal?tab=students' },
    { label: t('nav.homework'), icon: <BookOpen size={18} />, path: '/teacher-portal?tab=homework' },
    { label: t('nav.study_materials'), icon: <FolderOpen size={18} />, path: '/teacher-portal?tab=materials' },
    { label: t('nav.video_lectures'), icon: <Video size={18} />, path: '/teacher-portal?tab=videos' },
    { label: t('nav.marks_entry'), icon: <CheckSquare size={18} />, path: '/teacher-portal?tab=marks' },
    { label: t('nav.lesson_plans'), icon: <NotebookPen size={18} />, path: '/lesson-plans' },
    { label: t('nav.behaviour_log'), icon: <ShieldAlert size={18} />, path: '/behaviour' },
    { label: t('nav.leave'), icon: <Palmtree size={18} />, path: '/teacher-portal?tab=leaves' },
    { label: t('nav.notice_board'), icon: <Bell size={18} />, path: '/teacher-portal?tab=notices' },
    { label: t('nav.ai_hub'), icon: <Bot size={18} />, path: '/ai-hub' },
    { label: t('nav.teacher_profile'), icon: <UserCheck size={18} />, path: '/teacher-portal?tab=profile' },
  ];

  const parentNavItems: NavItem[] = [
    { label: t('nav.my_children'), icon: <Users size={18} />, path: '/parent-portal?tab=children' },
    { label: t('nav.attendance_calendar'), icon: <CalendarDays size={18} />, path: '/parent-portal?tab=attendance' },
    { label: t('nav.class_timetable'), icon: <CalendarDays size={18} />, path: '/parent-portal?tab=timetable' },
    { label: t('nav.fee_status'), icon: <CreditCard size={18} />, path: '/parent-portal?tab=fees' },
    { label: t('nav.exam_results'), icon: <BarChart3 size={18} />, path: '/parent-portal?tab=results' },
    { label: t('nav.certificates'), icon: <Award size={18} />, path: '/parent-portal?tab=certificates' },
    { label: t('nav.health_profile'), icon: <UserCheck size={18} />, path: '/parent-portal?tab=health' },
    { label: t('nav.school_notices'), icon: <Bell size={18} />, path: '/parent-portal?tab=notices' },
  ];

  const staffNavItems: NavItem[] = [
    {
      label: t('nav.dashboard'),
      icon: <LayoutDashboard size={18} />,
      path: '/dashboard',
    },
    {
      label: t('nav.students'),
      icon: <GraduationCap size={18} />,
      permission: 'student.read',
      children: [
        { label: t('nav.all_students'), icon: <Users size={16} />, path: '/students', permission: 'student.read' },
        { label: t('nav.add_student'), icon: <Users size={16} />, path: '/students/add', permission: 'student.create' },
        { label: t('nav.attendance'), icon: <FileText size={16} />, path: '/students/attendance', permission: 'student.read' },
      ],
    },
    {
      label: t('nav.teachers'),
      icon: <Users size={18} />,
      permission: 'teacher.read',
      children: [
        { label: t('nav.all_teachers'), icon: <Users size={16} />, path: '/teachers', permission: 'teacher.read' },
        { label: t('nav.add_teacher'), icon: <Users size={16} />, path: '/teachers/add', permission: 'teacher.create' },
        { label: t('nav.teacher_workspace'), icon: <UserCheck size={16} />, path: '/teacher-portal', permission: 'teacher.read' },
      ],
    },
    {
      label: t('nav.admission'),
      icon: <FileText size={18} />,
      permission: 'admission.read',
      children: [
        { label: t('nav.new_admission'), icon: <FileText size={16} />, path: '/admission/new', permission: 'admission.create' },
        { label: t('nav.gr_register'),   icon: <BookOpen size={16} />, path: '/admission/gr',  permission: 'clerk.read' },
        { label: t('nav.promotions'),    icon: <GraduationCap size={16} />, path: '/admission/promotions', permission: 'clerk.update' },
      ],
    },
    {
      label: t('finance.title'),
      icon: <DollarSign size={18} />,
      permission: 'finance.read',
      path: '/finance',
    },
    {
      label: t('nav.attendance'),
      icon: <ClipboardList size={18} />,
      permission: 'attendance.read',
      path: '/attendance',
    },
    {
      label: t('nav.timetable'),
      icon: <CalendarDays size={18} />,
      permission: 'timetable.read',
      path: '/timetable',
    },
    {
      label: t('nav.leave'),
      icon: <Palmtree size={18} />,
      permission: 'leave.read',
      path: '/leave',
    },
    {
      label: t('nav.lesson_plans'),
      icon: <NotebookPen size={18} />,
      permission: 'lesson_plan.read',
      path: '/lesson-plans',
    },
    {
      label: t('nav.behaviour_log'),
      icon: <ShieldAlert size={18} />,
      permission: 'behaviour.read',
      path: '/behaviour',
    },
    {
      label: t('nav.qr_center'),
      icon: <ScanLine size={18} />,
      permission: 'qr.read',
      path: '/qr-center',
    },
    {
      label: t('nav.ai_hub'),
      icon: <NotebookPen size={18} />,
      path: '/ai-hub',
      permission: 'ai_assistant.read',
    },
    {
      label: t('nav.exams'),
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
      label: t('nav.inventory'),
      icon: <Package size={18} />,
      permission: 'inventory.read',
      path: '/inventory',
    },
    {
      label: 'Transport',
      icon: <Bus size={18} />,
      permission: 'transport.read',
      path: '/transport',
    },
    {
      label: t('nav.office'),
      icon: <Building2 size={18} />,
      permission: 'office.read',
      path: '/office',
    },
    {
      label: t('nav.communication'),
      icon: <Bell size={18} />,
      permission: 'communication.read',
      path: '/communication',
    },
    {
      label: 'Notifications',
      icon: <MessageSquare size={18} />,
      path: '/notifications',
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
        { label: t('nav.users'),           icon: <Users size={16} />,    path: '/admin/users',       permission: 'admin.manage_users' },
        { label: t('nav.roles'),           icon: <Shield size={16} />,   path: '/admin/roles',       permission: 'admin.manage_users' },
        { label: t('nav.permissions'),     icon: <Shield size={16} />,   path: '/admin/permissions', permission: 'admin.manage_users' },
        { label: t('nav.audit_logs'),      icon: <FileText size={16} />, path: '/admin/audit',       permission: 'admin.read' },
        { label: t('nav.system_settings'), icon: <Settings size={16} />, path: '/settings',          permission: 'admin.manage_settings' },
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
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''} ${mobileOpen ? styles.mobileOpen : ''}`}>
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
