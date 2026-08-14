/**
 * VidyaSetu Mobile — AppSwitch Component
 * =======================================
 * Tactile toggle switch with animated thumb, role accent colors, and label support.
 */
import React, { useEffect, useCallback } from 'react';
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
import { useTheme } from '../../theme/ThemeContext';
import { spacing, radius, typography } from '../../theme';

export interface AppSwitchProps {
  value: boolean;
  onValueChange: (val: boolean) => void;
  label?: string;
  subtitle?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function AppSwitch({
  value,
  onValueChange,
  label,
  subtitle,
  disabled = false,
  style,
}: AppSwitchProps) {
  const { colors, roleAccent } = useTheme();
  const offset = useSharedValue(value ? 20 : 2);

  const activeColor = roleAccent.primary ?? colors.primary;

  useEffect(() => {
    offset.value = withSpring(value ? 20 : 2, { damping: 16, stiffness: 350 });
  }, [value]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  const handleToggle = useCallback(() => {
    if (!disabled) {
      onValueChange(!value);
    }
  }, [disabled, onValueChange, value]);

  const switchTrack = (
    <TouchableOpacity
      style={[
        styles.track,
        {
          backgroundColor: value ? activeColor : colors.surfaceAlt,
          borderColor: value ? activeColor : colors.border,
          opacity: disabled ? 0.45 : 1,
        },
      ]}
      onPress={handleToggle}
      activeOpacity={0.8}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
    >
      <Animated.View
        style={[
          styles.thumb,
          { backgroundColor: '#ffffff' },
          thumbStyle,
        ]}
      />
    </TouchableOpacity>
  );

  if (label || subtitle) {
    return (
      <View style={[styles.row, style]}>
        <View style={styles.labelWrap}>
          {label && <Text style={[styles.label, { color: colors.text }]}>{label}</Text>}
          {subtitle && (
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
          )}
        </View>
        {switchTrack}
      </View>
    );
  }

  return switchTrack;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    minHeight: 48,
  },
  labelWrap: {
    flex: 1,
    paddingRight: spacing.md,
  },
  label: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.medium,
  },
  subtitle: {
    fontSize: typography.size.xs,
    marginTop: 2,
  },
  track: {
    width: 48,
    height: 28,
    borderRadius: radius.full,
    borderWidth: 1.5,
    justifyContent: 'center',
  },
  thumb: {
    width: 22,
    height: 22,
    borderRadius: radius.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
});
