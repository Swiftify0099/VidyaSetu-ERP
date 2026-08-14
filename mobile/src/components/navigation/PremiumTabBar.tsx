/**
 * PremiumTabBar — Floating bottom navigation with high-visibility vector icons & clear tab labels
 */
import React, { useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Platform, Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
} from 'react-native-reanimated';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTheme } from '../../theme/ThemeContext';
import { shadows, radius, typography } from '../../theme';

const { width } = Dimensions.get('window');

// Tab icon map with primary FA5 icon, fallback standard FA icon, and emoji fallback
const TAB_ICONS: Record<string, { icon: string; faName: string; emoji: string }> = {
  Dashboard:     { icon: 'home',            faName: 'home',          emoji: '🏠' },
  Home:          { icon: 'home',            faName: 'home',          emoji: '🏠' },
  Students:      { icon: 'user-graduate',   faName: 'graduation-cap',emoji: '🎓' },
  Attendance:    { icon: 'clipboard-check', faName: 'check-square',  emoji: '📋' },
  Analytics:     { icon: 'chart-line',      faName: 'line-chart',    emoji: '📈' },
  Homework:      { icon: 'tasks',           faName: 'tasks',         emoji: '📝' },
  Plans:         { icon: 'book-open',       faName: 'book',          emoji: '📖' },
  Results:       { icon: 'award',           faName: 'trophy',        emoji: '🏆' },
  Fees:          { icon: 'rupee-sign',      faName: 'money',         emoji: '💰' },
  Notices:       { icon: 'bullhorn',        faName: 'bullhorn',      emoji: '📢' },
  Reports:       { icon: 'chart-pie',       faName: 'pie-chart',     emoji: '📊' },
  Library:       { icon: 'book',            faName: 'book',          emoji: '📚' },
  Search:        { icon: 'search',          faName: 'search',        emoji: '🔍' },
  Office:        { icon: 'building',        faName: 'building',      emoji: '🏢' },
  Communication: { icon: 'comments',        faName: 'comments',      emoji: '💬' },
  Transport:     { icon: 'bus',             faName: 'bus',           emoji: '🚌' },
  Profile:       { icon: 'user-circle',     faName: 'user-circle',   emoji: '👤' },
  Notifications: { icon: 'bell',            faName: 'bell',          emoji: '🔔' },
  Marks:         { icon: 'pen',             faName: 'pencil',        emoji: '✏️' },
  Timetable:     { icon: 'calendar-alt',    faName: 'calendar',      emoji: '📅' },
  Admission:     { icon: 'user-plus',       faName: 'user-plus',     emoji: '👥' },
  Exams:         { icon: 'file-alt',        faName: 'file-text',     emoji: '📝' },
  Leave:         { icon: 'calendar-minus',  faName: 'calendar-o',    emoji: '🏖️' },
};

function SmartTabIcon({ iconInfo, color, size, focused }: { iconInfo: { icon: string; faName: string; emoji: string }; color: string; size: number; focused: boolean }) {
  const [fa5Error, setFa5Error] = useState(false);

  if (fa5Error) {
    return (
      <FontAwesome
        name={iconInfo.faName || 'circle'}
        size={size}
        color={color}
      />
    );
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
    return (
      <FontAwesome
        name={iconInfo.faName || 'circle'}
        size={size}
        color={color}
      />
    );
  }
}

function TabItem({
  route, index, state, descriptors, navigation, tabWidth, activeColor, inactiveColor,
}: {
  route: any; index: number; state: any; descriptors: any; navigation: any;
  tabWidth: number; activeColor: string; inactiveColor: string;
}) {
  const focused = state.index === index;
  const { options } = descriptors[route.key];
  const label = options.tabBarLabel ?? options.title ?? route.name;
  const iconInfo = TAB_ICONS[route.name] ?? { icon: 'circle', faName: 'circle', emoji: '⭕' };

  const scale = useSharedValue(1);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  React.useEffect(() => {
    scale.value = withSpring(focused ? 1.12 : 1, { damping: 14, stiffness: 220 });
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
        <View style={[styles.activePill, { backgroundColor: `${activeColor}18` }]} />
      )}
      <Animated.View style={[styles.iconContainer, iconStyle]}>
        <SmartTabIcon
          iconInfo={iconInfo}
          size={focused ? 20 : 18}
          color={focused ? activeColor : inactiveColor}
          focused={focused}
        />
      </Animated.View>
      <Text
        style={[
          styles.tabLabel,
          { color: focused ? activeColor : inactiveColor, fontWeight: focused ? '700' : '600' },
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
  const indicatorWidth = Math.min(tabWidth * 0.5, 36);
  const indicatorOffset = (tabWidth - indicatorWidth) / 2;

  // Sliding pill indicator
  const indicatorX = useSharedValue(state.index * tabWidth);

  React.useEffect(() => {
    indicatorX.value = withSpring(state.index * tabWidth, {
      damping: 18,
      stiffness: 220,
      mass: 0.8,
    });
  }, [state.index, tabWidth]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }));

  const activeColor   = roleAccent.primary || '#4f46e5';
  const inactiveColor = colors.textSecondary || '#64748b';

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.tabBar || colors.surface, borderTopColor: colors.tabBarBorder || colors.border, ...shadows.md }]}>
      {/* Sliding indicator */}
      <Animated.View
        style={[
          styles.indicator,
          { backgroundColor: activeColor, width: indicatorWidth, left: 12 + indicatorOffset },
          indicatorStyle,
        ]}
      />

      {/* Tabs */}
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
    elevation: 8,
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
  },
  activePill: {
    position: 'absolute',
    top: 2,
    width: '75%',
    height: 42,
    borderRadius: 12,
  },
  tabLabel: {
    fontSize: 11,
    letterSpacing: 0.1,
    textAlign: 'center',
  },
});
