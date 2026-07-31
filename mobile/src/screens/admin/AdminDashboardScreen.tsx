/**
 * EduShakti One ERP — Admin Dashboard Screen (Premium Redesign)
 * ==============================================================
 * Premium hero header, animated stat grid, quick actions,
 * today's summary, announcements feed with priority badges.
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Animated, Platform, Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/ThemeContext';
import { dashboardAPI, communicationAPI } from '../../services/api';
import StatCard from '../../components/ui/StatCard';
import SectionHeader from '../../components/ui/SectionHeader';
import Badge from '../../components/ui/Badge';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import PremiumCard from '../../components/ui/PremiumCard';
import { spacing, radius, typography, shadows } from '../../theme';

const { width } = Dimensions.get('window');
const CUR_YEAR = '2025-2026';

const QUICK_ACTIONS = [
  { icon: 'clipboard-check', label: 'Attendance', screen: 'Attendance', color: '#6366f1' },
  { icon: 'user-graduate',   label: 'Students',   screen: 'Students',   color: '#10b981' },
  { icon: 'rupee-sign',      label: 'Fees',        screen: 'Fees',       color: '#f59e0b' },
  { icon: 'book-open',       label: 'Lessons',     screen: 'Plans',      color: '#3b82f6' },
  { icon: 'calendar-alt',    label: 'Timetable',   screen: 'Timetable',  color: '#8b5cf6' },
  { icon: 'bullhorn',        label: 'Notices',     screen: 'Notifications', color: '#ec4899' },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return { text: 'Good Morning', icon: 'sun' };
  if (h < 17) return { text: 'Good Afternoon', icon: 'cloud-sun' };
  return { text: 'Good Evening', icon: 'moon' };
}

export default function AdminDashboardScreen({ navigation }: { navigation: any }) {
  const { user } = useAuthStore();
  const { colors, roleAccent, isDark } = useTheme();
  const [stats, setStats] = useState<Record<string, number>>({});
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  const fetchData = useCallback(async () => {
    try {
      const [sum, ann] = await Promise.allSettled([
        dashboardAPI.getSummary(CUR_YEAR),
        communicationAPI.getAnnouncements({ limit: 5 }),
      ]);
      if (sum.status === 'fulfilled') setStats(sum.value.data?.data ?? {});
      if (ann.status === 'fulfilled') setAnnouncements(ann.value.data?.data?.items ?? []);
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const greeting = getGreeting();
  const firstName = user?.full_name?.split(' ')[0] ?? 'Admin';
  const roleName = user?.roles?.[0]?.name ?? 'Administrator';

  // Header parallax
  const headerScale = scrollY.interpolate({ inputRange: [-60, 0], outputRange: [1.06, 1], extrapolate: 'clamp' });
  const headerOpacity = scrollY.interpolate({ inputRange: [0, 100], outputRange: [1, 0.92], extrapolate: 'clamp' });

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {/* ── Hero Header ─────────────────────────────────────────── */}
        <Animated.View style={{ transform: [{ scale: headerScale }], opacity: headerOpacity }}>
          <LinearGradient
            colors={roleAccent.gradient}
            style={[styles.hero, { paddingTop: Platform.OS === 'ios' ? 56 : 40 }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Decorative circles */}
            <View style={[styles.heroCircle1, { backgroundColor: 'rgba(255,255,255,0.07)' }]} />
            <View style={[styles.heroCircle2, { backgroundColor: 'rgba(255,255,255,0.05)' }]} />

            <View style={styles.heroContent}>
              <View style={styles.heroLeft}>
                <View style={styles.greetingRow}>
                  <Icon name={greeting.icon} size={13} color="rgba(255,255,255,0.8)" solid />
                  <Text style={styles.greetingText}>{greeting.text}</Text>
                </View>
                <Text style={styles.heroName}>{firstName}</Text>
                <View style={[styles.rolePill, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
                  <Icon name="shield-alt" size={10} color="rgba(255,255,255,0.9)" solid />
                  <Text style={styles.rolePillText}>{roleName}</Text>
                </View>
              </View>
              <View style={styles.heroRight}>
                {/* Avatar */}
                <TouchableOpacity
                  style={[styles.avatarWrap, { backgroundColor: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.4)' }]}
                  onPress={() => navigation.navigate('Profile')}
                >
                  <Text style={styles.avatarText}>{firstName[0]}</Text>
                </TouchableOpacity>
                {/* Notification Bell */}
                <TouchableOpacity
                  style={[styles.bellBtn, { backgroundColor: 'rgba(255,255,255,0.15)' }]}
                  onPress={() => navigation.navigate('Notifications')}
                >
                  <Icon name="bell" size={16} color="#fff" solid />
                  {announcements.length > 0 && (
                    <View style={styles.bellBadge}>
                      <Text style={styles.bellBadgeText}>{Math.min(announcements.length, 9)}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Academic Year Badge */}
            <View style={[styles.academicBadge, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
              <Icon name="calendar" size={10} color="rgba(255,255,255,0.9)" solid />
              <Text style={styles.academicText}>Academic Year: {CUR_YEAR}</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ── Stats Grid ─────────────────────────────────────────── */}
        <View style={styles.section}>
          <SectionHeader title="Overview" icon="chart-bar" />
          {loading ? (
            <View style={styles.statsGrid}>
              <SkeletonLoader variant="stat" count={4} />
            </View>
          ) : (
            <View style={styles.statsGrid}>
              <StatCard
                label="Total Students"
                value={stats.total_students ?? '—'}
                icon="user-graduate"
                color={colors.primary}
                trend="up"
                trendValue="+4% this month"
              />
              <StatCard
                label="Today's Attendance"
                value={stats.today_attendance ? `${stats.today_attendance}%` : '—'}
                icon="clipboard-check"
                color={colors.success}
                trend={stats.today_attendance >= 80 ? 'up' : 'down'}
                trendValue={stats.today_attendance >= 80 ? 'Good' : 'Low'}
              />
              <StatCard
                label="Fees Collected"
                value={stats.fees_collected ? `₹${(stats.fees_collected / 1000).toFixed(0)}K` : '—'}
                icon="rupee-sign"
                color={colors.warning}
                gradient={['#f59e0b', '#d97706']}
              />
              <StatCard
                label="Pending Dues"
                value={stats.pending_dues ?? '—'}
                icon="exclamation-triangle"
                color={colors.danger}
                trend={stats.pending_dues > 0 ? 'down' : 'neutral'}
                trendValue={stats.pending_dues > 0 ? 'Needs attention' : 'All clear'}
              />
            </View>
          )}
        </View>

        {/* ── Quick Actions ──────────────────────────────────────── */}
        <View style={styles.section}>
          <SectionHeader title="Quick Actions" icon="bolt" />
          <View style={styles.actionsGrid}>
            {QUICK_ACTIONS.map((item, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.actionBtn, { backgroundColor: colors.surface, ...shadows.sm }]}
                onPress={() => navigation.navigate(item.screen)}
                activeOpacity={0.75}
              >
                <View style={[styles.actionIconWrap, { backgroundColor: `${item.color}18` }]}>
                  <Icon name={item.icon} size={20} color={item.color} solid />
                </View>
                <Text style={[styles.actionLabel, { color: colors.text }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── AI Suggestion Card ────────────────────────────────── */}
        <View style={styles.section}>
          <PremiumCard variant="default" style={[styles.aiCard, { borderLeftWidth: 4, borderLeftColor: colors.primary }]}>
            <View style={styles.aiHeader}>
              <View style={[styles.aiIconWrap, { backgroundColor: colors.primaryBg }]}>
                <Icon name="robot" size={16} color={colors.primary} solid />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.aiTitle, { color: colors.text }]}>AI Insight</Text>
                <Text style={[styles.aiSubtitle, { color: colors.textSecondary }]}>
                  Attendance is below 80% in 3 classes this week. Consider sending reminders to parents.
                </Text>
              </View>
            </View>
          </PremiumCard>
        </View>

        {/* ── Announcements ─────────────────────────────────────── */}
        {announcements.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title="Announcements"
              icon="bullhorn"
              onViewAll={() => navigation.navigate('Notifications')}
            />
            {loading ? (
              <SkeletonLoader variant="list" count={3} />
            ) : (
              announcements.slice(0, 4).map((ann: any, i) => (
                <PremiumCard key={ann.id ?? i} variant="bordered" style={styles.annCard} padding={12}>
                  <View style={styles.annRow}>
                    <View style={[styles.annIconWrap, { backgroundColor: colors.primaryBg }]}>
                      <Icon name="bullhorn" size={14} color={colors.primary} solid />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.annTitle, { color: colors.text }]} numberOfLines={1}>
                        {ann.title}
                      </Text>
                      <Text style={[styles.annBody, { color: colors.textSecondary }]} numberOfLines={2}>
                        {ann.content}
                      </Text>
                      <View style={styles.annMeta}>
                        <Icon name="clock" size={10} color={colors.textTertiary} solid />
                        <Text style={[styles.annDate, { color: colors.textTertiary }]}>
                          {new Date(ann.created_at).toLocaleDateString('en-IN')}
                        </Text>
                        <Badge label="General" variant="primary" size="sm" rounded />
                      </View>
                    </View>
                  </View>
                </PremiumCard>
              ))
            )}
          </View>
        )}

        <View style={{ height: spacing['3xl'] }} />
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  /* Hero */
  hero: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing['2xl'],
    overflow: 'hidden',
  },
  heroCircle1: {
    position: 'absolute',
    width: 220, height: 220,
    borderRadius: 110,
    top: -80, right: -60,
  },
  heroCircle2: {
    position: 'absolute',
    width: 160, height: 160,
    borderRadius: 80,
    bottom: -40, left: -40,
  },
  heroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: spacing.sm,
  },
  heroLeft: { flex: 1, gap: 4 },
  heroRight: { gap: 8, alignItems: 'flex-end' },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  greetingText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
  },
  heroName: {
    color: '#fff',
    fontSize: typography.size['3xl'],
    fontWeight: typography.weight.extrabold,
    letterSpacing: -0.5,
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    marginTop: 2,
  },
  rolePillText: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
  },
  avatarWrap: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2,
  },
  avatarText: {
    color: '#fff',
    fontSize: typography.size.lg,
    fontWeight: typography.weight.black,
  },
  bellBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: -3, right: -3,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: '#ef4444',
    alignItems: 'center', justifyContent: 'center',
  },
  bellBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  academicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: radius.full,
    marginTop: spacing.base,
  },
  academicText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
  },

  /* Sections */
  section: {
    paddingHorizontal: spacing.base,
    marginTop: spacing.xl,
  },

  /* Stats Grid */
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },

  /* Actions */
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionBtn: {
    width: (width - spacing.base * 2 - spacing.sm * 2) / 3,
    borderRadius: radius.xl,
    padding: spacing.md,
    alignItems: 'center',
    gap: 6,
  },
  actionIconWrap: {
    width: 48, height: 48,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    textAlign: 'center',
  },

  /* AI Card */
  aiCard: { borderRadius: radius.xl },
  aiHeader: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  aiIconWrap: {
    width: 40, height: 40, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  aiTitle: { fontSize: typography.size.md, fontWeight: typography.weight.bold, marginBottom: 3 },
  aiSubtitle: { fontSize: typography.size.sm, lineHeight: 18 },

  /* Announcements */
  annCard: { marginBottom: spacing.sm },
  annRow: { flexDirection: 'row', gap: spacing.md },
  annIconWrap: {
    width: 40, height: 40, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  annTitle: { fontSize: typography.size.md, fontWeight: typography.weight.bold },
  annBody: { fontSize: typography.size.sm, marginTop: 2, lineHeight: 16 },
  annMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  annDate: { fontSize: typography.size.xs },
});
