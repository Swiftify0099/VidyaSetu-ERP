/**
 * PremiumInput — Animated floating label input
 * Features: floating label, focus animation, error/success states,
 * left icon, password visibility toggle, character counter.
 */
import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, StyleProp, ViewStyle, TextInputProps,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, radius, typography } from '../../theme';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface PremiumInputProps extends Omit<TextInputProps, 'style'> {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  icon?: string;
  error?: string;
  hint?: string;
  secureEntry?: boolean;
  maxLength?: number;
  showCounter?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export default function PremiumInput({
  label, value, onChangeText, icon, error, hint,
  secureEntry = false, maxLength, showCounter = false,
  containerStyle, disabled = false, ...rest
}: PremiumInputProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Floating label animation
  const floatAnim = useSharedValue(value ? 1 : 0);
  // Border focus animation
  const borderAnim = useSharedValue(0);

  const onFocus = useCallback(() => {
    setFocused(true);
    floatAnim.value = withTiming(1, { duration: 180 });
    borderAnim.value = withTiming(1, { duration: 180 });
  }, []);

  const onBlur = useCallback(() => {
    setFocused(false);
    if (!value) floatAnim.value = withTiming(0, { duration: 180 });
    borderAnim.value = withTiming(0, { duration: 180 });
  }, [value]);

  const labelStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(floatAnim.value, [0, 1], [0, -24], Extrapolation.CLAMP),
      },
      {
        scale: interpolate(floatAnim.value, [0, 1], [1, 0.82], Extrapolation.CLAMP),
      },
    ] as any,
    color: interpolate(floatAnim.value, [0, 1], [0, 1]) > 0.5
      ? (error ? colors.danger : colors.primary)
      : colors.textTertiary,
  }));

  const borderColor = error
    ? colors.danger
    : focused
      ? colors.borderFocus
      : colors.inputBorder;

  const hasLeft = !!icon;

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Wrapper */}
      <View style={[
        styles.inputWrapper,
        {
          backgroundColor: colors.inputBg,
          borderColor,
          borderWidth: focused ? 2 : 1.5,
          borderRadius: radius.md,
          opacity: disabled ? 0.55 : 1,
        },
      ]}>
        {/* Left Icon */}
        {hasLeft && (
          <View style={styles.iconWrap}>
            <Icon
              name={icon!}
              size={15}
              color={focused ? colors.primary : colors.textTertiary}
              solid
            />
          </View>
        )}

        {/* Floating Label + Input */}
        <View style={[styles.fieldWrap, hasLeft && styles.fieldWrapWithIcon]}>
          <Animated.Text
            style={[styles.label, labelStyle]}
            onPress={() => inputRef.current?.focus()}
          >
            {label}
          </Animated.Text>
          <TextInput
            ref={inputRef}
            style={[
              styles.input,
              {
                color: colors.text,
                paddingTop: value || focused ? 18 : 0,
              },
            ]}
            value={value}
            onChangeText={onChangeText}
            onFocus={onFocus}
            onBlur={onBlur}
            secureTextEntry={secureEntry && !showPassword}
            placeholderTextColor="transparent"
            editable={!disabled}
            maxLength={maxLength}
            {...rest}
          />
        </View>

        {/* Password Toggle */}
        {secureEntry && (
          <TouchableOpacity
            style={styles.eyeBtn}
            onPress={() => setShowPassword(v => !v)}
          >
            <Icon
              name={showPassword ? 'eye-slash' : 'eye'}
              size={15}
              color={colors.textTertiary}
              solid
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Helper row */}
      <View style={styles.helperRow}>
        {error ? (
          <View style={styles.errorRow}>
            <Icon name="exclamation-circle" size={11} color={colors.danger} solid />
            <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
          </View>
        ) : hint ? (
          <Text style={[styles.hintText, { color: colors.textTertiary }]}>{hint}</Text>
        ) : null}
        {showCounter && maxLength && (
          <Text style={[styles.counter, { color: colors.textTertiary }]}>
            {value.length}/{maxLength}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.base },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
  },
  iconWrap: {
    paddingLeft: spacing.base,
    paddingRight: spacing.sm,
    alignSelf: 'center',
  },
  fieldWrap: {
    flex: 1,
    paddingHorizontal: spacing.base,
    justifyContent: 'center',
    minHeight: 56,
  },
  fieldWrapWithIcon: { paddingLeft: 0 },
  label: {
    position: 'absolute',
    top: '50%',
    marginTop: -9,
    fontSize: typography.size.base,
    fontWeight: typography.weight.medium,
  },
  input: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.medium,
    paddingVertical: 0,
    minHeight: 40,
  },
  eyeBtn: {
    paddingHorizontal: spacing.base,
    alignSelf: 'center',
  },
  helperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingHorizontal: 4,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  errorText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
  },
  hintText: {
    fontSize: typography.size.xs,
  },
  counter: {
    fontSize: typography.size.xs,
    marginLeft: 'auto',
  },
});
