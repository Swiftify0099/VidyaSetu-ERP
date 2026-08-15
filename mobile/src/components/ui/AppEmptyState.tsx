/**
 * VidyaSetu Mobile — AppEmptyState Component
 * ===========================================
 * Empty state container with visual icon, clear explanatory copy,
 * and primary action button.
 */
import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, radius, typography } from '../../theme';
import AppButton, { ButtonVariant } from './AppButton';

export interface AppEmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionVariant?: ButtonVariant;
  secondaryLabel?: string;
  onSecondaryAction?: () => void;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}

export default function AppEmptyState({
  icon = 'inbox',
  title,
  description,
  actionLabel,
  onAction,
  actionVariant = 'primary',
  secondaryLabel,
  onSecondaryAction,
  style,
  compact = false,
}: AppEmptyStateProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, compact && styles.compact, style]}>
      {/* Icon Circle */}
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor: colors.surfaceAlt,
            width: compact ? 52 : 72,
            height: compact ? 52 : 72,
          },
        ]}
      >
        <Icon
          name={icon}
          size={compact ? 22 : 30}
          color={colors.textTertiary}
          solid
        />
      </View>

      {/* Text Info */}
      <Text style={[styles.title, { color: colors.text, fontSize: compact ? typography.size.md : typography.size.lg }]}>
        {title}
      </Text>

      {description && (
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {description}
        </Text>
      )}

      {/* Action Buttons */}
      {(actionLabel || secondaryLabel) && (
        <View style={styles.actionRow}>
          {secondaryLabel && onSecondaryAction && (
            <AppButton
              label={secondaryLabel}
              variant="ghost"
              size={compact ? 'sm' : 'md'}
              onPress={onSecondaryAction}
            />
          )}
          {actionLabel && onAction && (
            <AppButton
              label={actionLabel}
              variant={actionVariant}
              size={compact ? 'sm' : 'md'}
              onPress={onAction}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['3xl'],
    paddingHorizontal: spacing.xl,
  },
  compact: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.base,
  },
  iconWrap: {
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.base,
  },
  title: {
    fontWeight: typography.weight.bold,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: typography.size.sm,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
});
