/**
 * VidyaSetu Mobile — AppModal Component
 * ======================================
 * Centered dialog modal with smooth backdrop, icon, title, description,
 * custom body, and action buttons.
 */
import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, radius, typography, shadows } from '../../theme';
import AppButton, { ButtonVariant } from './AppButton';

export interface AppModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  icon?: string;
  iconColor?: string;
  children?: React.ReactNode;
  primaryAction?: {
    label: string;
    onPress: () => void;
    variant?: ButtonVariant;
    loading?: boolean;
  };
  secondaryAction?: {
    label: string;
    onPress: () => void;
    variant?: ButtonVariant;
  };
  dismissable?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function AppModal({
  visible,
  onClose,
  title,
  subtitle,
  icon,
  iconColor,
  children,
  primaryAction,
  secondaryAction,
  dismissable = true,
  style,
}: AppModalProps) {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={() => dismissable && onClose()}
    >
      <KeyboardAvoidingView
        style={[styles.overlay, { backgroundColor: colors.overlay }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => dismissable && onClose()}
        />

        <View style={[styles.dialogCard, { backgroundColor: colors.surface }, style]}>
          {/* Top Icon Pill */}
          {icon && (
            <View
              style={[
                styles.iconWrap,
                {
                  backgroundColor: iconColor ? `${iconColor}18` : colors.primaryBg,
                },
              ]}
            >
              <Icon
                name={icon}
                size={22}
                color={iconColor ?? colors.primary}
                solid
              />
            </View>
          )}

          {/* Title & Subtitle */}
          {title && (
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          )}
          {subtitle && (
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
          )}

          {/* Body Content */}
          {children && <View style={styles.bodyWrap}>{children}</View>}

          {/* Action Buttons */}
          {(primaryAction || secondaryAction) && (
            <View style={styles.actionRow}>
              {secondaryAction && (
                <AppButton
                  label={secondaryAction.label}
                  variant={secondaryAction.variant || 'ghost'}
                  onPress={secondaryAction.onPress}
                  style={styles.flexBtn}
                  fullWidth
                />
              )}
              {primaryAction && (
                <AppButton
                  label={primaryAction.label}
                  variant={primaryAction.variant || 'primary'}
                  onPress={primaryAction.onPress}
                  loading={primaryAction.loading}
                  style={styles.flexBtn}
                  fullWidth
                />
              )}
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: radius['2xl'],
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.xl,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.base,
  },
  title: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.size.sm,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: spacing.base,
  },
  bodyWrap: {
    width: '100%',
    marginVertical: spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.base,
    width: '100%',
  },
  flexBtn: {
    flex: 1,
  },
});
