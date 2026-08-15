/**
 * VidyaSetu Mobile — AppDivider Component
 * ========================================
 * Subtle visual divider with optional center text/label and spacing tokens.
 */
import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, typography } from '../../theme';

export interface AppDividerProps {
  label?: string;
  spacingVertical?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export default function AppDivider({
  label,
  spacingVertical = spacing.base,
  color,
  style,
}: AppDividerProps) {
  const { colors } = useTheme();
  const dividerColor = color ?? colors.divider;

  if (label) {
    return (
      <View style={[styles.labelRow, { marginVertical: spacingVertical }, style]}>
        <View style={[styles.line, { backgroundColor: dividerColor }]} />
        <Text style={[styles.labelText, { color: colors.textTertiary }]}>{label}</Text>
        <View style={[styles.line, { backgroundColor: dividerColor }]} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.line,
        {
          backgroundColor: dividerColor,
          marginVertical: spacingVertical,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  line: {
    height: 1,
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  labelText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
