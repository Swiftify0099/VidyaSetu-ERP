/**
 * VidyaSetu Mobile — AppButton Component
 * =======================================
 * Enterprise-grade button with interactive spring micro-interactions,
 * loading indicator, left/right icons, and multiple semantic variants.
 */
import React, { useCallback } from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/FontAwesome5';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, radius, typography, shadows } from '../../theme';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'outline'
  | 'danger'
  | 'success'
  | 'warning';

export type ButtonSize = 'sm' | 'md' | 'lg';

export interface AppButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  iconLeft?: string;
  iconRight?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  fullWidth?: boolean;
  useRoleGradient?: boolean;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function AppButton({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  iconLeft,
  iconRight,
  style,
  textStyle,
  fullWidth = false,
  useRoleGradient = true,
}: AppButtonProps) {
  const { colors, roleAccent } = useTheme();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const onPressIn = useCallback(() => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 350 });
    opacity.value = withTiming(0.92, { duration: 60 });
  }, []);

  const onPressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 350 });
    opacity.value = withTiming(1, { duration: 100 });
  }, []);

  const isDisabled = disabled || loading;

  const sizeTokens = {
    sm: { height: 38, px: spacing.md, fontSize: typography.size.sm, iconSize: 12, gap: 6 },
    md: { height: 48, px: spacing.xl, fontSize: typography.size.base, iconSize: 14, gap: 8 },
    lg: { height: 56, px: spacing['2xl'], fontSize: typography.size.md, iconSize: 16, gap: 10 },
  }[size];

  const variantStyles = (() => {
    switch (variant) {
      case 'primary':
        return {
          useGradient: useRoleGradient && !!roleAccent?.gradient,
          gradient: roleAccent.gradient,
          textColor: colors.textOnPrimary,
          iconColor: 'rgba(255,255,255,0.9)',
          borderColor: 'transparent',
          bg: colors.primary,
          shadow: shadows.sm,
        };
      case 'secondary':
        return {
          useGradient: false,
          gradient: [],
          textColor: colors.primary,
          iconColor: colors.primary,
          borderColor: colors.primaryBorder,
          bg: colors.primaryBg,
          shadow: shadows.none,
        };
      case 'outline':
        return {
          useGradient: false,
          gradient: [],
          textColor: colors.primary,
          iconColor: colors.primary,
          borderColor: colors.primary,
          bg: 'transparent',
          shadow: shadows.none,
        };
      case 'ghost':
        return {
          useGradient: false,
          gradient: [],
          textColor: colors.primary,
          iconColor: colors.primary,
          borderColor: 'transparent',
          bg: 'transparent',
          shadow: shadows.none,
        };
      case 'danger':
        return {
          useGradient: false,
          gradient: [],
          textColor: colors.textOnPrimary,
          iconColor: colors.textOnPrimary,
          borderColor: 'transparent',
          bg: colors.danger,
          shadow: shadows.sm,
        };
      case 'success':
        return {
          useGradient: false,
          gradient: [],
          textColor: colors.textOnPrimary,
          iconColor: colors.textOnPrimary,
          borderColor: 'transparent',
          bg: colors.success,
          shadow: shadows.sm,
        };
      case 'warning':
        return {
          useGradient: false,
          gradient: [],
          textColor: colors.textOnPrimary,
          iconColor: colors.textOnPrimary,
          borderColor: 'transparent',
          bg: colors.warning,
          shadow: shadows.sm,
        };
      default:
        return {
          useGradient: true,
          gradient: roleAccent.gradient,
          textColor: colors.textOnPrimary,
          iconColor: 'rgba(255,255,255,0.9)',
          borderColor: 'transparent',
          bg: colors.primary,
          shadow: shadows.sm,
        };
    }
  })();

  const innerContent = (
    <View
      style={[
        styles.inner,
        {
          height: sizeTokens.height,
          paddingHorizontal: sizeTokens.px,
          gap: sizeTokens.gap,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variantStyles.textColor} size="small" />
      ) : (
        <>
          {iconLeft && (
            <Icon name={iconLeft} size={sizeTokens.iconSize} color={variantStyles.iconColor} solid />
          )}
          <Text
            style={[
              styles.label,
              { color: variantStyles.textColor, fontSize: sizeTokens.fontSize },
              textStyle,
            ]}
          >
            {label}
          </Text>
          {iconRight && (
            <Icon name={iconRight} size={sizeTokens.iconSize} color={variantStyles.iconColor} solid />
          )}
        </>
      )}
    </View>
  );

  return (
    <AnimatedTouchable
      style={[
        styles.base,
        {
          borderRadius: radius.lg,
          borderWidth: variantStyles.borderColor !== 'transparent' ? 1.5 : 0,
          borderColor: variantStyles.borderColor,
          ...variantStyles.shadow,
        },
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        animatedStyle,
        style,
      ]}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={isDisabled}
      activeOpacity={1}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {variantStyles.useGradient && variantStyles.gradient.length > 0 ? (
        <LinearGradient
          colors={variantStyles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradient, { borderRadius: radius.lg }]}
        >
          {innerContent}
        </LinearGradient>
      ) : (
        <View style={[styles.solidBg, { backgroundColor: variantStyles.bg, borderRadius: radius.lg }]}>
          {innerContent}
        </View>
      )}
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  disabled: {
    opacity: 0.5,
  },
  gradient: {
    overflow: 'hidden',
  },
  solidBg: {},
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: typography.weight.bold,
    letterSpacing: 0.2,
  },
});
