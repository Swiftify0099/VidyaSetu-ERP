/**
 * VidyaSetu Mobile — AppInput Component
 * ======================================
 * Input field with floating animated label, focus highlight,
 * inline validation errors, left/right icons, and eye toggle.
 */
import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextInputProps,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, radius, typography } from '../../theme';

export interface AppInputProps extends Omit<TextInputProps, 'style'> {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  icon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  error?: string;
  hint?: string;
  secureEntry?: boolean;
  clearable?: boolean;
  maxLength?: number;
  showCounter?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

export default function AppInput({
  label,
  value,
  onChangeText,
  icon,
  rightIcon,
  onRightIconPress,
  error,
  hint,
  secureEntry = false,
  clearable = false,
  maxLength,
  showCounter = false,
  containerStyle,
  inputStyle,
  disabled = false,
  ...rest
}: AppInputProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Floating label animation
  const floatAnim = useSharedValue(value ? 1 : 0);

  const onFocus = useCallback((e: any) => {
    setFocused(true);
    floatAnim.value = withTiming(1, { duration: 160 });
    rest.onFocus?.(e);
  }, [rest.onFocus]);

  const onBlur = useCallback((e: any) => {
    setFocused(false);
    if (!value) floatAnim.value = withTiming(0, { duration: 160 });
    rest.onBlur?.(e);
  }, [value, rest.onBlur]);

  // Keep float state in sync with external value changes
  React.useEffect(() => {
    if (value && floatAnim.value !== 1) {
      floatAnim.value = withTiming(1, { duration: 160 });
    } else if (!value && !focused && floatAnim.value !== 0) {
      floatAnim.value = withTiming(0, { duration: 160 });
    }
  }, [value, focused]);

  const labelStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(floatAnim.value, [0, 1], [0, -22], Extrapolation.CLAMP),
      },
      {
        scale: interpolate(floatAnim.value, [0, 1], [1, 0.82], Extrapolation.CLAMP),
      },
    ] as any,
    color: error
      ? colors.danger
      : focused
        ? colors.primary
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
      {/* Input Outer Box */}
      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: colors.inputBg,
            borderColor,
            borderWidth: focused ? 1.8 : 1.2,
            borderRadius: radius.md,
            opacity: disabled ? 0.55 : 1,
          },
          inputStyle,
        ]}
      >
        {/* Left Icon */}
        {hasLeft && (
          <View style={styles.iconWrap}>
            <Icon
              name={icon!}
              size={15}
              color={error ? colors.danger : focused ? colors.primary : colors.textTertiary}
              solid
            />
          </View>
        )}

        {/* Floating Label + Text Input */}
        <View style={[styles.fieldWrap, hasLeft && styles.fieldWrapWithIcon]}>
          <Animated.Text
            style={[styles.label, labelStyle]}
            onPress={() => inputRef.current?.focus()}
            numberOfLines={1}
          >
            {label}
          </Animated.Text>
          <TextInput
            ref={inputRef}
            style={[
              styles.input,
              {
                color: colors.text,
                paddingTop: value || focused ? 16 : 0,
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

        {/* Clear Button */}
        {clearable && !!value && !disabled && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onChangeText('')}
            accessibilityRole="button"
            accessibilityLabel="Clear input"
          >
            <Icon name="times-circle" size={14} color={colors.textTertiary} solid />
          </TouchableOpacity>
        )}

        {/* Password Eye Toggle */}
        {secureEntry && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setShowPassword(v => !v)}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
          >
            <Icon
              name={showPassword ? 'eye-slash' : 'eye'}
              size={15}
              color={colors.textTertiary}
              solid
            />
          </TouchableOpacity>
        )}

        {/* Custom Right Icon */}
        {rightIcon && !secureEntry && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
          >
            <Icon name={rightIcon} size={15} color={colors.textTertiary} solid />
          </TouchableOpacity>
        )}
      </View>

      {/* Helper / Error Feedback Row */}
      <View style={styles.helperRow}>
        {error ? (
          <View style={styles.errorRow}>
            <Icon name="exclamation-circle" size={12} color={colors.danger} solid />
            <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
          </View>
        ) : hint ? (
          <Text style={[styles.hintText, { color: colors.textTertiary }]}>{hint}</Text>
        ) : <View />}

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
  container: {
    marginBottom: spacing.base,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 54,
    paddingHorizontal: 4,
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
    minHeight: 54,
  },
  fieldWrapWithIcon: {
    paddingLeft: 0,
  },
  label: {
    position: 'absolute',
    top: '50%',
    marginTop: -8,
    fontSize: typography.size.base,
    fontWeight: typography.weight.medium,
  },
  input: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.medium,
    paddingVertical: 0,
    minHeight: 38,
  },
  actionBtn: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    alignSelf: 'center',
  },
  helperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingHorizontal: 4,
    minHeight: 16,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
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
