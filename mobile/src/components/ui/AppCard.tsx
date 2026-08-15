/**
 * VidyaSetu Mobile — AppCard Component
 * =====================================
 * Elevation-aware card with subtle borders, theme contrast, and optional press feedback.
 */
import React, { useCallback } from 'react';
import {
  StyleSheet,
  StyleProp,
  ViewStyle,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeContext';
import { radius as defaultRadius, shadows, spacing } from '../../theme';

export type CardVariant = 'default' | 'elevated' | 'glass' | 'bordered' | 'flat' | 'interactive';

export interface AppCardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  padding?: number;
  radius?: number;
  disabled?: boolean;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function AppCard({
  children,
  variant = 'default',
  onPress,
  style,
  padding = spacing.base,
  radius = defaultRadius.xl,
  disabled = false,
}: AppCardProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = useCallback(() => {
    if (onPress) scale.value = withSpring(0.985, { damping: 15, stiffness: 350 });
  }, [onPress]);

  const onPressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 350 });
  }, []);

  const variantStyle: ViewStyle = (() => {
    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.borderSubtle,
          ...shadows.md,
        };
      case 'glass':
        return {
          backgroundColor: colors.glass,
          borderWidth: 1,
          borderColor: colors.glassBorder,
          ...shadows.sm,
        };
      case 'bordered':
        return {
          backgroundColor: colors.surface,
          borderWidth: 1.2,
          borderColor: colors.border,
          ...shadows.none,
        };
      case 'flat':
        return {
          backgroundColor: colors.surfaceAlt,
          borderWidth: 0,
          ...shadows.none,
        };
      case 'interactive':
        return {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          ...shadows.sm,
        };
      case 'default':
      default:
        return {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.borderSubtle,
          ...shadows.xs,
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
        accessibilityRole="button"
        style={[
          styles.base,
          variantStyle,
          { borderRadius: radius, padding },
          animatedStyle,
          style,
        ]}
      >
        {children}
      </AnimatedTouchable>
    );
  }

  return (
    <View style={[styles.base, variantStyle, { borderRadius: radius, padding }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
});
