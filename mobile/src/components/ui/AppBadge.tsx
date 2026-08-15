/**
 * VidyaSetu Mobile — AppBadge Component
 * ======================================
 * Semantic status and priority badge supporting dot indicators,
 * rounded pill styling, and various size presets.
 */
import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, typography } from '../../theme';

export type BadgeVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral';

export type BadgeSize = 'sm' | 'md' | 'lg';

export interface AppBadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  rounded?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function AppBadge({
  label,
  variant = 'primary',
  size = 'md',
  dot = false,
  rounded = false,
  style,
}: AppBadgeProps) {
  const { colors } = useTheme();

  const colorMap = {
    primary:   { bg: colors.primaryBg, text: colors.primary, dot: colors.primary },
    secondary: { bg: colors.secondaryBg, text: colors.secondary, dot: colors.secondary },
    success:   { bg: colors.successBg, text: colors.success, dot: colors.success },
    warning:   { bg: colors.warningBg, text: colors.warning, dot: colors.warning },
    danger:    { bg: colors.dangerBg,  text: colors.danger,  dot: colors.danger  },
    info:      { bg: colors.infoBg,    text: colors.info,    dot: colors.info    },
    neutral:   { bg: colors.surfaceAlt, text: colors.textSecondary, dot: colors.textSecondary },
  };

  const sizeMap = {
    sm: { px: 6,  py: 2, fontSize: typography.size['2xs'], dotSize: 5 },
    md: { px: 8,  py: 3, fontSize: typography.size.xs,   dotSize: 6 },
    lg: { px: 11, py: 4, fontSize: typography.size.sm,   dotSize: 7 },
  };

  const c = colorMap[variant] || colorMap.primary;
  const s = sizeMap[size] || sizeMap.md;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: c.bg,
          paddingHorizontal: s.px,
          paddingVertical: s.py,
          borderRadius: rounded ? radius.full : radius.sm,
        },
        style,
      ]}
    >
      {dot && (
        <View
          style={[
            styles.dot,
            {
              backgroundColor: c.dot,
              width: s.dotSize,
              height: s.dotSize,
              borderRadius: s.dotSize / 2,
            },
          ]}
        />
      )}
      <Text style={[styles.text, { color: c.text, fontSize: s.fontSize }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4.5,
  },
  dot: {},
  text: {
    fontWeight: typography.weight.bold,
    letterSpacing: 0.2,
  },
});
