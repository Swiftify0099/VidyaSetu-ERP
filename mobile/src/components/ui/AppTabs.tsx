/**
 * VidyaSetu Mobile — AppTabs Component
 * =====================================
 * Horizontal segmented / pill tabs with animated selection indicator,
 * icon support, badge counters, and smooth layout transitions.
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, radius, typography, shadows } from '../../theme';

export interface TabItemData {
  key: string;
  label: string;
  icon?: string;
  count?: number | string;
}

export interface AppTabsProps {
  tabs: TabItemData[];
  activeTab: string;
  onChangeTab: (key: string) => void;
  variant?: 'pill' | 'segmented' | 'underline';
  scrollable?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function AppTabs({
  tabs,
  activeTab,
  onChangeTab,
  variant = 'pill',
  scrollable = false,
  style,
}: AppTabsProps) {
  const { colors, roleAccent } = useTheme();

  const activeColor = roleAccent.primary ?? colors.primary;

  const content = (
    <View
      style={[
        styles.tabsRow,
        variant === 'segmented' && [styles.segmentedBg, { backgroundColor: colors.surfaceAlt }],
        variant === 'underline' && [styles.underlineRow, { borderBottomColor: colors.divider }],
        style,
      ]}
    >
      {tabs.map(tab => {
        const isActive = tab.key === activeTab;

        if (variant === 'underline') {
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.underlineTab,
                isActive && [styles.activeUnderline, { borderBottomColor: activeColor }],
              ]}
              onPress={() => onChangeTab(tab.key)}
              activeOpacity={0.7}
            >
              {tab.icon && (
                <Icon
                  name={tab.icon}
                  size={13}
                  color={isActive ? activeColor : colors.textTertiary}
                  style={{ marginRight: 6 }}
                />
              )}
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isActive ? activeColor : colors.textSecondary,
                    fontWeight: isActive ? typography.weight.bold : typography.weight.medium,
                  },
                ]}
              >
                {tab.label}
              </Text>
              {tab.count !== undefined && (
                <View
                  style={[
                    styles.tabBadge,
                    {
                      backgroundColor: isActive ? `${activeColor}18` : colors.surfaceAlt,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.tabBadgeText,
                      { color: isActive ? activeColor : colors.textTertiary },
                    ]}
                  >
                    {tab.count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }

        // Pill / Segmented variant
        return (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.pillTab,
              variant === 'segmented' && styles.segmentedTab,
              isActive && {
                backgroundColor: variant === 'segmented' ? colors.surface : activeColor,
                ...(variant === 'segmented' ? shadows.xs : shadows.none),
              },
            ]}
            onPress={() => onChangeTab(tab.key)}
            activeOpacity={0.8}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            {tab.icon && (
              <Icon
                name={tab.icon}
                size={12}
                color={
                  isActive
                    ? variant === 'segmented'
                      ? activeColor
                      : colors.textOnPrimary
                    : colors.textSecondary
                }
                style={{ marginRight: 5 }}
              />
            )}
            <Text
              style={[
                styles.tabLabel,
                {
                  color: isActive
                    ? variant === 'segmented'
                      ? activeColor
                      : colors.textOnPrimary
                    : colors.textSecondary,
                  fontWeight: isActive ? typography.weight.bold : typography.weight.medium,
                },
              ]}
            >
              {tab.label}
            </Text>
            {tab.count !== undefined && (
              <View
                style={[
                  styles.tabBadge,
                  {
                    backgroundColor: isActive
                      ? variant === 'segmented'
                        ? colors.primaryBg
                        : 'rgba(255,255,255,0.25)'
                      : colors.surfaceAlt,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tabBadgeText,
                    {
                      color: isActive
                        ? variant === 'segmented'
                          ? activeColor
                          : colors.textOnPrimary
                        : colors.textTertiary,
                    },
                  ]}
                >
                  {tab.count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {content}
      </ScrollView>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  scrollContainer: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  segmentedBg: {
    padding: 3,
    borderRadius: radius.lg,
  },
  pillTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  segmentedTab: {
    flex: 1,
    justifyContent: 'center',
    borderRadius: radius.md,
    paddingVertical: spacing.sm - 1,
  },
  underlineRow: {
    borderBottomWidth: 1,
    gap: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  underlineTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeUnderline: {
    borderBottomWidth: 2,
  },
  tabLabel: {
    fontSize: typography.size.sm,
  },
  tabBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: radius.full,
  },
  tabBadgeText: {
    fontSize: typography.size['2xs'],
    fontWeight: typography.weight.bold,
  },
});
