/**
 * Badge — Priority/status badge component
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, typography } from '../../theme';

type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  rounded?: boolean;
}

export default function Badge({ label, variant = 'primary', size = 'md', dot = false, rounded = false }: BadgeProps) {
  const { colors } = useTheme();

  const colorMap = {
    primary: { bg: colors.primaryBg, text: colors.primary, dot: colors.primary },
    success: { bg: colors.successBg, text: colors.success, dot: colors.success },
    warning: { bg: colors.warningBg, text: colors.warning, dot: colors.warning },
    danger:  { bg: colors.dangerBg,  text: colors.danger,  dot: colors.danger  },
    info:    { bg: colors.infoBg,    text: colors.info,    dot: colors.info    },
    neutral: { bg: colors.surfaceAlt, text: colors.textSecondary, dot: colors.textSecondary },
  };

  const sizeMap = {
    sm: { px: 6,  py: 2, fontSize: typography.size.xs, dotSize: 5 },
    md: { px: 8,  py: 3, fontSize: typography.size.sm, dotSize: 6 },
    lg: { px: 10, py: 4, fontSize: typography.size.base, dotSize: 7 },
  };

  const c = colorMap[variant];
  const s = sizeMap[size];

  return (
    <View style={[
      styles.badge,
      {
        backgroundColor: c.bg,
        paddingHorizontal: s.px,
        paddingVertical: s.py,
        borderRadius: rounded ? radius.full : radius.sm,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
      },
    ]}>
      {dot && <View style={[styles.dot, { backgroundColor: c.dot, width: s.dotSize, height: s.dotSize, borderRadius: s.dotSize / 2 }]} />}
      <Text style={[styles.text, { color: c.text, fontSize: s.fontSize }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
  },
  dot: {},
  text: {
    fontWeight: typography.weight.semibold,
  },
});
