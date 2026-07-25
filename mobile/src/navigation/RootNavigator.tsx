/**
 * VidyaSetu Mobile — Role-Based Navigation
 * ==========================================
 * Each role sees a different set of bottom tabs and screens.
 * Matches backend RBAC permissions exactly.
 */
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, Text } from 'react-native';
import { useAuthStore } from '../store/authStore';

// ── Auth ──────────────────────────────────────────────────────
import LoginScreen from '../screens/auth/LoginScreen';

// ── Shared Screens ────────────────────────────────────────────
import ProfileScreen          from '../screens/profile/ProfileScreen';
import NotificationsScreen    from '../screens/shared/NotificationsScreen';
import SearchScreen           from '../screens/shared/SearchScreen';

// ── Admin / Principal / VP Screens ────────────────────────────
import AdminDashboardScreen   from '../screens/admin/AdminDashboardScreen';
import StudentListScreen      from '../screens/admin/StudentListScreen';
import ReportsScreen          from '../screens/admin/ReportsScreen';

// ── Teacher / Class Teacher Screens ───────────────────────────
import TeacherDashboardScreen from '../screens/teacher/TeacherDashboardScreen';
import AttendanceScreen       from '../screens/attendance/AttendanceScreen';
import MarksEntryScreen       from '../screens/teacher/MarksEntryScreen';
import LessonPlanScreen       from '../screens/teacher/LessonPlanScreen';

// ── Student Screens ───────────────────────────────────────────
import StudentDashboardScreen from '../screens/student/StudentDashboardScreen';
import MyAttendanceScreen     from '../screens/student/MyAttendanceScreen';
import MyResultsScreen        from '../screens/student/MyResultsScreen';
import TimetableScreen        from '../screens/shared/TimetableScreen';

// ── Parent Screens ────────────────────────────────────────────
import ParentDashboardScreen  from '../screens/parent/ParentDashboardScreen';
import FeeStatusScreen        from '../screens/parent/FeeStatusScreen';
import ChildAttendanceScreen  from '../screens/parent/ChildAttendanceScreen';

// ── Finance / Accountant Screens ──────────────────────────────
import FinanceDashboardScreen from '../screens/finance/FinanceDashboardScreen';
import FeesScreen             from '../screens/finance/FeesScreen';

// ── Library Screens ───────────────────────────────────────────
import LibraryDashboardScreen from '../screens/library/LibraryDashboardScreen';

// ── Office Screens ────────────────────────────────────────────
import OfficeDashboardScreen  from '../screens/office/OfficeDashboardScreen';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

const COLORS = {
  primary: '#4f46e5',
  surface: '#fff',
  textSecondary: '#6b7280',
};

const HEADER_OPTS = {
  headerStyle: { backgroundColor: COLORS.primary },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: '700' as const, fontSize: 17 },
};

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{icon}</Text>;
}

// ── Tab Screens ───────────────────────────────────────────────

/** ADMIN / PRINCIPAL / VICE PRINCIPAL */
function AdminTabs() {
  return (
    <Tab.Navigator screenOptions={{ ...HEADER_OPTS, tabBarActiveTintColor: COLORS.primary, tabBarInactiveTintColor: COLORS.textSecondary, tabBarStyle: { height: 62, paddingBottom: 6 }, tabBarLabelStyle: { fontSize: 11, fontWeight: '600' } }}>
      <Tab.Screen name="Dashboard"     component={AdminDashboardScreen}   options={{ headerTitle: '🏫 VidyaSetu', tabBarIcon: ({ focused }) => <TabIcon icon="🏠" focused={focused} /> }} />
      <Tab.Screen name="Students"      component={StudentListScreen}       options={{ headerTitle: '🎓 Students',  tabBarIcon: ({ focused }) => <TabIcon icon="🎓" focused={focused} /> }} />
      <Tab.Screen name="Attendance"    component={AttendanceScreen}        options={{ headerTitle: '📅 Attendance',tabBarIcon: ({ focused }) => <TabIcon icon="📅" focused={focused} /> }} />
      <Tab.Screen name="Notifications" component={NotificationsScreen}     options={{ headerTitle: '🔔 Notices',   tabBarIcon: ({ focused }) => <TabIcon icon="🔔" focused={focused} /> }} />
      <Tab.Screen name="Profile"       component={ProfileScreen}           options={{ headerTitle: '👤 Profile',   tabBarIcon: ({ focused }) => <TabIcon icon="👤" focused={focused} /> }} />
    </Tab.Navigator>
  );
}

/** TEACHER / CLASS TEACHER */
function TeacherTabs() {
  return (
    <Tab.Navigator screenOptions={{ ...HEADER_OPTS, tabBarActiveTintColor: COLORS.primary, tabBarInactiveTintColor: COLORS.textSecondary, tabBarStyle: { height: 62, paddingBottom: 6 }, tabBarLabelStyle: { fontSize: 11, fontWeight: '600' } }}>
      <Tab.Screen name="Dashboard"  component={TeacherDashboardScreen} options={{ headerTitle: '🏫 Teacher Panel', tabBarIcon: ({ focused }) => <TabIcon icon="🏠" focused={focused} /> }} />
      <Tab.Screen name="Attendance" component={AttendanceScreen}       options={{ headerTitle: '📅 Attendance',    tabBarIcon: ({ focused }) => <TabIcon icon="📅" focused={focused} /> }} />
      <Tab.Screen name="Marks"      component={MarksEntryScreen}       options={{ headerTitle: '📝 Marks Entry',   tabBarIcon: ({ focused }) => <TabIcon icon="📝" focused={focused} /> }} />
      <Tab.Screen name="Plans"      component={LessonPlanScreen}       options={{ headerTitle: '📖 Lesson Plans',  tabBarIcon: ({ focused }) => <TabIcon icon="📖" focused={focused} /> }} />
      <Tab.Screen name="Profile"    component={ProfileScreen}          options={{ headerTitle: '👤 Profile',       tabBarIcon: ({ focused }) => <TabIcon icon="👤" focused={focused} /> }} />
    </Tab.Navigator>
  );
}

/** STUDENT */
function StudentTabs() {
  return (
    <Tab.Navigator screenOptions={{ ...HEADER_OPTS, tabBarActiveTintColor: '#059669', tabBarInactiveTintColor: COLORS.textSecondary, tabBarStyle: { height: 62, paddingBottom: 6 }, tabBarLabelStyle: { fontSize: 11, fontWeight: '600' } }}>
      <Tab.Screen name="Dashboard"  component={StudentDashboardScreen} options={{ headerTitle: '🎓 Student Portal', tabBarIcon: ({ focused }) => <TabIcon icon="🏠" focused={focused} /> }} />
      <Tab.Screen name="Attendance" component={MyAttendanceScreen}     options={{ headerTitle: '📅 My Attendance',  tabBarIcon: ({ focused }) => <TabIcon icon="📅" focused={focused} /> }} />
      <Tab.Screen name="Timetable"  component={TimetableScreen}        options={{ headerTitle: '🕐 Timetable',      tabBarIcon: ({ focused }) => <TabIcon icon="🕐" focused={focused} /> }} />
      <Tab.Screen name="Results"    component={MyResultsScreen}        options={{ headerTitle: '📊 My Results',     tabBarIcon: ({ focused }) => <TabIcon icon="📊" focused={focused} /> }} />
      <Tab.Screen name="Profile"    component={ProfileScreen}          options={{ headerTitle: '👤 Profile',        tabBarIcon: ({ focused }) => <TabIcon icon="👤" focused={focused} /> }} />
    </Tab.Navigator>
  );
}

/** PARENT */
function ParentTabs() {
  return (
    <Tab.Navigator screenOptions={{ ...HEADER_OPTS, tabBarActiveTintColor: '#f59e0b', tabBarInactiveTintColor: COLORS.textSecondary, tabBarStyle: { height: 62, paddingBottom: 6 }, tabBarLabelStyle: { fontSize: 11, fontWeight: '600' } }}>
      <Tab.Screen name="Dashboard"  component={ParentDashboardScreen}  options={{ headerTitle: '👨‍👩‍👧 Parent Portal', tabBarIcon: ({ focused }) => <TabIcon icon="🏠" focused={focused} /> }} />
      <Tab.Screen name="Attendance" component={ChildAttendanceScreen}  options={{ headerTitle: '📅 Attendance',     tabBarIcon: ({ focused }) => <TabIcon icon="📅" focused={focused} /> }} />
      <Tab.Screen name="Fees"       component={FeeStatusScreen}        options={{ headerTitle: '💰 Fee Status',     tabBarIcon: ({ focused }) => <TabIcon icon="💰" focused={focused} /> }} />
      <Tab.Screen name="Notices"    component={NotificationsScreen}    options={{ headerTitle: '📢 Notices',        tabBarIcon: ({ focused }) => <TabIcon icon="📢" focused={focused} /> }} />
      <Tab.Screen name="Profile"    component={ProfileScreen}          options={{ headerTitle: '👤 Profile',        tabBarIcon: ({ focused }) => <TabIcon icon="👤" focused={focused} /> }} />
    </Tab.Navigator>
  );
}

/** ACCOUNTANT */
function AccountantTabs() {
  return (
    <Tab.Navigator screenOptions={{ ...HEADER_OPTS, tabBarActiveTintColor: '#059669', tabBarInactiveTintColor: COLORS.textSecondary, tabBarStyle: { height: 62, paddingBottom: 6 }, tabBarLabelStyle: { fontSize: 11, fontWeight: '600' } }}>
      <Tab.Screen name="Dashboard" component={FinanceDashboardScreen} options={{ headerTitle: '💰 Finance', tabBarIcon: ({ focused }) => <TabIcon icon="💰" focused={focused} /> }} />
      <Tab.Screen name="Fees"      component={FeesScreen}             options={{ headerTitle: '🧾 Fee Collection', tabBarIcon: ({ focused }) => <TabIcon icon="🧾" focused={focused} /> }} />
      <Tab.Screen name="Reports"   component={ReportsScreen}          options={{ headerTitle: '📊 Reports', tabBarIcon: ({ focused }) => <TabIcon icon="📊" focused={focused} /> }} />
      <Tab.Screen name="Profile"   component={ProfileScreen}          options={{ headerTitle: '👤 Profile', tabBarIcon: ({ focused }) => <TabIcon icon="👤" focused={focused} /> }} />
    </Tab.Navigator>
  );
}

/** LIBRARIAN */
function LibrarianTabs() {
  return (
    <Tab.Navigator screenOptions={{ ...HEADER_OPTS, tabBarActiveTintColor: '#d97706', tabBarInactiveTintColor: COLORS.textSecondary, tabBarStyle: { height: 62, paddingBottom: 6 }, tabBarLabelStyle: { fontSize: 11, fontWeight: '600' } }}>
      <Tab.Screen name="Library" component={LibraryDashboardScreen} options={{ headerTitle: '📚 Library', tabBarIcon: ({ focused }) => <TabIcon icon="📚" focused={focused} /> }} />
      <Tab.Screen name="Search"  component={SearchScreen}           options={{ headerTitle: '🔍 Search',  tabBarIcon: ({ focused }) => <TabIcon icon="🔍" focused={focused} /> }} />
      <Tab.Screen name="Profile" component={ProfileScreen}          options={{ headerTitle: '👤 Profile', tabBarIcon: ({ focused }) => <TabIcon icon="👤" focused={focused} /> }} />
    </Tab.Navigator>
  );
}

/** CLERK / RECEPTIONIST / OFFICE STAFF */
function OfficeTabs() {
  return (
    <Tab.Navigator screenOptions={{ ...HEADER_OPTS, tabBarActiveTintColor: '#0891b2', tabBarInactiveTintColor: COLORS.textSecondary, tabBarStyle: { height: 62, paddingBottom: 6 }, tabBarLabelStyle: { fontSize: 11, fontWeight: '600' } }}>
      <Tab.Screen name="Office"    component={OfficeDashboardScreen} options={{ headerTitle: '🏢 Office', tabBarIcon: ({ focused }) => <TabIcon icon="🏢" focused={focused} /> }} />
      <Tab.Screen name="Students"  component={StudentListScreen}     options={{ headerTitle: '🎓 Students', tabBarIcon: ({ focused }) => <TabIcon icon="🎓" focused={focused} /> }} />
      <Tab.Screen name="Notices"   component={NotificationsScreen}   options={{ headerTitle: '📢 Notices', tabBarIcon: ({ focused }) => <TabIcon icon="📢" focused={focused} /> }} />
      <Tab.Screen name="Profile"   component={ProfileScreen}         options={{ headerTitle: '👤 Profile', tabBarIcon: ({ focused }) => <TabIcon icon="👤" focused={focused} /> }} />
    </Tab.Navigator>
  );
}

// ── Role → Tab Navigator resolver ────────────────────────────
function MainNavigator() {
  const { user } = useAuthStore();
  const primaryRole = user?.roles?.[0]?.code ?? '';

  // Strict role-based isolation
  if (['teacher', 'class_teacher'].includes(primaryRole)) return <TeacherTabs />;
  if (['student'].includes(primaryRole))                   return <StudentTabs />;
  if (['parent'].includes(primaryRole))                    return <ParentTabs />;
  if (['accountant'].includes(primaryRole))                return <AccountantTabs />;
  if (['librarian'].includes(primaryRole))                 return <LibrarianTabs />;
  if (['clerk','receptionist','office_staff','transport_incharge','support_staff'].includes(primaryRole)) return <OfficeTabs />;

  // Default: admin / principal / vice_principal / super_admin / exam_coordinator
  return <AdminTabs />;
}

// ── Root Navigator ────────────────────────────────────────────
export default function RootNavigator() {
  const { isAuthenticated, isLoading, loadFromStorage } = useAuthStore();

  useEffect(() => { loadFromStorage(); }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#4f46e5' }}>
        <Text style={{ fontSize: 36, color: '#fff', fontWeight: '900', marginBottom: 20 }}>VS</Text>
        <ActivityIndicator color="#fff" size="large" />
        <Text style={{ color: 'rgba(255,255,255,0.7)', marginTop: 12, fontSize: 13 }}>
          VidyaSetu ERP...
        </Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <Stack.Screen name="Main" component={MainNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
