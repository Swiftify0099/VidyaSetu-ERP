/**
 * VidyaSetu Mobile — AppProgress Component
 * =========================================
 * Linear progress bar with percentage indicator, gradient fills, and status mapping.
 */
import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';
import { radius, typography, spacing } from '../../theme';

export interface AppProgressProps {
  value: number; // 0 to 100
  label?: string;
  showPercentage?: boolean;
  height?: number;
  color?: string;
  useGradient?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function AppProgress({
  value,
  label,
  showPercentage = true,
  height = 8,
  color,
  useGradient = true,
  style,
}: AppProgressProps) {
  const { colors, roleAccent } = useTheme();

  const clamped = Math.min(Math.max(value, 0), 100);
  const barColor = color ?? roleAccent.primary ?? colors.primary;

  return (
    <View style={[styles.container, style]}>
      {(label || showPercentage) && (
        <View style={styles.labelRow}>
          {label ? (
            <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
          ) : null}
          {showPercentage ? (
            <Text style={[styles.percentage, { color: colors.text }]}>{Math.round(clamped)}%</Text>
          ) : null}
        </View>
      )}

      <View
        style={[
          styles.track,
          {
            height,
            borderRadius: radius.full,
            backgroundColor: colors.surfaceAlt,
          },
        ]}
      >
        {useGradient && roleAccent.gradient ? (
          <LinearGradient
            colors={roleAccent.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.fill, { width: `${clamped}%`, borderRadius: radius.full }]}
          />
        ) : (
          <View
            style={[
              styles.fill,
              {
                width: `${clamped}%`,
                borderRadius: radius.full,
                backgroundColor: barColor,
              },
            ]}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.xs,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
  },
  percentage: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    marginLeft: 'auto',
  },
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});
