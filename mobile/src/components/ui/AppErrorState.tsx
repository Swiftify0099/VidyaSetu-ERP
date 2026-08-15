/**
 * VidyaSetu Mobile — AppErrorState Component
 * ===========================================
 * Centralized error presentation component with sanitized user-facing messages,
 * retry action, and collapsible technical debug details in DEV mode.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
  ScrollView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, radius, typography, shadows } from '../../theme';
import { parseApiError, AppErrorInfo } from '../../services/apiError';
import AppButton from './AppButton';

export interface AppErrorStateProps {
  error?: any;
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  onSecondaryAction?: () => void;
  secondaryActionLabel?: string;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}

export default function AppErrorState({
  error,
  title,
  message,
  onRetry,
  retryLabel = 'Try Again',
  onSecondaryAction,
  secondaryActionLabel = 'Go Back',
  style,
  compact = false,
}: AppErrorStateProps) {
  const { colors } = useTheme();
  const [showDebug, setShowDebug] = useState(false);

  const errorInfo: AppErrorInfo = error
    ? parseApiError(error, title)
    : {
        title: title || 'Something Went Wrong',
        message: message || 'An unexpected error occurred. Please try again.',
        category: 'unknown',
        isRetryable: !!onRetry,
      };

  const finalTitle = title || errorInfo.title;
  const finalMessage = message || errorInfo.message;

  const iconName = (() => {
    switch (errorInfo.category) {
      case 'network':
      case 'timeout':
        return 'wifi';
      case 'auth':
        return 'lock';
      case 'permission':
        return 'shield-alt';
      case 'notFound':
        return 'search';
      default:
        return 'exclamation-circle';
    }
  })();

  return (
    <View style={[styles.container, compact && styles.compact, style]}>
      {/* Icon */}
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor: colors.dangerBg,
            width: compact ? 48 : 64,
            height: compact ? 48 : 64,
          },
        ]}
      >
        <Icon
          name={iconName}
          size={compact ? 20 : 26}
          color={colors.danger}
          solid
        />
      </View>

      {/* Title & Message */}
      <Text
        style={[
          styles.title,
          {
            color: colors.text,
            fontSize: compact ? typography.size.md : typography.size.lg,
          },
        ]}
      >
        {finalTitle}
      </Text>

      <Text style={[styles.message, { color: colors.textSecondary }]}>
        {finalMessage}
      </Text>

      {/* Action Buttons */}
      {(onRetry || onSecondaryAction) && (
        <View style={styles.actionRow}>
          {onSecondaryAction && (
            <AppButton
              label={secondaryActionLabel}
              variant="ghost"
              size={compact ? 'sm' : 'md'}
              onPress={onSecondaryAction}
            />
          )}
          {onRetry && (
            <AppButton
              label={retryLabel}
              variant="primary"
              size={compact ? 'sm' : 'md'}
              iconLeft="redo-alt"
              onPress={onRetry}
            />
          )}
        </View>
      )}

      {/* Developer Debug Accordion (DEV Only) */}
      {__DEV__ && errorInfo.debugDetails && (
        <View style={[styles.debugSection, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}>
          <TouchableOpacity
            style={styles.debugHeader}
            onPress={() => setShowDebug(v => !v)}
            activeOpacity={0.7}
          >
            <Icon name="bug" size={11} color={colors.textTertiary} />
            <Text style={[styles.debugTitle, { color: colors.textTertiary }]}>
              Debug Info {errorInfo.statusCode ? `(${errorInfo.statusCode})` : ''}
            </Text>
            <Icon
              name={showDebug ? 'chevron-up' : 'chevron-down'}
              size={10}
              color={colors.textTertiary}
              style={{ marginLeft: 'auto' }}
            />
          </TouchableOpacity>

          {showDebug && (
            <View style={styles.debugBody}>
              {errorInfo.debugDetails.endpoint && (
                <Text style={[styles.debugText, { color: colors.textSecondary }]}>
                  <Text style={{ fontWeight: 'bold' }}>Endpoint: </Text>
                  {errorInfo.debugDetails.method} {errorInfo.debugDetails.endpoint}
                </Text>
              )}
              <Text style={[styles.debugText, { color: colors.textSecondary }]}>
                <Text style={{ fontWeight: 'bold' }}>Raw Error: </Text>
                {errorInfo.debugDetails.originalMessage}
              </Text>
              <Text style={[styles.debugText, { color: colors.textTertiary }]}>
                <Text style={{ fontWeight: 'bold' }}>Timestamp: </Text>
                {errorInfo.debugDetails.timestamp}
              </Text>
            </View>
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
  message: {
    fontSize: typography.size.sm,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 300,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  debugSection: {
    marginTop: spacing.xl,
    width: '100%',
    maxWidth: 340,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  debugHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  debugTitle: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
  },
  debugBody: {
    padding: spacing.md,
    paddingTop: 0,
    gap: 4,
  },
  debugText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});
