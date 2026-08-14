/**
 * VidyaSetu Mobile — AppLoading Component
 * ========================================
 * Contextual loading state with animated spinner and custom message.
 */
import React from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, radius, typography } from '../../theme';

export interface AppLoadingProps {
  message?: string;
  size?: 'small' | 'large';
  fullScreen?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function AppLoading({
  message = 'Loading...',
  size = 'large',
  fullScreen = false,
  style,
}: AppLoadingProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        fullScreen && styles.fullScreen,
        { backgroundColor: fullScreen ? colors.background : 'transparent' },
        style,
      ]}
    >
      <ActivityIndicator size={size} color={colors.primary} />
      {message ? (
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          {message}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  fullScreen: {
    flex: 1,
  },
  message: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
  },
});
