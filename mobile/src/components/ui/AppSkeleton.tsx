/**
 * VidyaSetu Mobile — AppSkeleton Loader Component
 * =================================================
 * High performance shimmer loading placeholders for cards, lists,
 * stat grids, profiles, avatars, and table rows.
 */
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, spacing, shadows } from '../../theme';

export type SkeletonVariant =
  | 'card'
  | 'list'
  | 'stat'
  | 'text'
  | 'avatar'
  | 'strip'
  | 'profile'
  | 'table';

export interface AppSkeletonProps {
  variant?: SkeletonVariant;
  count?: number;
  width?: number | string;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

export function ShimmerBox({
  width,
  height,
  borderRadius = radius.sm,
  style,
}: {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}) {
  const { isDark } = useTheme();
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1300,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-260, 260],
  });

  const baseColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)';
  const shineColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.7)';

  return (
    <View style={[{ backgroundColor: baseColor, borderRadius, overflow: 'hidden', width, height }, style]}>
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          width: 180,
          backgroundColor: shineColor,
          opacity: 0.5,
          transform: [{ translateX }],
        }}
      />
    </View>
  );
}

export default function AppSkeleton({
  variant = 'card',
  count = 1,
  style,
}: AppSkeletonProps) {
  const { colors } = useTheme();

  const renderSkeleton = (key: number) => {
    switch (variant) {
      case 'stat':
        return (
          <View
            key={key}
            style={[
              styles.statSkeleton,
              { backgroundColor: colors.surface, borderColor: colors.borderSubtle, ...shadows.xs },
            ]}
          >
            <ShimmerBox width={36} height={36} borderRadius={radius.md} />
            <ShimmerBox width="60%" height={26} borderRadius={4} style={{ marginTop: 10 }} />
            <ShimmerBox width="80%" height={12} borderRadius={4} style={{ marginTop: 6 }} />
          </View>
        );

      case 'list':
        return (
          <View
            key={key}
            style={[
              styles.listSkeleton,
              { backgroundColor: colors.surface, borderColor: colors.borderSubtle, ...shadows.xs },
            ]}
          >
            <ShimmerBox width={44} height={44} borderRadius={radius.full} />
            <View style={{ flex: 1, gap: 7 }}>
              <ShimmerBox width="70%" height={14} borderRadius={4} />
              <ShimmerBox width="45%" height={11} borderRadius={4} />
            </View>
          </View>
        );

      case 'avatar':
        return <ShimmerBox key={key} width={50} height={50} borderRadius={radius.full} />;

      case 'text':
        return (
          <View key={key} style={{ gap: 8 }}>
            <ShimmerBox width="100%" height={14} borderRadius={4} />
            <ShimmerBox width="85%" height={14} borderRadius={4} />
            <ShimmerBox width="60%" height={14} borderRadius={4} />
          </View>
        );

      case 'strip':
        return (
          <ShimmerBox
            key={key}
            width="100%"
            height={48}
            borderRadius={radius.lg}
            style={{ marginBottom: 8 }}
          />
        );

      case 'profile':
        return (
          <View key={key} style={[styles.cardSkeleton, { backgroundColor: colors.surface, ...shadows.xs }]}>
            <View style={{ alignItems: 'center', paddingVertical: spacing.md, gap: 12 }}>
              <ShimmerBox width={80} height={80} borderRadius={radius.full} />
              <ShimmerBox width="50%" height={18} borderRadius={4} />
              <ShimmerBox width="30%" height={12} borderRadius={4} />
            </View>
          </View>
        );

      case 'table':
        return (
          <View key={key} style={[styles.tableSkeleton, { backgroundColor: colors.surface }]}>
            <ShimmerBox width="25%" height={14} borderRadius={4} />
            <ShimmerBox width="35%" height={14} borderRadius={4} />
            <ShimmerBox width="20%" height={14} borderRadius={4} />
          </View>
        );

      default: // card
        return (
          <View
            key={key}
            style={[
              styles.cardSkeleton,
              { backgroundColor: colors.surface, borderColor: colors.borderSubtle, ...shadows.xs },
            ]}
          >
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 14 }}>
              <ShimmerBox width={44} height={44} borderRadius={radius.md} />
              <View style={{ flex: 1, gap: 7 }}>
                <ShimmerBox width="65%" height={15} borderRadius={4} />
                <ShimmerBox width="40%" height={11} borderRadius={4} />
              </View>
            </View>
            <ShimmerBox width="100%" height={12} borderRadius={4} />
            <ShimmerBox width="80%" height={12} borderRadius={4} style={{ marginTop: 6 }} />
          </View>
        );
    }
  };

  return (
    <View style={[styles.wrapper, style]}>
      {Array.from({ length: count }).map((_, i) => renderSkeleton(i))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.md,
  },
  cardSkeleton: {
    borderRadius: radius.xl,
    padding: spacing.base,
    borderWidth: 1,
  },
  statSkeleton: {
    borderRadius: radius.xl,
    padding: spacing.base,
    flex: 1,
    minWidth: '45%',
    borderWidth: 1,
  },
  listSkeleton: {
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  tableSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
});
