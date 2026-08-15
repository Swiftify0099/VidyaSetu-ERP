/**
 * VidyaSetu Mobile — AppListItem Component
 * =========================================
 * Reusable list row item supporting left icons/avatars, titles, subtitles,
 * right status badges, chevrons, and spring press feedback.
 */
import React, { useCallback } from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, radius, typography } from '../../theme';

export interface AppListItemProps {
  title: string;
  subtitle?: string;
  leftIcon?: string;
  leftIconColor?: string;
  leftIconBg?: string;
  leftElement?: React.ReactNode;
  rightBadge?: string;
  rightBadgeVariant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  rightText?: string;
  rightElement?: React.ReactNode;
  showChevron?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function AppListItem({
  title,
  subtitle,
  leftIcon,
  leftIconColor,
  leftIconBg,
  leftElement,
  rightBadge,
  rightBadgeVariant = 'neutral',
  rightText,
  rightElement,
  showChevron = true,
  onPress,
  style,
  disabled = false,
}: AppListItemProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = useCallback(() => {
    if (onPress) scale.value = withSpring(0.98, { damping: 15, stiffness: 350 });
  }, [onPress]);

  const onPressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 350 });
  }, []);

  const badgeColorMap = {
    primary: { bg: colors.primaryBg, text: colors.primary },
    success: { bg: colors.successBg, text: colors.success },
    warning: { bg: colors.warningBg, text: colors.warning },
    danger:  { bg: colors.dangerBg,  text: colors.danger  },
    info:    { bg: colors.infoBg,    text: colors.info    },
    neutral: { bg: colors.surfaceAlt, text: colors.textSecondary },
  };

  const badgeColors = badgeColorMap[rightBadgeVariant] || badgeColorMap.neutral;

  const content = (
    <View style={[styles.innerRow, { borderBottomColor: colors.divider }]}>
      {/* Left Icon / Avatar */}
      {leftElement ? (
        leftElement
      ) : leftIcon ? (
        <View
          style={[
            styles.leftIconWrap,
            {
              backgroundColor: leftIconBg ?? colors.primaryBg,
            },
          ]}
        >
          <Icon
            name={leftIcon}
            size={15}
            color={leftIconColor ?? colors.primary}
            solid
          />
        </View>
      ) : null}

      {/* Main Title & Subtitle */}
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={2}>
            {subtitle}
          </Text>
        )}
      </View>

      {/* Right Controls */}
      <View style={styles.rightContainer}>
        {rightElement ? (
          rightElement
        ) : (
          <>
            {rightText && (
              <Text style={[styles.rightText, { color: colors.textTertiary }]}>
                {rightText}
              </Text>
            )}
            {rightBadge && (
              <View style={[styles.badge, { backgroundColor: badgeColors.bg }]}>
                <Text style={[styles.badgeText, { color: badgeColors.text }]}>
                  {rightBadge}
                </Text>
              </View>
            )}
            {showChevron && !!onPress && (
              <Icon name="chevron-right" size={12} color={colors.textTertiary} />
            )}
          </>
        )}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <AnimatedTouchable
        style={[styles.container, animatedStyle, style]}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled}
        activeOpacity={1}
        accessibilityRole="button"
      >
        {content}
      </AnimatedTouchable>
    );
  }

  return <View style={[styles.container, style]}>{content}</View>;
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  innerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  leftIconWrap: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
  },
  subtitle: {
    fontSize: typography.size.xs,
    marginTop: 2,
    lineHeight: 16,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginLeft: spacing.sm,
  },
  rightText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  badgeText: {
    fontSize: typography.size['2xs'],
    fontWeight: typography.weight.bold,
  },
});
