/**
 * EduShakti One ERP — Root Navigator (Premium Redesign)
 * ======================================================
 * Role-based navigation with premium tab bar, animated splash,
 * FontAwesome5 icons, and theme-aware headers.
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
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import StudentListScreen    from '../screens/admin/StudentListScreen';
import ReportsScreen        from '../screens/admin/ReportsScreen';

// ── Teacher / Class Teacher ───────────────────────────────────────────────────
import TeacherDashboardScreen from '../screens/teacher/TeacherDashboardScreen';
import AttendanceScreen       from '../screens/attendance/AttendanceScreen';
import MarksEntryScreen       from '../screens/teacher/MarksEntryScreen';
import LessonPlanScreen       from '../screens/teacher/LessonPlanScreen';

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

// ── Office ────────────────────────────────────────────────────────────────────
import OfficeDashboardScreen from '../screens/office/OfficeDashboardScreen';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

// ─────────────────────────────────────────────────────────────────────────────
// Premium Splash Screen
// ─────────────────────────────────────────────────────────────────────────────
function SplashScreen() {
  const { roleAccent, isDark } = useTheme();
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
  const { colors, roleAccent } = useTheme();
  return {
    headerStyle: { backgroundColor: colors.header },
    headerTintColor: colors.headerText,
    headerTitleStyle: { fontWeight: '700' as const, fontSize: 17, color: colors.headerText },
    headerShadowVisible: false,
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
// Role Tab Navigators
// ─────────────────────────────────────────────────────────────────────────────
function AdminTabs() {
  return (
    <Tab.Navigator screenOptions={TAB_OPTS}>
      <Tab.Screen name="Dashboard"     component={AdminDashboardScreen}   />
      <Tab.Screen name="Students"      component={StudentListScreen}       />
      <Tab.Screen name="Attendance"    component={AttendanceScreen}        />
      <Tab.Screen name="Notifications" component={NotificationsScreen}     />
      <Tab.Screen name="Profile"       component={ProfileScreen}           />
    </Tab.Navigator>
  );
}

function TeacherTabs() {
  return (
    <Tab.Navigator screenOptions={TAB_OPTS}>
      <Tab.Screen name="Dashboard"  component={TeacherDashboardScreen} />
      <Tab.Screen name="Attendance" component={AttendanceScreen}       />
      <Tab.Screen name="Marks"      component={MarksEntryScreen}       />
      <Tab.Screen name="Plans"      component={LessonPlanScreen}       />
      <Tab.Screen name="Profile"    component={ProfileScreen}          />
    </Tab.Navigator>
  );
}

function StudentTabs() {
  return (
    <Tab.Navigator screenOptions={TAB_OPTS}>
      <Tab.Screen name="Dashboard"  component={StudentDashboardScreen} />
      <Tab.Screen name="Attendance" component={MyAttendanceScreen}     />
      <Tab.Screen name="Timetable"  component={TimetableScreen}        />
      <Tab.Screen name="Results"    component={MyResultsScreen}        />
      <Tab.Screen name="Profile"    component={ProfileScreen}          />
    </Tab.Navigator>
  );
}

function ParentTabs() {
  return (
    <Tab.Navigator screenOptions={TAB_OPTS}>
      <Tab.Screen name="Dashboard"  component={ParentDashboardScreen}  />
      <Tab.Screen name="Attendance" component={ChildAttendanceScreen}  />
      <Tab.Screen name="Fees"       component={FeeStatusScreen}        />
      <Tab.Screen name="Notices"    component={NotificationsScreen}    />
      <Tab.Screen name="Profile"    component={ProfileScreen}          />
    </Tab.Navigator>
  );
}

function AccountantTabs() {
  return (
    <Tab.Navigator screenOptions={TAB_OPTS}>
      <Tab.Screen name="Dashboard" component={FinanceDashboardScreen} />
      <Tab.Screen name="Fees"      component={FeesScreen}             />
      <Tab.Screen name="Reports"   component={ReportsScreen}          />
      <Tab.Screen name="Profile"   component={ProfileScreen}          />
    </Tab.Navigator>
  );
}

function LibrarianTabs() {
  return (
    <Tab.Navigator screenOptions={TAB_OPTS}>
      <Tab.Screen name="Library" component={LibraryDashboardScreen} />
      <Tab.Screen name="Search"  component={SearchScreen}           />
      <Tab.Screen name="Profile" component={ProfileScreen}          />
    </Tab.Navigator>
  );
}

function OfficeTabs() {
  return (
    <Tab.Navigator screenOptions={TAB_OPTS}>
      <Tab.Screen name="Office"    component={OfficeDashboardScreen} />
      <Tab.Screen name="Students"  component={StudentListScreen}     />
      <Tab.Screen name="Notices"   component={NotificationsScreen}   />
      <Tab.Screen name="Profile"   component={ProfileScreen}         />
    </Tab.Navigator>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Role Resolver
// ─────────────────────────────────────────────────────────────────────────────
function MainNavigator() {
  const { user } = useAuthStore();
  const { setRoleCode } = useTheme();
  const role = user?.roles?.[0]?.code ?? 'admin';

  useEffect(() => { setRoleCode(role); }, [role]);

  if (['teacher', 'class_teacher'].includes(role))           return <TeacherTabs />;
  if (role === 'student')                                     return <StudentTabs />;
  if (role === 'parent')                                      return <ParentTabs />;
  if (role === 'accountant')                                  return <AccountantTabs />;
  if (role === 'librarian')                                   return <LibrarianTabs />;
  if (['clerk','receptionist','office_staff','transport_incharge','support_staff'].includes(role))
                                                              return <OfficeTabs />;
  return <AdminTabs />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Root Navigator
// ─────────────────────────────────────────────────────────────────────────────
export default function RootNavigator() {
  const { isAuthenticated, isLoading, loadFromStorage } = useAuthStore();
  const { isDark, colors } = useTheme();

  useEffect(() => { loadFromStorage(); }, []);

  // Build navigation theme from our design system
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
