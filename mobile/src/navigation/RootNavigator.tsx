/**
 * EduShakti One ERP — Root Navigator (Feature Complete)
 * ======================================================
 * Role-based navigation with premium tab bar, animated splash,
 * FontAwesome5 icons, and theme-aware headers.
 * Wires ALL 40+ screens from implementation plan.
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated, StatusBar } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../theme/ThemeContext';
import PremiumTabBar from '../components/navigation/PremiumTabBar';

// ── Auth ──────────────────────────────────────────────────────────────────────
import LoginScreen from '../screens/auth/LoginScreen';

// ── Shared Screens ────────────────────────────────────────────────────────────
import ProfileScreen       from '../screens/profile/ProfileScreen';
import NotificationsScreen from '../screens/shared/NotificationsScreen';
import SearchScreen        from '../screens/shared/SearchScreen';
import TimetableScreen     from '../screens/shared/TimetableScreen';

// ── Admin / Principal / VP ────────────────────────────────────────────────────
import AdminDashboardScreen  from '../screens/admin/AdminDashboardScreen';
import StudentListScreen     from '../screens/admin/StudentListScreen';
import StudentDetailScreen   from '../screens/admin/StudentDetailScreen';
import ReportsScreen         from '../screens/admin/ReportsScreen';
import AnalyticsScreen       from '../screens/admin/AnalyticsScreen';
import UserManagementScreen  from '../screens/admin/UserManagementScreen';

// ── Teacher / Class Teacher ───────────────────────────────────────────────────
import TeacherDashboardScreen from '../screens/teacher/TeacherDashboardScreen';
import AttendanceScreen       from '../screens/attendance/AttendanceScreen';
import LessonPlanScreen       from '../screens/teacher/LessonPlanScreen';

// ── Exam Module ───────────────────────────────────────────────────────────────
import ExamDashboardScreen from '../screens/exam/ExamDashboardScreen';
import ExamScheduleScreen  from '../screens/exam/ExamScheduleScreen';
import MarksEntryScreen    from '../screens/exam/MarksEntryScreen';
import ExamResultsScreen   from '../screens/exam/ExamResultsScreen';
import ReportCardScreen    from '../screens/exam/ReportCardScreen';

// ── Homework Module ───────────────────────────────────────────────────────────
import HomeworkPortalScreen from '../screens/homework/HomeworkPortalScreen';

// ── Leave Module ──────────────────────────────────────────────────────────────
import LeaveManagementScreen from '../screens/leave/LeaveManagementScreen';

// ── Communication ─────────────────────────────────────────────────────────────
import CommunicationScreen from '../screens/communication/CommunicationScreen';

// ── Student ───────────────────────────────────────────────────────────────────
import StudentDashboardScreen from '../screens/student/StudentDashboardScreen';
import MyAttendanceScreen     from '../screens/student/MyAttendanceScreen';
import MyResultsScreen        from '../screens/student/MyResultsScreen';

// ── Parent ────────────────────────────────────────────────────────────────────
import ParentDashboardScreen from '../screens/parent/ParentDashboardScreen';
import FeeStatusScreen       from '../screens/parent/FeeStatusScreen';
import ChildAttendanceScreen from '../screens/parent/ChildAttendanceScreen';

// ── Finance ───────────────────────────────────────────────────────────────────
import FinanceDashboardScreen from '../screens/finance/FinanceDashboardScreen';
import FeesScreen             from '../screens/finance/FeesScreen';

// ── Library ───────────────────────────────────────────────────────────────────
import LibraryDashboardScreen from '../screens/library/LibraryDashboardScreen';

// ── Transport ─────────────────────────────────────────────────────────────────
import TransportDashboardScreen from '../screens/transport/TransportDashboardScreen';

// ── Office ────────────────────────────────────────────────────────────────────
import OfficeDashboardScreen from '../screens/office/OfficeDashboardScreen';

// ── Admission Module ───────────────────────────────────────────────
import AdmissionManagementScreen from '../screens/admission/AdmissionManagementScreen';

// ── Behaviour Module ───────────────────────────────────────────────
import BehaviourLogScreen from '../screens/behaviour/BehaviourLogScreen';

// ── Announcements (standalone) ────────────────────────────────────
import AnnouncementsScreen from '../screens/communication/AnnouncementsScreen';

// ── Inventory Module ──────────────────────────────────────────────
import InventoryScreen from '../screens/inventory/InventoryScreen';

// ── QR Center & Digital ID ────────────────────────────────────────
import QRScanScreen from '../screens/qr/QRScanScreen';

// ── Academics & Subject Allocations ───────────────────────────────
import SubjectAssignmentsScreen from '../screens/academics/SubjectAssignmentsScreen';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();


// ─────────────────────────────────────────────────────────────────────────────
// Premium Splash Screen
// ─────────────────────────────────────────────────────────────────────────────
function SplashScreen() {
  const { roleAccent } = useTheme();
  const logoScale   = React.useRef(new Animated.Value(0.6)).current;
  const logoOpacity = React.useRef(new Animated.Value(0)).current;
  const textOpacity = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale,   { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.timing(textOpacity, { toValue: 1, duration: 300, delay: 100, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={[styles.splash, { backgroundColor: roleAccent.gradient[0] ?? '#4f46e5' }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <Animated.View style={[styles.splashLogo, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
        <Text style={styles.splashLogoText}>ES</Text>
      </Animated.View>
      <Animated.View style={{ opacity: textOpacity, alignItems: 'center', marginTop: 20 }}>
        <Text style={styles.splashTitle}>EduShakti One</Text>
        <Text style={styles.splashSubtitle}>Enterprise ERP Platform</Text>
      </Animated.View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Header Options Factory
// ─────────────────────────────────────────────────────────────────────────────
function useHeaderOpts() {
  const { colors } = useTheme();
  return {
    headerStyle: { backgroundColor: colors.header },
    headerTintColor: colors.headerText,
    headerTitleStyle: { fontWeight: '700' as const, fontSize: 17, color: colors.headerText },
    headerShadowVisible: false,
    headerBackTitleVisible: false,
    animation: 'slide_from_right' as const,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared Tab Options
// ─────────────────────────────────────────────────────────────────────────────
const TAB_OPTS = {
  tabBar: (props: any) => <PremiumTabBar {...props} />,
  headerShown: false,
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN STACK — full admin suite
// ─────────────────────────────────────────────────────────────────────────────
function AdminStack() {
  const h = useHeaderOpts();
  return (
    <Stack.Navigator screenOptions={h}>
      <Stack.Screen name="AdminDashboard"    component={AdminDashboardScreen}      options={{ title: 'Dashboard' }} />
      <Stack.Screen name="Students"          component={StudentListScreen}          options={{ title: 'Students' }} />
      <Stack.Screen name="StudentDetail"     component={StudentDetailScreen}        options={{ title: 'Student Profile' }} />
      <Stack.Screen name="Attendance"        component={AttendanceScreen}           options={{ title: 'Attendance' }} />
      <Stack.Screen name="Analytics"         component={AnalyticsScreen}            options={{ title: 'Analytics' }} />
      <Stack.Screen name="ExamDashboard"     component={ExamDashboardScreen}        options={{ title: 'Exams' }} />
      <Stack.Screen name="ExamSchedule"      component={ExamScheduleScreen}         options={{ title: 'Exam Schedules' }} />
      <Stack.Screen name="ExamMarks"         component={MarksEntryScreen}           options={{ title: 'Enter Marks' }} />
      <Stack.Screen name="ExamResults"       component={ExamResultsScreen}          options={{ title: 'Results' }} />
      <Stack.Screen name="ReportCard"        component={ReportCardScreen}           options={{ title: 'Report Card' }} />
      <Stack.Screen name="HomeworkPortal"    component={HomeworkPortalScreen}       options={{ title: 'Homework' }} />
      <Stack.Screen name="Leave"             component={LeaveManagementScreen}      options={{ title: 'Leave Management' }} />
      <Stack.Screen name="Communication"     component={CommunicationScreen}        options={{ title: 'Communication' }} />
      <Stack.Screen name="UserManagement"    component={UserManagementScreen}       options={{ title: 'Users' }} />
      <Stack.Screen name="Reports"           component={ReportsScreen}              options={{ title: 'Reports' }} />
      <Stack.Screen name="FinanceDashboard"  component={FinanceDashboardScreen}     options={{ title: 'Finance' }} />
      <Stack.Screen name="FeeCollection"     component={FeesScreen}                 options={{ title: 'Collect Fees' }} />
      <Stack.Screen name="Profile"           component={ProfileScreen}              options={{ title: 'My Profile' }} />
      <Stack.Screen name="Notifications"     component={NotificationsScreen}        options={{ title: 'Notifications' }} />
      <Stack.Screen name="Admission"         component={AdmissionManagementScreen}  options={{ title: 'Admissions' }} />
      <Stack.Screen name="Behaviour"         component={BehaviourLogScreen}         options={{ title: 'Behaviour Log' }} />
      <Stack.Screen name="BehaviourLog"      component={BehaviourLogScreen}         options={{ title: 'Behaviour Log' }} />
      <Stack.Screen name="Announcements"     component={AnnouncementsScreen}        options={{ title: 'Announcements' }} />
      <Stack.Screen name="Notices"           component={CommunicationScreen}        options={{ title: 'Notices & Announcements' }} />
      <Stack.Screen name="Inventory"         component={InventoryScreen}            options={{ title: 'Inventory Management' }} />
      <Stack.Screen name="QRScan"            component={QRScanScreen}               options={{ title: 'QR Center & Digital ID' }} />
      <Stack.Screen name="SubjectAssignments" component={SubjectAssignmentsScreen} options={{ title: 'Subject Allocations' }} />
    </Stack.Navigator>
  );
}

// AdminStudentsStack — wraps StudentList with full navigation context
function AdminStudentsStack() {
  const h = useHeaderOpts();
  return (
    <Stack.Navigator screenOptions={h}>
      <Stack.Screen name="StudentsList"  component={StudentListScreen}   options={{ title: 'Students' }} />
      <Stack.Screen name="StudentDetail" component={StudentDetailScreen} options={{ title: 'Student Profile' }} />
      <Stack.Screen name="ReportCard"    component={ReportCardScreen}    options={{ title: 'Report Card' }} />
    </Stack.Navigator>
  );
}

// AdminCommunicationStack — wraps Communication with full navigation context
function AdminCommunicationStack() {
  const h = useHeaderOpts();
  return (
    <Stack.Navigator screenOptions={h}>
      <Stack.Screen name="CommunicationMain" component={CommunicationScreen}  options={{ title: 'Communication' }} />
      <Stack.Screen name="Announcements"     component={AnnouncementsScreen}  options={{ title: 'Announcements' }} />
      <Stack.Screen name="Notices"           component={CommunicationScreen}  options={{ title: 'Notices & Announcements' }} />
    </Stack.Navigator>
  );
}

function AdminAnalyticsStack() {
  const h = useHeaderOpts();
  return (
    <Stack.Navigator screenOptions={h}>
      <Stack.Screen name="AnalyticsMain" component={AnalyticsScreen} options={{ title: 'Analytics' }} />
    </Stack.Navigator>
  );
}

function AdminTabs() {
  return (
    <Tab.Navigator screenOptions={TAB_OPTS}>
      <Tab.Screen name="Dashboard"     component={AdminStack}              />
      <Tab.Screen name="Students"      component={AdminStudentsStack}      />
      <Tab.Screen name="Analytics"     component={AdminAnalyticsStack}     />
      <Tab.Screen name="Communication" component={AdminCommunicationStack} />
      <Tab.Screen name="Profile"       component={ProfileScreen}           />
    </Tab.Navigator>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TEACHER STACK
// ─────────────────────────────────────────────────────────────────────────────
function TeacherStack() {
  const h = useHeaderOpts();
  return (
    <Stack.Navigator screenOptions={h}>
      <Stack.Screen name="TeacherDashboard" component={TeacherDashboardScreen}  options={{ title: 'Dashboard' }} />
      <Stack.Screen name="Attendance"       component={AttendanceScreen}        options={{ title: 'Attendance' }} />
      <Stack.Screen name="ExamDashboard"    component={ExamDashboardScreen}     options={{ title: 'Exams' }} />
      <Stack.Screen name="ExamSchedule"     component={ExamScheduleScreen}      options={{ title: 'Exam Schedule' }} />
      <Stack.Screen name="ExamMarks"        component={MarksEntryScreen}        options={{ title: 'Enter Marks' }} />
      <Stack.Screen name="ExamResults"      component={ExamResultsScreen}       options={{ title: 'Results' }} />
      <Stack.Screen name="ReportCard"       component={ReportCardScreen}        options={{ title: 'Report Card' }} />
      <Stack.Screen name="StudentDetail"    component={StudentDetailScreen}     options={{ title: 'Student Profile' }} />
      <Stack.Screen name="HomeworkPortal"   component={HomeworkPortalScreen}    options={{ title: 'Homework' }} />
      <Stack.Screen name="Leave"            component={LeaveManagementScreen}   options={{ title: 'Leave' }} />
      <Stack.Screen name="Timetable"        component={TimetableScreen}         options={{ title: 'Timetable' }} />
      <Stack.Screen name="Communication"    component={CommunicationScreen}     options={{ title: 'Communication' }} />
      <Stack.Screen name="Profile"          component={ProfileScreen}           options={{ title: 'My Profile' }} />
      <Stack.Screen name="Notifications"    component={NotificationsScreen}     options={{ title: 'Notifications' }} />
      <Stack.Screen name="Announcements"    component={AnnouncementsScreen}     options={{ title: 'Announcements' }} />
      <Stack.Screen name="Notices"          component={CommunicationScreen}     options={{ title: 'Notices & Announcements' }} />
      <Stack.Screen name="Behaviour"        component={BehaviourLogScreen}      options={{ title: 'Behaviour Log' }} />
      <Stack.Screen name="BehaviourLog"     component={BehaviourLogScreen}      options={{ title: 'Behaviour Log' }} />
      <Stack.Screen name="QRScan"           component={QRScanScreen}            options={{ title: 'QR Scanner' }} />
      <Stack.Screen name="SubjectAssignments" component={SubjectAssignmentsScreen} options={{ title: 'Subject Allocations' }} />
    </Stack.Navigator>
  );
}

function TeacherTabs() {
  return (
    <Tab.Navigator screenOptions={TAB_OPTS}>
      <Tab.Screen name="Dashboard"  component={TeacherStack}        />
      <Tab.Screen name="Attendance" component={AttendanceScreen}    />
      <Tab.Screen name="Homework"   component={HomeworkPortalScreen}/>
      <Tab.Screen name="Plans"      component={LessonPlanScreen}    />
      <Tab.Screen name="Profile"    component={ProfileScreen}       />
    </Tab.Navigator>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STUDENT STACK
// ─────────────────────────────────────────────────────────────────────────────
function StudentStack() {
  const h = useHeaderOpts();
  return (
    <Stack.Navigator screenOptions={h}>
      <Stack.Screen name="StudentDashboard" component={StudentDashboardScreen} options={{ title: 'My Dashboard' }} />
      <Stack.Screen name="MyAttendance"     component={MyAttendanceScreen}     options={{ title: 'My Attendance' }} />
      <Stack.Screen name="MyResults"        component={MyResultsScreen}        options={{ title: 'My Results' }} />
      <Stack.Screen name="ReportCard"       component={ReportCardScreen}       options={{ title: 'Report Card' }} />
      <Stack.Screen name="MyHomework"       component={HomeworkPortalScreen}   options={{ title: 'My Homework' }} />
      <Stack.Screen name="MyLeave"          component={LeaveManagementScreen}  options={{ title: 'My Leave' }} />
      <Stack.Screen name="Timetable"        component={TimetableScreen}        options={{ title: 'Timetable' }} />
      <Stack.Screen name="Announcements"    component={AnnouncementsScreen}    options={{ title: 'Announcements' }} />
      <Stack.Screen name="Communication"    component={CommunicationScreen}    options={{ title: 'Communication' }} />
      <Stack.Screen name="Notices"          component={CommunicationScreen}    options={{ title: 'Notices & Announcements' }} />
      <Stack.Screen name="Profile"          component={ProfileScreen}          options={{ title: 'My Profile' }} />
      <Stack.Screen name="Notifications"    component={NotificationsScreen}    options={{ title: 'Notifications' }} />
      <Stack.Screen name="QRScan"           component={QRScanScreen}           options={{ title: 'Digital ID Pass' }} />
    </Stack.Navigator>
  );
}

function StudentTabs() {
  return (
    <Tab.Navigator screenOptions={TAB_OPTS}>
      <Tab.Screen name="Dashboard"  component={StudentStack}         />
      <Tab.Screen name="Attendance" component={MyAttendanceScreen}   />
      <Tab.Screen name="Homework"   component={HomeworkPortalScreen} />
      <Tab.Screen name="Results"    component={MyResultsScreen}      />
      <Tab.Screen name="Profile"    component={ProfileScreen}        />
    </Tab.Navigator>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PARENT STACK
// ─────────────────────────────────────────────────────────────────────────────
function ParentStack() {
  const h = useHeaderOpts();
  return (
    <Stack.Navigator screenOptions={h}>
      <Stack.Screen name="ParentDashboard"  component={ParentDashboardScreen}  options={{ title: 'My Dashboard' }} />
      <Stack.Screen name="ChildAttendance"  component={ChildAttendanceScreen}  options={{ title: 'Attendance' }} />
      <Stack.Screen name="ChildFees"        component={FeeStatusScreen}        options={{ title: 'Fee Status' }} />
      <Stack.Screen name="ChildHomework"    component={HomeworkPortalScreen}   options={{ title: 'Homework' }} />
      <Stack.Screen name="ChildResults"     component={ExamResultsScreen}      options={{ title: 'Results' }} />
      <Stack.Screen name="ReportCard"       component={ReportCardScreen}       options={{ title: 'Report Card' }} />
      <Stack.Screen name="ChildLeave"       component={LeaveManagementScreen}  options={{ title: 'Leave Application' }} />
      <Stack.Screen name="Announcements"    component={AnnouncementsScreen}    options={{ title: 'Announcements' }} />
      <Stack.Screen name="Communication"    component={CommunicationScreen}    options={{ title: 'Communication' }} />
      <Stack.Screen name="Notices"          component={CommunicationScreen}    options={{ title: 'Notices & Announcements' }} />
      <Stack.Screen name="Profile"          component={ProfileScreen}          options={{ title: 'My Profile' }} />
      <Stack.Screen name="Notifications"    component={NotificationsScreen}    options={{ title: 'Notifications' }} />
      <Stack.Screen name="QRScan"           component={QRScanScreen}           options={{ title: 'Student Digital ID' }} />
    </Stack.Navigator>
  );
}

function ParentTabs() {
  return (
    <Tab.Navigator screenOptions={TAB_OPTS}>
      <Tab.Screen name="Dashboard"  component={ParentStack}          />
      <Tab.Screen name="Attendance" component={ChildAttendanceScreen}/>
      <Tab.Screen name="Fees"       component={FeeStatusScreen}      />
      <Tab.Screen name="Notices"    component={CommunicationScreen}  />
      <Tab.Screen name="Profile"    component={ProfileScreen}        />
    </Tab.Navigator>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ACCOUNTANT STACK
// ─────────────────────────────────────────────────────────────────────────────
function AccountantStack() {
  const h = useHeaderOpts();
  return (
    <Stack.Navigator screenOptions={h}>
      <Stack.Screen name="FinanceDashboard" component={FinanceDashboardScreen} options={{ title: 'Finance Dashboard' }} />
      <Stack.Screen name="FeeCollection"    component={FeesScreen}             options={{ title: 'Collect Fees' }} />
      <Stack.Screen name="Reports"          component={ReportsScreen}          options={{ title: 'Finance Reports' }} />
      <Stack.Screen name="Leave"            component={LeaveManagementScreen}  options={{ title: 'Leave' }} />
      <Stack.Screen name="Communication"    component={CommunicationScreen}    options={{ title: 'Communication' }} />
      <Stack.Screen name="Notices"          component={CommunicationScreen}    options={{ title: 'Notices & Announcements' }} />
      <Stack.Screen name="Profile"          component={ProfileScreen}          options={{ title: 'My Profile' }} />
    </Stack.Navigator>
  );
}

function AccountantTabs() {
  return (
    <Tab.Navigator screenOptions={TAB_OPTS}>
      <Tab.Screen name="Dashboard" component={AccountantStack}       />
      <Tab.Screen name="Fees"      component={FeesScreen}            />
      <Tab.Screen name="Reports"   component={ReportsScreen}         />
      <Tab.Screen name="Profile"   component={ProfileScreen}         />
    </Tab.Navigator>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LIBRARIAN STACK
// ─────────────────────────────────────────────────────────────────────────────
function LibrarianStack() {
  const h = useHeaderOpts();
  return (
    <Stack.Navigator screenOptions={h}>
      <Stack.Screen name="LibraryDashboard" component={LibraryDashboardScreen} options={{ title: 'Library' }} />
      <Stack.Screen name="BookSearch"       component={SearchScreen}           options={{ title: 'Search Books' }} />
      <Stack.Screen name="Leave"            component={LeaveManagementScreen}  options={{ title: 'Leave' }} />
      <Stack.Screen name="Communication"    component={CommunicationScreen}    options={{ title: 'Communication' }} />
      <Stack.Screen name="Notices"          component={CommunicationScreen}    options={{ title: 'Notices & Announcements' }} />
      <Stack.Screen name="QRScan"           component={QRScanScreen}           options={{ title: 'Barcode Scanner' }} />
      <Stack.Screen name="Profile"          component={ProfileScreen}          options={{ title: 'My Profile' }} />
    </Stack.Navigator>
  );
}

function LibrarianTabs() {
  return (
    <Tab.Navigator screenOptions={TAB_OPTS}>
      <Tab.Screen name="Library"  component={LibrarianStack}          />
      <Tab.Screen name="Search"   component={SearchScreen}            />
      <Tab.Screen name="Profile"  component={ProfileScreen}           />
    </Tab.Navigator>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TRANSPORT STACK
// ─────────────────────────────────────────────────────────────────────────────
function TransportStack() {
  const h = useHeaderOpts();
  return (
    <Stack.Navigator screenOptions={h}>
      <Stack.Screen name="TransportDashboard" component={TransportDashboardScreen} options={{ title: 'Transport' }} />
      <Stack.Screen name="Leave"              component={LeaveManagementScreen}    options={{ title: 'Leave' }} />
      <Stack.Screen name="Communication"      component={CommunicationScreen}      options={{ title: 'Communication' }} />
      <Stack.Screen name="Notices"            component={CommunicationScreen}      options={{ title: 'Notices & Announcements' }} />
      <Stack.Screen name="Profile"            component={ProfileScreen}            options={{ title: 'My Profile' }} />
    </Stack.Navigator>
  );
}

function TransportTabs() {
  return (
    <Tab.Navigator screenOptions={TAB_OPTS}>
      <Tab.Screen name="Transport"     component={TransportStack}          />
      <Tab.Screen name="Notices"       component={CommunicationScreen}     />
      <Tab.Screen name="Profile"       component={ProfileScreen}           />
    </Tab.Navigator>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OFFICE STACK
// ─────────────────────────────────────────────────────────────────────────────
function OfficeStack() {
  const h = useHeaderOpts();
  return (
    <Stack.Navigator screenOptions={h}>
      <Stack.Screen name="OfficeDashboard"  component={OfficeDashboardScreen}  options={{ title: 'Office' }} />
      <Stack.Screen name="Students"         component={StudentListScreen}       options={{ title: 'Students' }} />
      <Stack.Screen name="StudentDetail"    component={StudentDetailScreen}     options={{ title: 'Student Profile' }} />
      <Stack.Screen name="Leave"            component={LeaveManagementScreen}   options={{ title: 'Leave' }} />
      <Stack.Screen name="Communication"    component={CommunicationScreen}     options={{ title: 'Communication' }} />
      <Stack.Screen name="Notices"          component={CommunicationScreen}     options={{ title: 'Notices & Announcements' }} />
      <Stack.Screen name="Announcements"    component={AnnouncementsScreen}     options={{ title: 'Announcements' }} />
      <Stack.Screen name="Admission"        component={AdmissionManagementScreen} options={{ title: 'Admissions' }} />
      <Stack.Screen name="FeeCollection"    component={FeesScreen}              options={{ title: 'Fee Collection' }} />
      <Stack.Screen name="Reports"          component={ReportsScreen}           options={{ title: 'Reports' }} />
      <Stack.Screen name="Inventory"        component={InventoryScreen}         options={{ title: 'Inventory Management' }} />
      <Stack.Screen name="QRScan"           component={QRScanScreen}            options={{ title: 'QR Verification' }} />
      <Stack.Screen name="Profile"          component={ProfileScreen}           options={{ title: 'My Profile' }} />
      <Stack.Screen name="Notifications"    component={NotificationsScreen}     options={{ title: 'Notifications' }} />
    </Stack.Navigator>
  );
}

// OfficeStudentsStack — wraps StudentList with navigation context for office role
function OfficeStudentsStack() {
  const h = useHeaderOpts();
  return (
    <Stack.Navigator screenOptions={h}>
      <Stack.Screen name="StudentsList"  component={StudentListScreen}   options={{ title: 'Students' }} />
      <Stack.Screen name="StudentDetail" component={StudentDetailScreen} options={{ title: 'Student Profile' }} />
    </Stack.Navigator>
  );
}

function OfficeTabs() {
  return (
    <Tab.Navigator screenOptions={TAB_OPTS}>
      <Tab.Screen name="Office"   component={OfficeStack}           />
      <Tab.Screen name="Students" component={OfficeStudentsStack}   />
      <Tab.Screen name="Notices"  component={CommunicationScreen}   />
      <Tab.Screen name="Profile"  component={ProfileScreen}         />
    </Tab.Navigator>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Role Resolver — maps role code to appropriate Tab Navigator
// ─────────────────────────────────────────────────────────────────────────────
function resolveRoleCode(u: any): string {
  if (!u) return 'admin';
  if (typeof u.role === 'string' && u.role) return u.role.toLowerCase();
  if (Array.isArray(u.roles) && u.roles.length > 0) {
    const r0 = u.roles[0];
    if (typeof r0 === 'string' && r0) return r0.toLowerCase();
    if (typeof r0 === 'object' && r0?.code) return r0.code.toLowerCase();
  }
  return 'admin';
}

function MainNavigator() {
  const { user } = useAuthStore();
  const { setRoleCode } = useTheme();
  const role = resolveRoleCode(user);

  useEffect(() => { setRoleCode(role); }, [role]);

  // Teacher roles
  if (['teacher', 'class_teacher'].includes(role))                return <TeacherTabs />;
  // Student
  if (role === 'student')                                          return <StudentTabs />;
  // Parent
  if (role === 'parent')                                           return <ParentTabs />;
  // Finance / Accountant
  if (role === 'accountant')                                       return <AccountantTabs />;
  // Library
  if (role === 'librarian')                                        return <LibrarianTabs />;
  // Transport
  if (role === 'transport_incharge')                               return <TransportTabs />;
  // Exam Coordinator → use Admin tabs (has exam access)
  if (role === 'exam_coordinator')                                 return <AdminTabs />;
  // Office roles
  if (['clerk', 'receptionist', 'office_staff', 'support_staff'].includes(role))
                                                                   return <OfficeTabs />;
  // Admin, Principal, VP, Super Admin
  return <AdminTabs />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Root Navigator
// ─────────────────────────────────────────────────────────────────────────────
export default function RootNavigator() {
  const { isAuthenticated, isLoading, loadFromStorage } = useAuthStore();
  const { isDark, colors } = useTheme();

  useEffect(() => { loadFromStorage(); }, []);

  const navTheme = isDark
    ? { ...DarkTheme,    colors: { ...DarkTheme.colors,    background: colors.background, card: colors.surface, border: colors.border, text: colors.text } }
    : { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.background, card: colors.surface, border: colors.border, text: colors.text } };

  if (isLoading) return <SplashScreen />;

  return (
    <NavigationContainer theme={navTheme as any}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <Stack.Screen name="Main" component={MainNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashLogo: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  splashLogoText: {
    color: '#fff',
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: -1,
  },
  splashTitle: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  splashSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
  },
});
