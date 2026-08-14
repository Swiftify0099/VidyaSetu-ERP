/**
 * VidyaSetu Mobile — AppAvatar Component
 * =======================================
 * User avatar with image loading, fallback initials, role color rings,
 * and status indicators.
 */
import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, typography, shadows } from '../../theme';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type AvatarStatus = 'online' | 'offline' | 'busy' | 'none';

export interface AppAvatarProps {
  name?: string;
  imageUrl?: string;
  size?: AvatarSize;
  status?: AvatarStatus;
  roleColor?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export default function AppAvatar({
  name = 'User',
  imageUrl,
  size = 'md',
  status = 'none',
  roleColor,
  onPress,
  style,
}: AppAvatarProps) {
  const { colors } = useTheme();

  const sizeTokens = {
    xs: { dimension: 28, fontSize: 11, statusSize: 7, borderWidth: 1.5 },
    sm: { dimension: 36, fontSize: 13, statusSize: 9, borderWidth: 1.5 },
    md: { dimension: 46, fontSize: 16, statusSize: 11, borderWidth: 2 },
    lg: { dimension: 60, fontSize: 22, statusSize: 13, borderWidth: 2.5 },
    xl: { dimension: 80, fontSize: 28, statusSize: 16, borderWidth: 3 },
  }[size];

  const initials = (() => {
    if (!name) return 'U';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  })();

  const statusColor = (() => {
    switch (status) {
      case 'online':  return colors.success;
      case 'busy':    return colors.danger;
      case 'offline': return colors.textTertiary;
      default:        return 'transparent';
    }
  })();

  const avatarContent = (
    <View
      style={[
        styles.avatarCircle,
        {
          width: sizeTokens.dimension,
          height: sizeTokens.dimension,
          borderRadius: radius.full,
          backgroundColor: roleColor ? `${roleColor}22` : colors.primaryBg,
          borderColor: roleColor ?? colors.border,
          borderWidth: roleColor ? sizeTokens.borderWidth : 1,
        },
        style,
      ]}
    >
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={[styles.image, { borderRadius: radius.full }]}
          resizeMode="cover"
        />
      ) : (
        <Text
          style={[
            styles.initials,
            {
              fontSize: sizeTokens.fontSize,
              color: roleColor ?? colors.primary,
            },
          ]}
        >
          {initials}
        </Text>
      )}

      {status !== 'none' && (
        <View
          style={[
            styles.statusDot,
            {
              width: sizeTokens.statusSize,
              height: sizeTokens.statusSize,
              borderRadius: radius.full,
              backgroundColor: statusColor,
              borderColor: colors.surface,
            },
          ]}
        />
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {avatarContent}
      </TouchableOpacity>
    );
  }

  return avatarContent;
}

const styles = StyleSheet.create({
  avatarCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  initials: {
    fontWeight: typography.weight.bold,
    letterSpacing: 0.5,
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 1.5,
  },
});
