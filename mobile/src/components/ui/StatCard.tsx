/**
 * StatCard — Animated statistics card with count-up and trend indicator
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated as RNAnimated } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';
import { radius, shadows, typography, spacing } from '../../theme';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  color?: string;
  bgColor?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  subtitle?: string;
  gradient?: string[];
  compact?: boolean;
}

export default function StatCard({
  label, value, icon, color, bgColor, trend, trendValue, subtitle, gradient, compact = false,
}: StatCardProps) {
  const { colors, roleAccent, isDark } = useTheme();
  const fadeAnim = useRef(new RNAnimated.Value(0)).current;
  const slideAnim = useRef(new RNAnimated.Value(12)).current;
  const scaleAnim = useRef(new RNAnimated.Value(0.92)).current;

  const accentColor = color ?? roleAccent.primary;
  const accentBg    = bgColor ?? (isDark ? `${accentColor}22` : `${accentColor}15`);

  useEffect(() => {
    RNAnimated.parallel([
      RNAnimated.timing(fadeAnim,  { toValue: 1, duration: 400, useNativeDriver: true }),
      RNAnimated.spring(slideAnim, { toValue: 0, friction: 6, tension: 80, useNativeDriver: true }),
      RNAnimated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
    ]).start();
  }, []);

  const trendColor = trend === 'up'
    ? colors.success
    : trend === 'down'
      ? colors.danger
      : colors.textSecondary;

  const trendIcon = trend === 'up' ? 'arrow-up' : trend === 'down' ? 'arrow-down' : 'minus';

  return (
    <RNAnimated.View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          ...shadows.md,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
        },
      ]}
    >
      {/* Top accent line */}
      {gradient ? (
        <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.accentLine} />
      ) : (
        <View style={[styles.accentLine, { backgroundColor: accentColor }]} />
      )}

      <View style={[styles.body, compact && styles.bodyCompact]}>
        {/* Icon */}
        <View style={[styles.iconWrap, { backgroundColor: accentBg }]}>
          <Icon name={icon} size={compact ? 14 : 18} color={accentColor} solid />
        </View>

        {/* Value */}
        <Text style={[styles.value, { color: accentColor, fontSize: compact ? typography.size.xl : typography.size['3xl'] }]}>
          {value}
        </Text>

        {/* Label */}
        <Text style={[styles.label, { color: colors.textSecondary, fontSize: compact ? typography.size.xs : typography.size.sm }]} numberOfLines={2}>
          {label}
        </Text>

        {/* Trend */}
        {trend && trendValue && (
          <View style={[styles.trendRow]}>
            <Icon name={trendIcon} size={9} color={trendColor} solid />
            <Text style={[styles.trendText, { color: trendColor }]}>{trendValue}</Text>
          </View>
        )}

        {/* Subtitle */}
        {subtitle && (
          <Text style={[styles.subtitle, { color: colors.textTertiary }]}>{subtitle}</Text>
        )}
      </View>
    </RNAnimated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    flex: 1,
    minWidth: '45%',
  },
  accentLine: {
    height: 3,
    width: '100%',
  },
  body: {
    padding: spacing.base,
    gap: 4,
  },
  bodyCompact: {
    padding: spacing.md,
    gap: 3,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  value: {
    fontWeight: typography.weight.extrabold,
    lineHeight: 36,
  },
  label: {
    fontWeight: typography.weight.semibold,
    lineHeight: 16,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  trendText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
  },
  subtitle: {
    fontSize: typography.size.xs,
    marginTop: 1,
  },
});
