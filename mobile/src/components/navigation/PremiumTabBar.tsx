/**
 * VidyaSetu Mobile — PremiumTabBar Navigation Component
 * ========================================================
 * Floating bottom navigation bar with sliding spring pill indicator,
 * high-contrast role-aware icons, tab labels, and badge support.
 */
import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTheme } from '../../theme/ThemeContext';
import { shadows, radius, typography, spacing } from '../../theme';

const { width } = Dimensions.get('window');

// Tab icon map
const TAB_ICONS: Record<string, { icon: string; faName: string }> = {
  Dashboard:     { icon: 'home',            faName: 'home' },
  Home:          { icon: 'home',            faName: 'home' },
  Students:      { icon: 'user-graduate',   faName: 'graduation-cap' },
  Attendance:    { icon: 'clipboard-check', faName: 'check-square' },
  Analytics:     { icon: 'chart-line',      faName: 'line-chart' },
  Homework:      { icon: 'tasks',           faName: 'tasks' },
  Plans:         { icon: 'book-open',       faName: 'book' },
  Results:       { icon: 'award',           faName: 'trophy' },
  Fees:          { icon: 'rupee-sign',      faName: 'money' },
  Notices:       { icon: 'bullhorn',        faName: 'bullhorn' },
  Reports:       { icon: 'chart-pie',       faName: 'pie-chart' },
  Library:       { icon: 'book',            faName: 'book' },
  Search:        { icon: 'search',          faName: 'search' },
  Office:        { icon: 'building',        faName: 'building' },
  Communication: { icon: 'comments',        faName: 'comments' },
  Transport:     { icon: 'bus',             faName: 'bus' },
  Profile:       { icon: 'user-circle',     faName: 'user-circle' },
  Notifications: { icon: 'bell',            faName: 'bell' },
  Marks:         { icon: 'pen',             faName: 'pencil' },
  Timetable:     { icon: 'calendar-alt',    faName: 'calendar' },
  Admission:     { icon: 'user-plus',       faName: 'user-plus' },
  Exams:         { icon: 'file-alt',        faName: 'file-text' },
  Leave:         { icon: 'calendar-minus',  faName: 'calendar-o' },
  Inventory:     { icon: 'boxes',           faName: 'cubes' },
  QRScan:        { icon: 'qrcode',          faName: 'qrcode' },
};

function SmartTabIcon({
  iconInfo,
  color,
  size,
}: {
  iconInfo: { icon: string; faName: string };
  color: string;
  size: number;
}) {
  const [fa5Error, setFa5Error] = useState(false);

  if (fa5Error) {
    return <FontAwesome name={iconInfo.faName || 'circle'} size={size} color={color} />;
  }

  try {
    return (
      <FontAwesome5
        name={iconInfo.icon || 'circle'}
        size={size}
        color={color}
        solid
        onLayout={() => {}}
      />
    );
  } catch {
    return <FontAwesome name={iconInfo.faName || 'circle'} size={size} color={color} />;
  }
}

function TabItem({
  route,
  index,
  state,
  descriptors,
  navigation,
  tabWidth,
  activeColor,
  inactiveColor,
}: {
  route: any;
  index: number;
  state: any;
  descriptors: any;
  navigation: any;
  tabWidth: number;
  activeColor: string;
  inactiveColor: string;
}) {
  const focused = state.index === index;
  const { options } = descriptors[route.key];
  const label = options.tabBarLabel ?? options.title ?? route.name;
  const iconInfo = TAB_ICONS[route.name] ?? { icon: 'circle', faName: 'circle' };
  const badgeCount = options.tabBarBadge;

  const scale = useSharedValue(1);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  useEffect(() => {
    scale.value = withSpring(focused ? 1.15 : 1, { damping: 14, stiffness: 240 });
  }, [focused]);

  const onPress = useCallback(() => {
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });
    if (!focused && !event.defaultPrevented) {
      navigation.navigate(route.name);
    }
  }, [focused, navigation, route.key, route.name]);

  return (
    <TouchableOpacity
      key={route.key}
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.tabItem, { width: tabWidth }]}
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
    >
      {focused && (
        <View style={[styles.activePill, { backgroundColor: `${activeColor}15` }]} />
      )}
      <Animated.View style={[styles.iconContainer, iconStyle]}>
        <SmartTabIcon
          iconInfo={iconInfo}
          size={focused ? 19 : 17}
          color={focused ? activeColor : inactiveColor}
        />
        {badgeCount !== undefined && badgeCount !== null && (
          <View style={[styles.badge, { backgroundColor: '#ef4444' }]}>
            <Text style={styles.badgeText}>{String(badgeCount)}</Text>
          </View>
        )}
      </Animated.View>
      <Text
        style={[
          styles.tabLabel,
          {
            color: focused ? activeColor : inactiveColor,
            fontWeight: focused ? typography.weight.bold : typography.weight.medium,
          },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function PremiumTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors, roleAccent } = useTheme();
  const tabCount = state.routes.length || 1;
  const tabWidth = (width - 24) / tabCount;
  const indicatorWidth = Math.min(tabWidth * 0.45, 32);
  const indicatorOffset = (tabWidth - indicatorWidth) / 2;

  const indicatorX = useSharedValue(state.index * tabWidth);

  useEffect(() => {
    indicatorX.value = withSpring(state.index * tabWidth, {
      damping: 18,
      stiffness: 220,
      mass: 0.8,
    });
  }, [state.index, tabWidth]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }));

  const activeColor   = roleAccent.primary ?? colors.primary;
  const inactiveColor = colors.textTertiary;

  return (
    <View
      style={[
        styles.wrapper,
        {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          ...shadows.md,
        },
      ]}
    >
      {/* Active top sliding line */}
      <Animated.View
        style={[
          styles.indicator,
          { backgroundColor: activeColor, width: indicatorWidth, left: 12 + indicatorOffset },
          indicatorStyle,
        ]}
      />

      {/* Tabs list */}
      <View style={styles.tabsRow}>
        {state.routes.map((route, index) => (
          <TabItem
            key={route.key}
            route={route}
            index={index}
            state={state}
            descriptors={descriptors}
            navigation={navigation}
            tabWidth={tabWidth}
            activeColor={activeColor}
            inactiveColor={inactiveColor}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 6,
    paddingTop: 6,
    position: 'relative',
  },
  indicator: {
    height: 3,
    borderRadius: radius.full,
    position: 'absolute',
    top: 0,
  },
  tabsRow: {
    flexDirection: 'row',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    gap: 3,
    position: 'relative',
    minHeight: 48,
  },
  iconContainer: {
    width: 26,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  activePill: {
    position: 'absolute',
    top: 2,
    width: '80%',
    height: 42,
    borderRadius: radius.lg,
  },
  tabLabel: {
    fontSize: 11,
    letterSpacing: 0.1,
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -6,
    minWidth: 14,
    height: 14,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: typography.weight.bold,
  },
});
