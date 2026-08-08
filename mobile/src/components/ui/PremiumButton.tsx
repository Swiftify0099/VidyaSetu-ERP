/**
 * PremiumButton — Enterprise-grade button component
 * Variants: primary | secondary | ghost | outline | danger | success | warning
 * States: default | loading | success | disabled
 */
import React, { useCallback } from 'react';
import {
  TouchableOpacity, Text, View, StyleSheet,
  ActivityIndicator, StyleProp, ViewStyle, TextStyle,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/FontAwesome5';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, radius, typography } from '../../theme';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'success' | 'warning';
type ButtonSize    = 'sm' | 'md' | 'lg';

interface PremiumButtonProps {
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
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export default function PremiumButton({
  label, onPress, variant = 'primary', size = 'md',
  loading = false, disabled = false,
  iconLeft, iconRight, style, textStyle, fullWidth = false,
}: PremiumButtonProps) {
  const { colors, roleAccent, isDark } = useTheme();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const onPressIn = useCallback(() => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
    opacity.value = withTiming(0.9, { duration: 80 });
  }, []);

  const onPressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    opacity.value = withTiming(1, { duration: 120 });
  }, []);

  const isDisabled = disabled || loading;

  // Size tokens
  const sizeMap = {
    sm: { height: 36, px: spacing.md,  fontSize: typography.size.sm,   iconSize: 12, gap: 6  },
    md: { height: 48, px: spacing.xl,  fontSize: typography.size.base, iconSize: 14, gap: 8  },
    lg: { height: 56, px: spacing.xl,  fontSize: typography.size.lg,   iconSize: 16, gap: 10 },
  };
  const sz = sizeMap[size];

  // Variant styling
  const getVariantStyle = () => {
    switch (variant) {
      case 'primary':
        return {
          useGradient: true,
          gradient: roleAccent.gradient,
          textColor: '#fff',
          iconColor: 'rgba(255,255,255,0.85)',
          borderColor: 'transparent',
          bg: colors.primary,
        };
      case 'secondary':
        return {
          useGradient: false,
          gradient: [],
          textColor: colors.primary,
          iconColor: colors.primary,
          borderColor: 'transparent',
          bg: colors.primaryBg,
        };
      case 'ghost':
        return {
          useGradient: false,
          gradient: [],
          textColor: colors.primary,
          iconColor: colors.primary,
          borderColor: 'transparent',
          bg: 'transparent',
        };
      case 'outline':
        return {
          useGradient: false,
          gradient: [],
          textColor: colors.primary,
          iconColor: colors.primary,
          borderColor: colors.primary,
          bg: 'transparent',
        };
      case 'danger':
        return {
          useGradient: false,
          gradient: [],
          textColor: colors.danger,
          iconColor: colors.danger,
          borderColor: colors.danger,
          bg: colors.dangerBg,
        };
      case 'success':
        return {
          useGradient: false,
          gradient: [],
          textColor: colors.success,
          iconColor: colors.success,
          borderColor: colors.success,
          bg: colors.successBg,
        };
      case 'warning':
        return {
          useGradient: false,
          gradient: [],
          textColor: colors.warning,
          iconColor: colors.warning,
          borderColor: colors.warning,
          bg: colors.warningBg,
        };
      default:
        return {
          useGradient: true,
          gradient: roleAccent.gradient,
          textColor: '#fff',
          iconColor: 'rgba(255,255,255,0.85)',
          borderColor: 'transparent',
          bg: colors.primary,
        };
    }
  };

  const vs = getVariantStyle();

  const inner = (
    <View style={[
      styles.inner,
      { height: sz.height, paddingHorizontal: sz.px, gap: sz.gap },
    ]}>
      {loading ? (
        <ActivityIndicator color={vs.textColor} size="small" />
      ) : (
        <>
          {iconLeft && <Icon name={iconLeft} size={sz.iconSize} color={vs.iconColor} solid />}
          <Text style={[
            styles.label,
            { color: vs.textColor, fontSize: sz.fontSize },
            textStyle,
          ]}>
            {label}
          </Text>
          {iconRight && <Icon name={iconRight} size={sz.iconSize} color={vs.iconColor} solid />}
        </>
      )}
    </View>
  );

  return (
    <AnimatedTouchable
      style={[
        styles.base,
        { borderRadius: radius.lg, borderWidth: vs.borderColor !== 'transparent' ? 1.5 : 0, borderColor: vs.borderColor },
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
    >
      {vs.useGradient && vs.gradient.length > 0 ? (
        <LinearGradient
          colors={vs.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradient, { borderRadius: radius.lg }]}
        >
          {inner}
        </LinearGradient>
      ) : (
        <View style={[styles.solidBg, { backgroundColor: vs.bg, borderRadius: radius.lg }]}>
          {inner}
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
  fullWidth: { alignSelf: 'stretch' },
  disabled: { opacity: 0.55 },
  gradient: { overflow: 'hidden' },
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
