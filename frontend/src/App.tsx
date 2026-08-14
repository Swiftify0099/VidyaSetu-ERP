import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Suspense, lazy } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { NotificationProvider } from './contexts/NotificationContext';
import ProtectedRoute from './components/ui/ProtectedRoute';
import LoadingScreen from './components/ui/LoadingScreen';
import MobileBlock from './components/ui/MobileBlock';
import RolePortalRedirect, { RoleGuard } from './components/ui/RolePortalRedirect';
import './i18n';
import './theme/tokens.css';

// ── Auth ──────────────────────────────────────────────────────
const LoginPage        = lazy(() => import('./pages/auth/LoginPage'));
const NotFoundPage     = lazy(() => import('./pages/errors/NotFoundPage'));
const UnauthorizedPage = lazy(() => import('./pages/errors/UnauthorizedPage'));

// ── Device Security (public — accessed before auth is complete) ─
const DeviceVerificationPendingPage = lazy(() => import('./pages/auth/DeviceVerificationPendingPage'));
const DeviceVerifyCallbackPage      = lazy(() => import('./pages/auth/DeviceVerifyCallbackPage'));
const DeviceRejectCallbackPage      = lazy(() => import('./pages/auth/DeviceRejectCallbackPage'));

// ── Device Security (protected) ───────────────────────────────
const MyDevicesPage = lazy(() => import('./pages/security/MyDevicesPage'));

// ── Layouts ───────────────────────────────────────────────────
const DashboardLayout  = lazy(() => import('./layouts/DashboardLayout'));

// ── Admin / Principal Dashboard ───────────────────────────────
const DashboardPage    = lazy(() => import('./pages/dashboard/DashboardPage'));

// ── Student Module (Admin CRUD) ───────────────────────────────
const StudentListPage    = lazy(() => import('./pages/students/StudentListPage'));
const AddStudentPage     = lazy(() => import('./pages/students/AddStudentPage'));
const StudentProfilePage = lazy(() => import('./pages/students/StudentProfilePage'));

// ── Teacher Module (Admin CRUD) ───────────────────────────────
const TeacherListPage    = lazy(() => import('./pages/teachers/TeacherListPage'));
const AddTeacherPage     = lazy(() => import('./pages/teachers/AddTeacherPage'));
const TeacherProfilePage = lazy(() => import('./pages/teachers/TeacherProfilePage'));

// ── Core Modules ──────────────────────────────────────────────
const OfficePage        = lazy(() => import('./pages/office/OfficePage'));
const FinancePage       = lazy(() => import('./pages/finance/FinancePage'));
const LibraryPage       = lazy(() => import('./pages/library/LibraryPage'));
const ExamPage          = lazy(() => import('./pages/exam/ExamPage'));
const AttendancePage    = lazy(() => import('./pages/attendance/AttendancePage'));
const TimetablePage     = lazy(() => import('./pages/timetable/TimetablePage'));
const SubjectAssignmentsPage = lazy(() => import('./pages/academics/SubjectAssignmentsPage'));
const CommunicationPage = lazy(() => import('./pages/communication/CommunicationPage'));
const InventoryPage     = lazy(() => import('./pages/inventory/InventoryPage'));
const AnalyticsPage     = lazy(() => import('./pages/analytics/AnalyticsPage'));
const SettingsPage      = lazy(() => import('./pages/settings/SettingsPage'));

// ── Admin Pages (Phase 7) ─────────────────────────────────────
const UserManagementPage = lazy(() => import('./pages/admin/UserManagementPage'));
const RoleManagementPage = lazy(() => import('./pages/admin/RoleManagementPage'));
const AuditLogPage       = lazy(() => import('./pages/admin/AuditLogPage'));
const PermissionsPage    = lazy(() => import('./pages/admin/PermissionsPage'));

// ── Admission Module (Phase 2) ────────────────────────────────
const AdmissionPage = lazy(() => import('./pages/admission/AdmissionPage'));

// ── Leave Management (Phase 3) ────────────────────────────────
const LeavePage = lazy(() => import('./pages/leave/LeavePage'));

// ── Lesson Plan (Phase 3) ─────────────────────────────────────
const LessonPlanPage = lazy(() => import('./pages/lesson_plan/LessonPlanPage'));

// ── Behaviour Log (Phase 3) ───────────────────────────────────
const BehaviourLogPage = lazy(() => import('./pages/behaviour/BehaviourLogPage'));

// ── Notification Center (Phase N) ────────────────────────────
const NotificationCenterPage = lazy(() => import('./pages/notifications/NotificationCenterPage'));

// ── QR Scan Center (Phase 8) ──────────────────────────────────
const QRScanCenterPage = lazy(() => import('./pages/qr/QRScanCenterPage'));

// ── AI Studio (Phase 5) ───────────────────────────────────────
const AIAssistantPage = lazy(() => import('./pages/ai/AIAssistantPage'));

// ── Student Portal ─────────────────────────────────────────────
// (Sprint B — placeholder until full portal is built)
const StudentPortalPage = lazy(() => import('./pages/portals/StudentPortalPage'));

// ── Teacher Portal ─────────────────────────────────────────────
// (Sprint C — placeholder until full portal is built)
const TeacherPortalPage = lazy(() => import('./pages/portals/TeacherPortalPage'));

// ── Parent Portal ──────────────────────────────────────────────
const ParentPortalPage  = lazy(() => import('./pages/portals/ParentPortalPage'));

// ── Homework Portal ───────────────────────────────────────────
const HomeworkPortalPage = lazy(() => import('./pages/homework/HomeworkPortalPage'));

// ── Transport Module (Phase 5) ─────────────────────────────────
const TransportPage = lazy(() => import('./pages/transport/TransportPage'));


export default function App() {
  return (
    <>
      {/* ── Mobile phone gate — shows only on phones (<768px + touch) ── */}
      <MobileBlock />

      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  fontFamily: 'var(--font-family)',
                  fontSize: 'var(--font-size-sm)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text-primary)',
                  border: '1px solid var(--color-border)',
                  boxShadow: 'var(--shadow-lg)',
                },
                success: { iconTheme: { primary: 'var(--color-success)', secondary: 'white' } },
                error:   { iconTheme: { primary: 'var(--color-danger)',  secondary: 'white' } },
              }}
            />
            <Suspense fallback={<LoadingScreen />}>
              <Routes>
                {/* ── Public ─────────────────────────────────── */}
                <Route path="/login"        element={<LoginPage />} />
                <Route path="/unauthorized" element={<UnauthorizedPage />} />

                {/* ── Device Verification (public — before auth) ─ */}
                <Route path="/auth/verify-pending"  element={<DeviceVerificationPendingPage />} />
                <Route path="/auth/verify-device"   element={<DeviceVerifyCallbackPage />} />
                <Route path="/auth/reject-device"   element={<DeviceRejectCallbackPage />} />

                {/* ── Protected (all roles) ──────────────────── */}
                <Route element={<ProtectedRoute />}>

                  {/* Root → role-based redirect */}
                  <Route path="/" element={<RolePortalRedirect />} />

                  {/* ── Security ─────────────────────────── */}
                  <Route path="/security/devices" element={<MyDevicesPage />} />

                  {/* ── Student Portal ──────────────────────── */}
                  <Route element={<RoleGuard allowedRoles={['student', 'super_admin', 'admin', 'principal', 'vice_principal', 'teacher', 'class_teacher', 'clerk']}>
                    <DashboardLayout />
                  </RoleGuard>}>
                    <Route path="/student-portal" element={<StudentPortalPage />} />
                  </Route>

                  {/* ── Teacher Portal ──────────────────────── */}
                  <Route element={<RoleGuard allowedRoles={['teacher', 'class_teacher', 'super_admin', 'admin', 'principal', 'vice_principal']}>
                    <DashboardLayout />
                  </RoleGuard>}>
                    <Route path="/teacher-portal" element={<TeacherPortalPage />} />
                  </Route>

                  {/* ── Parent Portal ───────────────────────── */}
                  <Route element={<RoleGuard allowedRoles={['parent', 'super_admin', 'admin']}>
                    <DashboardLayout />
                  </RoleGuard>}>
                    <Route path="/parent-portal" element={<ParentPortalPage />} />
                  </Route>

                  {/* ── Admin / Staff Portal ────────────────── */}
                  <Route element={<DashboardLayout />}>
                    <Route path="/dashboard" element={<DashboardPage />} />

                    {/* Students */}
                    <Route path="/students"           element={<StudentListPage />} />
                    <Route path="/students/add"       element={<AddStudentPage />} />
                    <Route path="/students/:id"       element={<StudentProfilePage />} />
                    <Route path="/students/:id/edit"  element={<AddStudentPage />} />

                    {/* Teachers */}
                    <Route path="/teachers"           element={<TeacherListPage />} />
                    <Route path="/teachers/add"       element={<AddTeacherPage />} />
                    <Route path="/teachers/:id"       element={<TeacherProfilePage />} />
                    <Route path="/teachers/:id/edit"  element={<AddTeacherPage />} />

                    {/* Office */}
                    <Route path="/office"         element={<OfficePage />} />
                    {/* Finance — Accountant / Admin / Principal */}
                    <Route path="/finance"        element={<RoleGuard allowedRoles={['super_admin','admin','principal','accountant','clerk']}><FinancePage /></RoleGuard>} />
                    {/* Library — Librarian / Admin */}
                    <Route path="/library"        element={<RoleGuard allowedRoles={['super_admin','admin','librarian','clerk']}><LibraryPage /></RoleGuard>} />
                    {/* Exams — Teacher / Admin / Principal */}
                    <Route path="/exams"          element={<RoleGuard allowedRoles={['super_admin','admin','principal','vice_principal','teacher','class_teacher','exam_coordinator']}><ExamPage /></RoleGuard>} />
                    {/* Attendance — Teacher / Admin / Principal */}
                    <Route path="/attendance"     element={<RoleGuard allowedRoles={['super_admin','admin','principal','vice_principal','teacher','class_teacher']}><AttendancePage /></RoleGuard>} />
                    {/* Timetable — All staff */}
                    <Route path="/timetable"      element={<TimetablePage />} />
                    {/* Subject Assignments / Allocations Hub */}
                    <Route path="/subject-assignments" element={<RoleGuard allowedRoles={['super_admin','admin','principal','vice_principal']}><SubjectAssignmentsPage /></RoleGuard>} />
                    <Route path="/academics/subject-assignments" element={<RoleGuard allowedRoles={['super_admin','admin','principal','vice_principal']}><SubjectAssignmentsPage /></RoleGuard>} />

                    {/* Homework Portal */}
                    <Route path="/homework"       element={<HomeworkPortalPage />} />
                    {/* Communication — All logged-in */}
                    <Route path="/communication"  element={<CommunicationPage />} />
                    {/* Inventory — Admin / Office Staff */}
                    <Route path="/inventory"      element={<RoleGuard allowedRoles={['super_admin','admin','office_staff','clerk']}><InventoryPage /></RoleGuard>} />
                    {/* Analytics — Admin / Principal / VP */}
                    <Route path="/analytics"      element={<RoleGuard allowedRoles={['super_admin','admin','principal','vice_principal','accountant','exam_coordinator']}><AnalyticsPage /></RoleGuard>} />
                    {/* Settings — Super Admin only */}
                    <Route path="/settings"        element={<RoleGuard allowedRoles={['super_admin','admin']}><SettingsPage /></RoleGuard>} />
                    {/* Admin — Users & Roles — Super Admin only */}
                    <Route path="/admin/users"       element={<RoleGuard allowedRoles={['super_admin','admin']}><UserManagementPage /></RoleGuard>} />
                    <Route path="/admin/roles"       element={<RoleGuard allowedRoles={['super_admin']}><RoleManagementPage /></RoleGuard>} />
                    <Route path="/admin/permissions" element={<RoleGuard allowedRoles={['super_admin']}><PermissionsPage /></RoleGuard>} />
                    <Route path="/admin/audit"       element={<RoleGuard allowedRoles={['super_admin','admin','principal']}><AuditLogPage /></RoleGuard>} />

                    {/* Admission Module — Clerk / Admin / Principal */}
                    <Route path="/admission/new"        element={<RoleGuard allowedRoles={['super_admin','admin','principal','clerk','receptionist']}><AdmissionPage /></RoleGuard>} />
                    <Route path="/admission/gr"         element={<RoleGuard allowedRoles={['super_admin','admin','principal','vice_principal','clerk']}><AdmissionPage /></RoleGuard>} />
                    <Route path="/admission/promotions" element={<RoleGuard allowedRoles={['super_admin','admin','principal','vice_principal']}><AdmissionPage /></RoleGuard>} />
                    {/* Leave — All staff roles */}
                    <Route path="/leave"           element={<RoleGuard allowedRoles={['super_admin','admin','principal','vice_principal','teacher','class_teacher','clerk','accountant','librarian','receptionist','office_staff']}><LeavePage /></RoleGuard>} />
                    {/* Lesson Plans — Teacher / Class Teacher */}
                    <Route path="/lesson-plans"    element={<RoleGuard allowedRoles={['super_admin','admin','principal','vice_principal','teacher','class_teacher']}><LessonPlanPage /></RoleGuard>} />
                    {/* Behaviour Log — Teacher / Class Teacher / Principal */}
                    <Route path="/behaviour"        element={<RoleGuard allowedRoles={['super_admin','admin','principal','vice_principal','teacher','class_teacher']}><BehaviourLogPage /></RoleGuard>} />
                    {/* QR Scan Center — Admin / Librarian */}
                    <Route path="/qr-center"        element={<RoleGuard allowedRoles={['super_admin','admin','librarian','receptionist']}><QRScanCenterPage /></RoleGuard>} />
                    {/* AI Studio — All Staff & Admin */}
                    <Route path="/ai-hub"           element={<AIAssistantPage />} />
                    {/* Notification Center — All logged-in users */}
                    <Route path="/notifications"    element={<NotificationCenterPage />} />
                    {/* Transport — Transport Incharge / Admin / Principal */}
                    <Route path="/transport"         element={<RoleGuard allowedRoles={['super_admin','admin','principal','transport_incharge']}><TransportPage /></RoleGuard>} />
                  </Route>
                </Route>

                {/* ── Fallback ───────────────────────────────── */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
    </>
  );
}
