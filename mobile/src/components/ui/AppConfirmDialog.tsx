/**
 * VidyaSetu Mobile — AppConfirmDialog Component
 * ===============================================
 * Confirmation dialog for critical operations (Approve, Reject, Delete, Logout)
 * with semantic styling and loading state.
 */
import React from 'react';
import AppModal from './AppModal';
import { useTheme } from '../../theme/ThemeContext';
import { ButtonVariant } from './AppButton';

export interface AppConfirmDialogProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary' | 'success';
  loading?: boolean;
  icon?: string;
}

export default function AppConfirmDialog({
  visible,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  loading = false,
  icon,
}: AppConfirmDialogProps) {
  const { colors } = useTheme();

  const variantConfig = (() => {
    switch (variant) {
      case 'danger':
        return {
          icon: icon || 'trash-alt',
          iconColor: colors.danger,
          buttonVariant: 'danger' as ButtonVariant,
        };
      case 'warning':
        return {
          icon: icon || 'exclamation-triangle',
          iconColor: colors.warning,
          buttonVariant: 'warning' as ButtonVariant,
        };
      case 'success':
        return {
          icon: icon || 'check-circle',
          iconColor: colors.success,
          buttonVariant: 'success' as ButtonVariant,
        };
      case 'primary':
      default:
        return {
          icon: icon || 'question-circle',
          iconColor: colors.primary,
          buttonVariant: 'primary' as ButtonVariant,
        };
    }
  })();

  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      title={title}
      subtitle={message}
      icon={variantConfig.icon}
      iconColor={variantConfig.iconColor}
      primaryAction={{
        label: confirmLabel,
        onPress: onConfirm,
        variant: variantConfig.buttonVariant,
        loading,
      }}
      secondaryAction={{
        label: cancelLabel,
        onPress: onClose,
        variant: 'ghost',
      }}
    />
  );
}
