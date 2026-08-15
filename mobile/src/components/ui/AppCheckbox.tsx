/**
 * VidyaSetu Mobile — AppCheckbox Component
 * =========================================
 * Accessible custom checkbox with smooth checkmark animation and labels.
 */
import React from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, radius, typography } from '../../theme';

export interface AppCheckboxProps {
  checked: boolean;
  onToggle: (checked: boolean) => void;
  label?: string;
  subtitle?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function AppCheckbox({
  checked,
  onToggle,
  label,
  subtitle,
  disabled = false,
  style,
}: AppCheckboxProps) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={() => !disabled && onToggle(!checked)}
      disabled={disabled}
      activeOpacity={0.75}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
    >
      <View
        style={[
          styles.box,
          {
            backgroundColor: checked ? colors.primary : colors.inputBg,
            borderColor: checked ? colors.primary : colors.border,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        {checked && <Icon name="check" size={11} color={colors.textOnPrimary} solid />}
      </View>

      {(label || subtitle) && (
        <View style={styles.textWrap}>
          {label && (
            <Text
              style={[
                styles.label,
                { color: disabled ? colors.textTertiary : colors.text },
              ]}
            >
              {label}
            </Text>
          )}
          {subtitle && (
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {subtitle}
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.xs + 2,
    minHeight: 44,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: radius.xs,
    borderWidth: 1.8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  textWrap: {
    marginLeft: spacing.md,
    flex: 1,
  },
  label: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.medium,
  },
  subtitle: {
    fontSize: typography.size.xs,
    marginTop: 2,
    lineHeight: 16,
  },
});
