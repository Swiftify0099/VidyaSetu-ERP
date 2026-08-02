/**
 * EduShakti One ERP — Parent Dashboard Screen (Premium Redesign)
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Platform,
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
import PremiumButton from '../../components/ui/PremiumButton';
import { spacing, radius, typography, shadows } from '../../theme';

const CUR_YEAR = '2025-2026';

export default function ParentDashboardScreen({ navigation }: { navigation: any }) {
  const { user } = useAuthStore();
  const { colors, roleAccent } = useTheme();
  const [stats, setStats] = useState<Record<string, any>>({});
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

  const firstName = user?.full_name?.split(' ')[0] ?? 'Parent';
  const feesPending = stats.fee_pending ?? 0;
  const attendance  = stats.child_attendance ?? 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={roleAccent.primary} colors={[roleAccent.primary]} />}
      >
        {/* ── Hero ───────────────────────────────────────────── */}
        <LinearGradient
          colors={roleAccent.gradient}
          style={[styles.hero, { paddingTop: Platform.OS === 'ios' ? 56 : 40 }]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          <View style={[styles.heroCircle, { backgroundColor: 'rgba(255,255,255,0.07)' }]} />
          <View style={styles.heroContent}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.greetingText}>Welcome back</Text>
              <Text style={styles.heroName}>{firstName}</Text>
              <View style={[styles.rolePill, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
                <Icon name="users" size={10} color="rgba(255,255,255,0.9)" solid />
                <Text style={styles.rolePillText}>Parent / Guardian</Text>
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
                onPress={() => navigation.navigate('Notices')}
              >
                <Icon name="bell" size={16} color="#fff" solid />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        {/* ── Fee Alert ──────────────────────────────────────── */}
        {feesPending > 0 && (
          <View style={styles.section}>
            <PremiumCard variant="default" style={[styles.feeAlert, { borderLeftWidth: 4, borderLeftColor: colors.danger }]}>
              <View style={styles.feeAlertRow}>
                <View style={[styles.feeIcon, { backgroundColor: colors.dangerBg }]}>
                  <Icon name="exclamation-triangle" size={18} color={colors.danger} solid />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.feeTitle, { color: colors.text }]}>Fee Due</Text>
                  <Text style={[styles.feeAmount, { color: colors.danger }]}>₹{feesPending.toLocaleString('en-IN')} pending</Text>
                  <Text style={[styles.feeSub, { color: colors.textSecondary }]}>Please clear dues to avoid late charges</Text>
                </View>
                <PremiumButton
                  label="Pay"
                  onPress={() => navigation.navigate('Fees')}
                  variant="danger"
                  size="sm"
                />
              </View>
            </PremiumCard>
          </View>
        )}

        {/* ── Stats ─────────────────────────────────────────── */}
        <View style={styles.section}>
          <SectionHeader title="Child's Overview" icon="child" />
          {loading ? (
            <View style={styles.statsGrid}><SkeletonLoader variant="stat" count={4} /></View>
          ) : (
            <View style={styles.statsGrid}>
              <StatCard
                label="Attendance"
                value={attendance > 0 ? `${attendance}%` : '—'}
                icon="clipboard-check"
                color={attendance >= 75 ? colors.success : colors.danger}
                trend={attendance >= 75 ? 'up' : 'down'}
                trendValue={attendance >= 75 ? 'Good' : 'Low'}
              />
              <StatCard
                label="Fee Pending"
                value={feesPending > 0 ? `₹${(feesPending/1000).toFixed(1)}K` : '✓ Paid'}
                icon="rupee-sign"
                color={feesPending > 0 ? colors.danger : colors.success}
              />
              <StatCard
                label="Class Rank"
                value={stats.class_rank ? `#${stats.class_rank}` : '—'}
                icon="trophy"
                color={colors.warning}
              />
              <StatCard
                label="Avg Score"
                value={stats.average_score ? `${stats.average_score}%` : '—'}
                icon="star"
                color={colors.info}
              />
            </View>
          )}
        </View>

        {/* ── Quick Actions ─────────────────────────────────── */}
        <View style={styles.section}>
          <SectionHeader title="Quick Access" icon="bolt" />
          <View style={styles.actionsRow}>
            {[
              { icon: 'clipboard-check', label: 'Attendance', screen: 'Attendance', color: '#6366f1' },
              { icon: 'rupee-sign',      label: 'Fees',       screen: 'Fees',       color: '#f59e0b' },
              { icon: 'bullhorn',        label: 'Notices',    screen: 'Notices',    color: '#10b981' },
              { icon: 'chart-bar',       label: 'Results',    screen: 'Profile',    color: '#3b82f6' },
            ].map((item, i) => (
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

        {/* ── Recent Notices ────────────────────────────────── */}
        {announcements.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="School Notices" icon="bullhorn" onViewAll={() => navigation.navigate('Notices')} />
            {announcements.slice(0, 3).map((ann: any, i) => (
              <PremiumCard key={ann.id ?? i} variant="bordered" style={styles.annCard} padding={12}>
                <View style={styles.annRow}>
                  <View style={[styles.annIcon, { backgroundColor: colors.primaryBg }]}>
                    <Icon name="bullhorn" size={13} color={roleAccent.primary} solid />
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

        {/* ── Contact Teacher ───────────────────────────────── */}
        <View style={styles.section}>
          <PremiumCard variant="flat">
            <View style={styles.contactRow}>
              <View style={[styles.contactIcon, { backgroundColor: colors.successBg }]}>
                <Icon name="phone" size={18} color={colors.success} solid />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.contactTitle, { color: colors.text }]}>Contact Class Teacher</Text>
                <Text style={[styles.contactSub, { color: colors.textSecondary }]}>Reach out with any concerns</Text>
              </View>
              <Icon name="chevron-right" size={14} color={colors.textTertiary} solid />
            </View>
          </PremiumCard>
        </View>

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
  section: { paddingHorizontal: spacing.base, marginTop: spacing.xl },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  feeAlert: { borderRadius: radius.xl },
  feeAlertRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  feeIcon: { width: 44, height: 44, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  feeTitle: { fontSize: typography.size.base, fontWeight: typography.weight.bold },
  feeAmount: { fontSize: typography.size.lg, fontWeight: typography.weight.extrabold },
  feeSub: { fontSize: typography.size.xs, marginTop: 2 },
  actionsRow: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: { flex: 1, borderRadius: radius.xl, padding: spacing.md, alignItems: 'center', gap: 6 },
  actionIconWrap: { width: 44, height: 44, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: typography.size.xs, fontWeight: typography.weight.semibold, textAlign: 'center' },
  annCard: { marginBottom: spacing.sm },
  annRow: { flexDirection: 'row', gap: spacing.sm },
  annIcon: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  annTitle: { fontSize: typography.size.base, fontWeight: typography.weight.bold },
  annBody: { fontSize: typography.size.sm, marginTop: 2 },
  annDate: { fontSize: typography.size.xs, marginTop: 4 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  contactIcon: { width: 44, height: 44, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  contactTitle: { fontSize: typography.size.base, fontWeight: typography.weight.bold, marginBottom: 2 },
  contactSub: { fontSize: typography.size.sm },
});
