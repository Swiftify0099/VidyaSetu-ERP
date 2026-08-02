/**
 * EduShakti One ERP — Teacher Dashboard Screen (Premium Redesign)
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Platform, Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/ThemeContext';
import { dashboardAPI, communicationAPI } from '../../services/api';
import StatCard from '../../components/ui/StatCard';
import SectionHeader from '../../components/ui/SectionHeader';
import PremiumCard from '../../components/ui/PremiumCard';
import Badge from '../../components/ui/Badge';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import { spacing, radius, typography, shadows } from '../../theme';

const { width } = Dimensions.get('window');
const CUR_YEAR = '2025-2026';

const QUICK_ACTIONS = [
  { icon: 'clipboard-check', label: 'Attendance', screen: 'Attendance', color: '#6366f1' },
  { icon: 'pen',             label: 'Marks',      screen: 'Marks',      color: '#10b981' },
  { icon: 'book-open',       label: 'Lesson Plans', screen: 'Plans',    color: '#3b82f6' },
  { icon: 'calendar-alt',    label: 'Timetable',  screen: 'Timetable',  color: '#f59e0b' },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export default function TeacherDashboardScreen({ navigation }: { navigation: any }) {
  const { user } = useAuthStore();
  const { colors, roleAccent } = useTheme();
  const [stats, setStats] = useState<Record<string, number>>({});
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  const firstName = user?.full_name?.split(' ')[0] ?? 'Teacher';
  const roleName  = user?.roles?.[0]?.name ?? 'Teacher';

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {/* ── Hero Header ────────────────────────────────────── */}
        <LinearGradient
          colors={roleAccent.gradient}
          style={[styles.hero, { paddingTop: Platform.OS === 'ios' ? 56 : 40 }]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          <View style={[styles.heroCircle, { backgroundColor: 'rgba(255,255,255,0.07)' }]} />
          <View style={styles.heroContent}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.greetingText}>{getGreeting()}</Text>
              <Text style={styles.heroName}>{firstName}</Text>
              <View style={[styles.rolePill, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
                <Icon name="chalkboard-teacher" size={10} color="rgba(255,255,255,0.9)" solid />
                <Text style={styles.rolePillText}>{roleName}</Text>
              </View>
            </View>
            <View style={{ gap: 8, alignItems: 'flex-end' }}>
              <TouchableOpacity
                style={[styles.avatarWrap, { backgroundColor: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.4)' }]}
                onPress={() => navigation.navigate('Profile')}
              >
                <Text style={styles.avatarText}>{firstName[0]}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.bellBtn, { backgroundColor: 'rgba(255,255,255,0.15)' }]}
                onPress={() => navigation.navigate('Notifications')}
              >
                <Icon name="bell" size={16} color="#fff" solid />
              </TouchableOpacity>
            </View>
          </View>
          <View style={[styles.academicBadge, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
            <Icon name="calendar" size={10} color="rgba(255,255,255,0.9)" solid />
            <Text style={styles.academicText}>{CUR_YEAR}</Text>
          </View>
        </LinearGradient>

        {/* ── Stats ─────────────────────────────────────────── */}
        <View style={styles.section}>
          <SectionHeader title="My Overview" icon="chart-line" />
          {loading ? (
            <View style={styles.statsGrid}><SkeletonLoader variant="stat" count={4} /></View>
          ) : (
            <View style={styles.statsGrid}>
              <StatCard label="My Classes"     value={stats.total_classes ?? '—'}     icon="door-open"       color={colors.primary} />
              <StatCard label="Today Attendance" value={stats.today_attendance ? `${stats.today_attendance}%` : '—'} icon="clipboard-check" color={colors.success} />
              <StatCard label="Pending Marks"  value={stats.pending_marks ?? '—'}     icon="pen"             color={colors.warning} />
              <StatCard label="Lesson Plans"   value={stats.lesson_plans ?? '—'}      icon="book-open"       color={colors.info} />
            </View>
          )}
        </View>

        {/* ── Quick Actions ─────────────────────────────────── */}
        <View style={styles.section}>
          <SectionHeader title="Quick Actions" icon="bolt" />
          <View style={styles.actionsRow}>
            {QUICK_ACTIONS.map((item, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.actionBtn, { backgroundColor: colors.surface, ...shadows.sm }]}
                onPress={() => navigation.navigate(item.screen)}
                activeOpacity={0.75}
              >
                <View style={[styles.actionIconWrap, { backgroundColor: `${item.color}18` }]}>
                  <Icon name={item.icon} size={22} color={item.color} solid />
                </View>
                <Text style={[styles.actionLabel, { color: colors.text }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Today's Schedule Placeholder ─────────────────── */}
        <View style={styles.section}>
          <SectionHeader title="Today's Schedule" icon="clock" onViewAll={() => navigation.navigate('Timetable')} />
          <PremiumCard variant="flat" style={styles.scheduleCard}>
            <View style={styles.scheduleEmptyRow}>
              <View style={[styles.scheduleIcon, { backgroundColor: colors.primaryBg }]}>
                <Icon name="calendar-check" size={22} color={colors.primary} solid />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.scheduleTitle, { color: colors.text }]}>View your timetable</Text>
                <Text style={[styles.scheduleSubtitle, { color: colors.textSecondary }]}>Tap to see your full schedule for today</Text>
              </View>
              <Icon name="chevron-right" size={14} color={colors.textTertiary} solid />
            </View>
          </PremiumCard>
        </View>

        {/* ── Announcements ─────────────────────────────────── */}
        {announcements.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Announcements" icon="bullhorn" onViewAll={() => navigation.navigate('Notifications')} />
            {announcements.slice(0, 3).map((ann: any, i) => (
              <PremiumCard key={ann.id ?? i} variant="bordered" style={styles.annCard} padding={12}>
                <View style={styles.annRow}>
                  <View style={[styles.annIcon, { backgroundColor: colors.primaryBg }]}>
                    <Icon name="bullhorn" size={13} color={colors.primary} solid />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.annTitle, { color: colors.text }]} numberOfLines={1}>{ann.title}</Text>
                    <Text style={[styles.annBody, { color: colors.textSecondary }]} numberOfLines={2}>{ann.content}</Text>
                    <Text style={[styles.annDate, { color: colors.textTertiary }]}>
                      {new Date(ann.created_at).toLocaleDateString('en-IN')}
                    </Text>
                  </View>
                </View>
              </PremiumCard>
            ))}
          </View>
        )}

        <View style={{ height: spacing['3xl'] }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: { paddingHorizontal: spacing.base, paddingBottom: spacing['2xl'], overflow: 'hidden' },
  heroCircle: { position: 'absolute', width: 200, height: 200, borderRadius: 100, top: -70, right: -50 },
  heroContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: spacing.sm },
  greetingText: { color: 'rgba(255,255,255,0.8)', fontSize: typography.size.sm, fontWeight: typography.weight.medium },
  heroName: { color: '#fff', fontSize: typography.size['3xl'], fontWeight: typography.weight.extrabold, letterSpacing: -0.5 },
  rolePill: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full, marginTop: 2 },
  rolePillText: { color: 'rgba(255,255,255,0.95)', fontSize: typography.size.xs, fontWeight: typography.weight.semibold },
  avatarWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  avatarText: { color: '#fff', fontSize: typography.size.lg, fontWeight: typography.weight.black },
  bellBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  academicBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.full, marginTop: spacing.base },
  academicText: { color: 'rgba(255,255,255,0.9)', fontSize: typography.size.xs, fontWeight: typography.weight.semibold },
  section: { paddingHorizontal: spacing.base, marginTop: spacing.xl },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actionsRow: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: {
    flex: 1, borderRadius: radius.xl, padding: spacing.md,
    alignItems: 'center', gap: 6,
  },
  actionIconWrap: { width: 48, height: 48, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: typography.size.xs, fontWeight: typography.weight.semibold, textAlign: 'center' },
  scheduleCard: { borderRadius: radius.xl },
  scheduleEmptyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  scheduleIcon: { width: 48, height: 48, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  scheduleTitle: { fontSize: typography.size.base, fontWeight: typography.weight.semibold, marginBottom: 2 },
  scheduleSubtitle: { fontSize: typography.size.sm },
  annCard: { marginBottom: spacing.sm },
  annRow: { flexDirection: 'row', gap: spacing.md },
  annIcon: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  annTitle: { fontSize: typography.size.base, fontWeight: typography.weight.bold },
  annBody: { fontSize: typography.size.sm, marginTop: 2, lineHeight: 16 },
  annDate: { fontSize: typography.size.xs, marginTop: 4 },
});
