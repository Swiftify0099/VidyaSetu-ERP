/**
 * VidyaSetu Mobile — AppIconButton Component
 * ===========================================
 * Tactile icon button with spring feedback, badge counts, and semantic variants.
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
  withTiming,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from '../../theme/ThemeContext';
import { radius, shadows, typography } from '../../theme';

export type IconButtonVariant = 'primary' | 'secondary' | 'surface' | 'ghost' | 'danger';
export type IconButtonSize = 'sm' | 'md' | 'lg';
export type IconButtonShape = 'circle' | 'rounded';

export interface AppIconButtonProps {
  icon: string;
  onPress: () => void;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  shape?: IconButtonShape;
  color?: string;
  bgColor?: string;
  badge?: number | string | boolean;
  badgeColor?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function AppIconButton({
  icon,
  onPress,
  variant = 'surface',
  size = 'md',
  shape = 'rounded',
  color,
  bgColor,
  badge,
  badgeColor,
  disabled = false,
  style,
  accessibilityLabel,
}: AppIconButtonProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = useCallback(() => {
    scale.value = withSpring(0.92, { damping: 15, stiffness: 350 });
  }, []);

  const onPressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 350 });
  }, []);

  const sizeTokens = {
    sm: { dimension: 34, iconSize: 13, radius: radius.md },
    md: { dimension: 42, iconSize: 16, radius: radius.lg },
    lg: { dimension: 50, iconSize: 20, radius: radius.xl },
  }[size];

  const variantStyles = (() => {
    switch (variant) {
      case 'primary':
        return {
          bg: bgColor ?? colors.primary,
          iconColor: color ?? colors.textOnPrimary,
          border: 'transparent',
          shadow: shadows.sm,
        };
      case 'secondary':
        return {
          bg: bgColor ?? colors.primaryBg,
          iconColor: color ?? colors.primary,
          border: colors.primaryBorder,
          shadow: shadows.none,
        };
      case 'danger':
        return {
          bg: bgColor ?? colors.dangerBg,
          iconColor: color ?? colors.danger,
          border: 'transparent',
          shadow: shadows.none,
        };
      case 'ghost':
        return {
          bg: 'transparent',
          iconColor: color ?? colors.textSecondary,
          border: 'transparent',
          shadow: shadows.none,
        };
      case 'surface':
      default:
        return {
          bg: bgColor ?? colors.surface,
          iconColor: color ?? colors.text,
          border: colors.border,
          shadow: shadows.xs,
        };
    }
  })();

  const borderRadius = shape === 'circle' ? radius.full : sizeTokens.radius;

  return (
    <AnimatedTouchable
      style={[
        styles.button,
        {
          width: sizeTokens.dimension,
          height: sizeTokens.dimension,
          borderRadius,
          backgroundColor: variantStyles.bg,
          borderColor: variantStyles.border,
          borderWidth: variantStyles.border !== 'transparent' ? 1 : 0,
          ...variantStyles.shadow,
          opacity: disabled ? 0.45 : 1,
        },
        animatedStyle,
        style,
      ]}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled}
      activeOpacity={1}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || icon}
    >
      <Icon name={icon} size={sizeTokens.iconSize} color={variantStyles.iconColor} solid />

      {badge !== undefined && badge !== false && (
        <View
          style={[
            styles.badge,
            { backgroundColor: badgeColor ?? colors.danger },
            typeof badge === 'boolean' && styles.dotBadge,
          ]}
        >
          {typeof badge !== 'boolean' && (
            <Text style={styles.badgeText}>{String(badge)}</Text>
          )}
        </View>
      )}
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 16,
    height: 16,
    borderRadius: radius.full,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  dotBadge: {
    minWidth: 8,
    height: 8,
    top: -1,
    right: -1,
    paddingHorizontal: 0,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: typography.weight.bold,
    lineHeight: 11,
  },
});
