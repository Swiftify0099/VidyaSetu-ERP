/**
 * VidyaSetu Mobile — AppSectionHeader Component
 * ==============================================
 * Consistent section header with icon, count badge, and optional "View All" link.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, radius, typography } from '../../theme';

export interface AppSectionHeaderProps {
  title: string;
  icon?: string;
  count?: number | string;
  onViewAll?: () => void;
  viewAllLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export default function AppSectionHeader({
  title,
  icon,
  count,
  onViewAll,
  viewAllLabel = 'View All',
  style,
}: AppSectionHeaderProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.row, style]}>
      <View style={styles.titleRow}>
        {icon && (
          <View style={[styles.iconWrap, { backgroundColor: colors.primaryBg }]}>
            <Icon name={icon} size={13} color={colors.primary} solid />
          </View>
        )}
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        {count !== undefined && (
          <View style={[styles.countBadge, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={[styles.countText, { color: colors.textSecondary }]}>{count}</Text>
          </View>
        )}
      </View>

      {onViewAll && (
        <TouchableOpacity
          onPress={onViewAll}
          style={styles.viewAllBtn}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={viewAllLabel}
        >
          <Text style={[styles.viewAll, { color: colors.primary }]}>{viewAllLabel}</Text>
          <Icon name="chevron-right" size={10} color={colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    letterSpacing: -0.2,
  },
  countBadge: {
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: radius.full,
  },
  countText: {
    fontSize: typography.size['2xs'],
    fontWeight: typography.weight.bold,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 2,
  },
  viewAll: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },
});
