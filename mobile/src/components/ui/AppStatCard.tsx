/**
 * VidyaSetu Mobile — AppStatCard Component
 * =========================================
 * Metric card with top accent bar, trend indicator pill,
 * icon badge, and smooth entry animation.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated as RNAnimated, StyleProp, ViewStyle, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';
import { radius, shadows, typography, spacing } from '../../theme';

export interface AppStatCardProps {
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
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export default function AppStatCard({
  label,
  value,
  icon,
  color,
  bgColor,
  trend,
  trendValue,
  subtitle,
  gradient,
  compact = false,
  onPress,
  style,
}: AppStatCardProps) {
  const { colors, roleAccent, isDark } = useTheme();
  const fadeAnim = useRef(new RNAnimated.Value(0)).current;
  const slideAnim = useRef(new RNAnimated.Value(10)).current;

  const accentColor = color ?? roleAccent.primary ?? colors.primary;
  const accentBg    = bgColor ?? (isDark ? `${accentColor}25` : `${accentColor}15`);

  useEffect(() => {
    RNAnimated.parallel([
      RNAnimated.timing(fadeAnim,  { toValue: 1, duration: 350, useNativeDriver: true }),
      RNAnimated.spring(slideAnim, { toValue: 0, friction: 6, tension: 90, useNativeDriver: true }),
    ]).start();
  }, []);

  const trendColor = trend === 'up'
    ? colors.success
    : trend === 'down'
      ? colors.danger
      : colors.textSecondary;

  const trendIcon = trend === 'up' ? 'arrow-up' : trend === 'down' ? 'arrow-down' : 'minus';

  const cardContent = (
    <RNAnimated.View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.borderSubtle,
          ...shadows.xs,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
        style,
      ]}
    >
      {/* Top accent bar */}
      {gradient && gradient.length > 0 ? (
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.accentLine}
        />
      ) : (
        <View style={[styles.accentLine, { backgroundColor: accentColor }]} />
      )}

      <View style={[styles.body, compact && styles.bodyCompact]}>
        {/* Top row: Icon + Trend */}
        <View style={styles.topRow}>
          <View style={[styles.iconWrap, { backgroundColor: accentBg }]}>
            <Icon name={icon} size={compact ? 13 : 16} color={accentColor} solid />
          </View>
          {trend && trendValue && (
            <View style={[styles.trendBadge, { backgroundColor: `${trendColor}15` }]}>
              <Icon name={trendIcon} size={8} color={trendColor} solid />
              <Text style={[styles.trendText, { color: trendColor }]}>{trendValue}</Text>
            </View>
          )}
        </View>

        {/* Value */}
        <Text
          style={[
            styles.value,
            {
              color: colors.text,
              fontSize: compact ? typography.size.xl : typography.size['2xl'],
            },
          ]}
          numberOfLines={1}
        >
          {value}
        </Text>

        {/* Label */}
        <Text
          style={[
            styles.label,
            {
              color: colors.textSecondary,
              fontSize: compact ? typography.size.xs : typography.size.sm,
            },
          ]}
          numberOfLines={2}
        >
          {label}
        </Text>

        {/* Subtitle */}
        {subtitle && (
          <Text style={[styles.subtitle, { color: colors.textTertiary }]} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
    </RNAnimated.View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={{ flex: 1 }}>
        {cardContent}
      </TouchableOpacity>
    );
  }

  return cardContent;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    flex: 1,
    minWidth: '45%',
    borderWidth: 1,
  },
  accentLine: {
    height: 3,
    width: '100%',
  },
  body: {
    padding: spacing.base,
    gap: 3,
  },
  bodyCompact: {
    padding: spacing.md,
    gap: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  trendText: {
    fontSize: typography.size['2xs'],
    fontWeight: typography.weight.bold,
  },
  value: {
    fontWeight: typography.weight.extrabold,
    lineHeight: 30,
    marginTop: 2,
  },
  label: {
    fontWeight: typography.weight.semibold,
    lineHeight: 16,
  },
  subtitle: {
    fontSize: typography.size.xs,
    marginTop: 1,
  },
});
