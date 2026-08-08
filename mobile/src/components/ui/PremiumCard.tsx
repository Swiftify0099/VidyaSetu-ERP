/**
 * PremiumCard — Floating card with press animation
 * Variants: default | elevated | glass | bordered
 */
import React, { useCallback } from 'react';
import {
  StyleSheet, StyleProp, ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring,
} from 'react-native-reanimated';
import { TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, shadows } from '../../theme';

type CardVariant = 'default' | 'elevated' | 'glass' | 'bordered' | 'flat';

interface PremiumCardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  padding?: number;
  radius?: number;
  disabled?: boolean;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function PremiumCard({
  children, variant = 'default', onPress, style,
  padding = 16, radius: borderRadius = radius.xl, disabled = false,
}: PremiumCardProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = useCallback(() => {
    if (onPress) scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
  }, [onPress]);

  const onPressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  }, []);

  const variantStyle: ViewStyle = (() => {
    switch (variant) {
      case 'default':
        return {
          backgroundColor: colors.surface,
          borderWidth: 0,
          ...shadows.md,
        };
      case 'elevated':
        return {
          backgroundColor: colors.surface,
          ...shadows.lg,
        };
      case 'glass':
        return {
          backgroundColor: colors.glass,
          borderWidth: 1,
          borderColor: colors.glassBorder,
          ...shadows.md,
        };
      case 'bordered':
        return {
          backgroundColor: colors.surface,
          borderWidth: 1.5,
          borderColor: colors.border,
          ...shadows.sm,
        };
      case 'flat':
        return {
          backgroundColor: colors.surfaceAlt,
          ...shadows.none,
        };
      default:
        return {
          backgroundColor: colors.surface,
          ...shadows.md,
        };
    }
  })();

  if (onPress) {
    return (
      <AnimatedTouchable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
        disabled={disabled}
        style={[
          styles.base,
          variantStyle,
          { borderRadius, padding },
          animatedStyle,
          style,
        ]}
      >
        {children}
      </AnimatedTouchable>
    );
  }

  return (
    <Animated.View style={[styles.base, variantStyle, { borderRadius, padding }, style]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
});
