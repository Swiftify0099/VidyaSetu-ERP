/**
 * SkeletonLoader — Shimmer loading placeholders
 * Variants: card | list | stat | text | avatar
 */
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, spacing } from '../../theme';

type SkeletonVariant = 'card' | 'list' | 'stat' | 'text' | 'avatar' | 'strip';

interface SkeletonLoaderProps {
  variant?: SkeletonVariant;
  count?: number;
  width?: number | string;
  height?: number;
}

function ShimmerBox({ width, height, borderRadius = 8, style }: {
  width?: number | string; height?: number; borderRadius?: number; style?: any;
}) {
  const { colors, isDark } = useTheme();
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
    return () => shimmer.stopAnimation();
  }, []);

  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-300, 300],
  });

  const baseColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const shineColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.8)';

  return (
    <View style={[{ backgroundColor: baseColor, borderRadius, overflow: 'hidden', width, height }, style]}>
      <Animated.View
        style={{
          position: 'absolute',
          top: 0, bottom: 0, width: 200,
          backgroundColor: shineColor,
          opacity: 0.6,
          transform: [{ translateX }],
        }}
      />
    </View>
  );
}

export default function SkeletonLoader({ variant = 'card', count = 1 }: SkeletonLoaderProps) {
  const { colors } = useTheme();

  const renderSkeleton = (key: number) => {
    switch (variant) {
      case 'stat':
        return (
          <View key={key} style={[styles.statSkeleton, { backgroundColor: colors.surface, ...getShadow() }]}>
            <ShimmerBox width={36} height={36} borderRadius={10} />
            <ShimmerBox width="60%" height={28} borderRadius={6} style={{ marginTop: 8 }} />
            <ShimmerBox width="80%" height={12} borderRadius={4} style={{ marginTop: 6 }} />
          </View>
        );
      case 'list':
        return (
          <View key={key} style={[styles.listSkeleton, { backgroundColor: colors.surface, ...getShadow() }]}>
            <ShimmerBox width={44} height={44} borderRadius={22} />
            <View style={{ flex: 1, gap: 8 }}>
              <ShimmerBox width="70%" height={14} borderRadius={4} />
              <ShimmerBox width="50%" height={11} borderRadius={4} />
            </View>
          </View>
        );
      case 'avatar':
        return <ShimmerBox key={key} width={60} height={60} borderRadius={30} />;
      case 'text':
        return (
          <View key={key} style={{ gap: 8 }}>
            <ShimmerBox width="100%" height={14} borderRadius={4} />
            <ShimmerBox width="80%" height={14} borderRadius={4} />
            <ShimmerBox width="60%" height={14} borderRadius={4} />
          </View>
        );
      case 'strip':
        return <ShimmerBox key={key} width="100%" height={48} borderRadius={12} style={{ marginBottom: 8 }} />;
      default: // card
        return (
          <View key={key} style={[styles.cardSkeleton, { backgroundColor: colors.surface, ...getShadow() }]}>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 16 }}>
              <ShimmerBox width={48} height={48} borderRadius={12} />
              <View style={{ flex: 1, gap: 8 }}>
                <ShimmerBox width="60%" height={16} borderRadius={4} />
                <ShimmerBox width="40%" height={12} borderRadius={4} />
              </View>
            </View>
            <ShimmerBox width="100%" height={12} borderRadius={4} />
            <ShimmerBox width="85%" height={12} borderRadius={4} style={{ marginTop: 6 }} />
            <ShimmerBox width="55%" height={12} borderRadius={4} style={{ marginTop: 6 }} />
          </View>
        );
    }
  };

  const getShadow = () => ({
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  });

  return (
    <View style={styles.wrapper}>
      {Array.from({ length: count }).map((_, i) => renderSkeleton(i))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.md },
  cardSkeleton: {
    borderRadius: radius.xl,
    padding: spacing.base,
  },
  statSkeleton: {
    borderRadius: radius.xl,
    padding: spacing.base,
    flex: 1,
    minWidth: '45%',
  },
  listSkeleton: {
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
});
