/**
 * VidyaSetu Mobile — AppChip Component
 * =====================================
 * Interactive filter chip with active highlight, count badge, icon, and spring animation.
 */
import React, { useCallback } from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, radius, typography } from '../../theme';

export interface AppChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: string;
  count?: number | string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function AppChip({
  label,
  selected = false,
  onPress,
  icon,
  count,
  disabled = false,
  style,
}: AppChipProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = useCallback(() => {
    scale.value = withSpring(0.94, { damping: 15, stiffness: 350 });
  }, []);

  const onPressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 350 });
  }, []);

  return (
    <AnimatedTouchable
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.primary : colors.surface,
          borderColor: selected ? colors.primary : colors.border,
          borderWidth: 1,
          opacity: disabled ? 0.5 : 1,
        },
        animatedStyle,
        style,
      ]}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled}
      activeOpacity={1}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
    >
      {icon && (
        <Icon
          name={icon}
          size={12}
          color={selected ? colors.textOnPrimary : colors.textSecondary}
          style={{ marginRight: 5 }}
        />
      )}
      <Text
        style={[
          styles.label,
          {
            color: selected ? colors.textOnPrimary : colors.text,
            fontWeight: selected ? typography.weight.bold : typography.weight.medium,
          },
        ]}
      >
        {label}
      </Text>
      {count !== undefined && (
        <View
          style={[
            styles.countWrap,
            {
              backgroundColor: selected
                ? 'rgba(255,255,255,0.25)'
                : colors.surfaceAlt,
            },
          ]}
        >
          <Text
            style={[
              styles.countText,
              { color: selected ? colors.textOnPrimary : colors.textSecondary },
            ]}
          >
            {count}
          </Text>
        </View>
      )}
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
  },
  label: {
    fontSize: typography.size.sm,
  },
  countWrap: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
  },
  countText: {
    fontSize: typography.size['2xs'],
    fontWeight: typography.weight.bold,
  },
});
