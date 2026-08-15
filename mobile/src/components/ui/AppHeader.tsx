/**
 * VidyaSetu Mobile — AppHeader Component
 * =======================================
 * Top navigation bar with back action, title, subtitle, right buttons,
 * and optional role accent styling.
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, radius, typography, shadows } from '../../theme';
import AppIconButton from './AppIconButton';

export interface AppHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBackPress?: () => void;
  rightActionIcon?: string;
  onRightActionPress?: () => void;
  rightActionBadge?: number | string | boolean;
  customRight?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  transparent?: boolean;
}

export default function AppHeader({
  title,
  subtitle,
  showBack = true,
  onBackPress,
  rightActionIcon,
  onRightActionPress,
  rightActionBadge,
  customRight,
  style,
  transparent = false,
}: AppHeaderProps) {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();

  const canGoBack = navigation.canGoBack();
  const shouldShowBack = showBack && (canGoBack || !!onBackPress);

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
    } else if (canGoBack) {
      navigation.goBack();
    }
  };

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: transparent ? 'transparent' : colors.header,
          borderBottomColor: transparent ? 'transparent' : colors.headerBorder,
          borderBottomWidth: transparent ? 0 : 1,
        },
        style,
      ]}
    >
      <View style={styles.contentRow}>
        {/* Left Action (Back or Placeholder) */}
        {shouldShowBack ? (
          <AppIconButton
            icon="arrow-left"
            size="sm"
            variant="ghost"
            onPress={handleBack}
            accessibilityLabel="Go back"
            style={styles.backBtn}
          />
        ) : (
          <View style={styles.placeholder} />
        )}

        {/* Center Title & Subtitle */}
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: colors.headerText }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[styles.subtitle, { color: colors.textTertiary }]} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>

        {/* Right Actions */}
        <View style={styles.rightContainer}>
          {customRight ? (
            customRight
          ) : rightActionIcon && onRightActionPress ? (
            <AppIconButton
              icon={rightActionIcon}
              size="sm"
              variant="ghost"
              badge={rightActionBadge}
              onPress={onRightActionPress}
            />
          ) : (
            <View style={styles.placeholder} />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.base,
    paddingTop: Platform.OS === 'ios' ? 8 : spacing.sm,
    paddingBottom: spacing.sm,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  backBtn: {
    marginLeft: -spacing.xs,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  title: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
    marginTop: 1,
    textAlign: 'center',
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    minWidth: 36,
  },
  placeholder: {
    width: 36,
  },
});
