/**
 * SectionHeader — Consistent section title with optional "View All" action
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, typography } from '../../theme';

interface SectionHeaderProps {
  title: string;
  icon?: string;
  onViewAll?: () => void;
  viewAllLabel?: string;
}

export default function SectionHeader({ title, icon, onViewAll, viewAllLabel = 'View All' }: SectionHeaderProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <View style={styles.titleRow}>
        {icon && (
          <View style={[styles.iconWrap, { backgroundColor: colors.primaryBg }]}>
            <Icon name={icon} size={13} color={colors.primary} solid />
          </View>
        )}
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      </View>
      {onViewAll && (
        <TouchableOpacity onPress={onViewAll} style={styles.viewAllBtn} activeOpacity={0.7}>
          <Text style={[styles.viewAll, { color: colors.primary }]}>{viewAllLabel}</Text>
          <Icon name="chevron-right" size={10} color={colors.primary} solid />
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
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    letterSpacing: -0.2,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  viewAll: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },
});
