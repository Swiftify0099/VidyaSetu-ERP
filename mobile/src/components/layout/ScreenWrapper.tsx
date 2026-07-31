/**
 * ScreenWrapper — Consistent screen container with safe area + background
 */
import React from 'react';
import { View, StyleSheet, StatusBar, ScrollView, RefreshControl, StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';

interface ScreenWrapperProps {
  children: React.ReactNode;
  scrollable?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  edges?: Array<'top' | 'bottom' | 'left' | 'right'>;
  noPadding?: boolean;
}

export default function ScreenWrapper({
  children,
  scrollable = false,
  refreshing = false,
  onRefresh,
  style,
  contentStyle,
  edges = ['bottom', 'left', 'right'],
  noPadding = false,
}: ScreenWrapperProps) {
  const { colors, isDark } = useTheme();

  const content = scrollable ? (
    <ScrollView
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={false}
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
  ) : (
    <View style={[styles.flex, !noPadding && styles.padded, contentStyle]}>
      {children}
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }, style]}
      edges={edges}
    >
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />
      {content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  padded: { paddingHorizontal: 16 },
  scrollContent: { paddingBottom: 32 },
});
