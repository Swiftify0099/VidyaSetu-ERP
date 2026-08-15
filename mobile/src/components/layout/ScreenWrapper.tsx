/**
 * VidyaSetu Mobile — ScreenWrapper Component
 * ===========================================
 * Consistent screen layout container with safe areas, scroll view with pull-to-refresh,
 * integrated AppHeader, loading overlay, and error state handling.
 */
import React from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  ScrollView,
  RefreshControl,
  StyleProp,
  ViewStyle,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme';
import AppHeader, { AppHeaderProps } from '../ui/AppHeader';
import AppLoading from '../ui/AppLoading';
import AppErrorState from '../ui/AppErrorState';

export interface ScreenWrapperProps {
  children?: React.ReactNode;
  header?: AppHeaderProps;
  scrollable?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  loading?: boolean;
  loadingMessage?: string;
  error?: any;
  onRetry?: () => void;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  edges?: Edge[];
  noPadding?: boolean;
  keyboardAvoiding?: boolean;
}

export default function ScreenWrapper({
  children,
  header,
  scrollable = false,
  refreshing = false,
  onRefresh,
  loading = false,
  loadingMessage,
  error,
  onRetry,
  style,
  contentStyle,
  edges = ['bottom', 'left', 'right'],
  noPadding = false,
  keyboardAvoiding = false,
}: ScreenWrapperProps) {
  const { colors, isDark } = useTheme();

  const renderBody = () => {
    if (loading && !refreshing) {
      return <AppLoading message={loadingMessage} fullScreen />;
    }

    if (error && !refreshing) {
      return (
        <AppErrorState
          error={error}
          onRetry={onRetry}
          style={{ flex: 1 }}
        />
      );
    }

    if (scrollable) {
      return (
        <ScrollView
          style={styles.flex}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            !noPadding && styles.scrollContent,
            contentStyle,
          ]}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      );
    }

    return (
      <View style={[styles.flex, !noPadding && styles.padded, contentStyle]}>
        {children}
      </View>
    );
  };

  const content = (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }, style]}
      edges={edges}
    >
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />
      {header && <AppHeader {...header} />}
      {renderBody()}
    </SafeAreaView>
  );

  if (keyboardAvoiding) {
    return (
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {content}
      </KeyboardAvoidingView>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  padded: {
    paddingHorizontal: spacing.base,
  },
  scrollContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing['3xl'],
  },
});
