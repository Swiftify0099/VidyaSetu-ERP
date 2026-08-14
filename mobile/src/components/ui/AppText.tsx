/**
 * VidyaSetu Mobile — AppText Component
 * =====================================
 * Single unified typography component supporting semantic hierarchy presets:
 * display | h1 | h2 | h3 | bodyLarge | body | bodySmall | caption | label | button | muted
 */
import React from 'react';
import { Text, TextProps, StyleSheet, TextStyle, StyleProp } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { typography, textPresets } from '../../theme';

export type TextVariant =
  | 'display'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'bodyLarge'
  | 'body'
  | 'bodySmall'
  | 'caption'
  | 'label'
  | 'button'
  | 'muted';

export interface AppTextProps extends TextProps {
  variant?: TextVariant;
  color?: string;
  weight?: keyof typeof typography.weight;
  align?: 'left' | 'center' | 'right' | 'justify';
  style?: StyleProp<TextStyle>;
  children?: React.ReactNode;
}

export default function AppText({
  variant = 'body',
  color,
  weight,
  align = 'left',
  style,
  children,
  ...rest
}: AppTextProps) {
  const { colors } = useTheme();

  const presetStyle = textPresets[variant === 'muted' ? 'caption' : variant] || textPresets.body;

  const defaultColor = (() => {
    switch (variant) {
      case 'display':
      case 'h1':
      case 'h2':
      case 'h3':
        return colors.textPrimary;
      case 'bodyLarge':
      case 'body':
        return colors.text;
      case 'bodySmall':
      case 'label':
        return colors.textSecondary;
      case 'caption':
      case 'muted':
        return colors.textTertiary;
      case 'button':
        return colors.textOnPrimary;
      default:
        return colors.text;
    }
  })();

  const computedStyle: TextStyle = {
    ...presetStyle,
    color: color ?? defaultColor,
    textAlign: align,
    ...(weight ? { fontWeight: typography.weight[weight] } : {}),
  };

  return (
    <Text style={[computedStyle, style]} {...rest}>
      {children}
    </Text>
  );
}
