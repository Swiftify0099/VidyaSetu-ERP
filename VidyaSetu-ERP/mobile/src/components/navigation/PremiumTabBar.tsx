/**
 * PremiumTabBar — Floating bottom navigation with animated pill indicator
 * Features: Reanimated floating indicator, FA5 icons, role-specific colors,
 * scale animation on press, label fade on inactive.
 */
import React, { useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Platform, Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTheme } from '../../theme/ThemeContext';
import { shadows, radius, typography } from '../../theme';

const { width } = Dimensions.get('window');

// Tab icon map — FontAwesome5 icon names
const TAB_ICONS: Record<string, { icon: string; solid: boolean }> = {
  Dashboard:     { icon: 'home',        solid: true  },
  Home:          { icon: 'home',        solid: true  },
  Students:      { icon: 'user-graduate', solid: true },
  Attendance:    { icon: 'clipboard-check', solid: true },
  Notifications: { icon: 'bell',        solid: true  },
  Profile:       { icon: 'user-circle', solid: true  },
  Marks:         { icon: 'pen',         solid: true  },
  Plans:         { icon: 'book-open',   solid: true  },
  Timetable:     { icon: 'calendar-alt', solid: true },
  Results:       { icon: 'chart-bar',   solid: true  },
  Fees:          { icon: 'rupee-sign',  solid: true  },
  Notices:       { icon: 'bullhorn',    solid: true  },
  Reports:       { icon: 'chart-pie',   solid: true  },
  Library:       { icon: 'book',        solid: true  },
  Search:        { icon: 'search',      solid: true  },
  Office:        { icon: 'building',    solid: true  },
};

function TabItem({
  route, index, state, descriptors, navigation, tabWidth, activeColor, inactiveColor,
}: {
  route: any; index: number; state: any; descriptors: any; navigation: any;
  tabWidth: number; activeColor: string; inactiveColor: string;
}) {
  const focused = state.index === index;
  const { options } = descriptors[route.key];
  const label = options.tabBarLabel ?? options.title ?? route.name;

  const iconInfo = TAB_ICONS[route.name] ?? { icon: 'circle', solid: true };

  const scale = useSharedValue(1);
  const labelOpacity = useSharedValue(focused ? 1 : 0);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: labelOpacity.value,
    transform: [{ translateY: withTiming(focused ? 0 : 4, { duration: 200 }) }],
  }));

  React.useEffect(() => {
    scale.value = withSpring(focused ? 1.15 : 1, { damping: 12, stiffness: 200 });
    labelOpacity.value = withTiming(focused ? 1 : 0, { duration: 200 });
  }, [focused]);

  const onPress = useCallback(() => {
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });
    if (!focused && !event.defaultPrevented) {
      navigation.navigate({ name: route.name, merge: true });
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
      <Animated.View style={iconStyle}>
        <Icon
          name={iconInfo.icon}
          size={focused ? 20 : 19}
          color={focused ? activeColor : inactiveColor}
          solid={iconInfo.solid}
        />
      </Animated.View>
      <Animated.Text
        style={[
          styles.tabLabel,
          { color: activeColor },
          labelStyle,
        ]}
        numberOfLines={1}
      >
        {label}
      </Animated.Text>
    </TouchableOpacity>
  );
}

export default function PremiumTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors, roleAccent } = useTheme();
  const tabCount = state.routes.length;
  const tabWidth = (width - 32) / tabCount;

  // Sliding pill indicator
  const indicatorX = useSharedValue(state.index * tabWidth);

  React.useEffect(() => {
    indicatorX.value = withSpring(state.index * tabWidth, {
      damping: 18,
      stiffness: 200,
      mass: 0.8,
    });
  }, [state.index, tabWidth]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }));

  const activeColor   = roleAccent.primary;
  const inactiveColor = colors.tabInactive;

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.tabBar, borderTopColor: colors.tabBarBorder, ...shadows.lg }]}>
      {/* Sliding indicator */}
      <Animated.View
        style={[
          styles.indicator,
          { backgroundColor: roleAccent.primary, width: tabWidth * 0.45 },
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
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 8,
    position: 'relative',
  },
  indicator: {
    height: 3,
    borderRadius: radius.full,
    position: 'absolute',
    top: 0,
    left: 16 + (Dimensions.get('window').width - 32) / 10 * 0.275, // center under first tab icon approx
  },
  tabsRow: {
    flexDirection: 'row',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 2,
    position: 'relative',
    minHeight: 48,
  },
  activePill: {
    position: 'absolute',
    top: 2,
    width: '60%',
    height: 40,
    borderRadius: 12,
  },
  tabLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    letterSpacing: 0.1,
  },
});
