/**
 * VidyaSetu Mobile — Office Dashboard Screen (Premium Redesign)
 * =============================================================
 * Institutional operations hub: admissions, student registry, fees,
 * attendance, notices, inventory, and QR verification.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from '../../theme/ThemeContext';
import { api, communicationAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { spacing, radius, typography, shadows } from '../../theme';
import {
  AppCard,
  AppStatCard,
  AppSectionHeader,
  AppSkeleton,
  AppAvatar,
} from '../../components/ui';

const QUICK_ACTIONS = [
  { icon: 'user-plus',       label: 'New Admission',  screen: 'Admission',    color: '#4f46e5' },
  { icon: 'user-graduate',   label: 'Students',       screen: 'Students',     color: '#059669' },
  { icon: 'rupee-sign',      label: 'Fee Collection', screen: 'Fees',         color: '#d97706' },
  { icon: 'clipboard-check', label: 'Attendance',     screen: 'Attendance',   color: '#7c3aed' },
  { icon: 'bullhorn',        label: 'Announcements',  screen: 'Announcements',color: '#0891b2' },
  { icon: 'chart-pie',       label: 'Reports',        screen: 'Reports',      color: '#dc2626' },
];

export default function OfficeDashboardScreen({ navigation }: { navigation: any }) {
  const { colors, roleAccent } = useTheme();
  const { user } = useAuthStore();
  const [totalStudents, setTotalStudents] = useState(0);
  const [newAdmissions, setNewAdmissions] = useState(0);
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [studRes, admRes, noticeRes] = await Promise.allSettled([
        api.get('/students', { params: { per_page: 1, academic_year: '2025-2026' } }),
        api.get('/admission/applications', { params: { status: 'approved', per_page: 1 } }),
        communicationAPI.getAnnouncements({ limit: 4 }),
      ]);
      if (studRes.status  === 'fulfilled') setTotalStudents(studRes.value.data?.data?.total ?? 0);
      if (admRes.status   === 'fulfilled') setNewAdmissions(admRes.value.data?.data?.total ?? 0);
      if (noticeRes.status === 'fulfilled') {
        const n = noticeRes.value.data?.data;
        setNotices(Array.isArray(n?.items) ? n.items : Array.isArray(n) ? n : []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const firstName = user?.full_name?.split(' ')[0] ?? 'Staff';
  const roleName = user?.roles?.[0]?.name ?? 'Office Administration';

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={roleAccent.primary}
            colors={[roleAccent.primary]}
          />
        }
      >
        {/* Hero Header */}
        <LinearGradient
          colors={roleAccent.gradient}
          style={[styles.hero, { paddingTop: Platform.OS === 'ios' ? 56 : 40 }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.heroTop}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.greetingText}>Good Day,</Text>
              <Text style={styles.heroName}>{firstName}</Text>
              <View style={[styles.rolePill, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
                <Icon name="building" size={10} color="rgba(255,255,255,0.9)" solid />
                <Text style={styles.rolePillText}>{roleName}</Text>
              </View>
            </View>
            <View style={{ gap: 8, alignItems: 'flex-end' }}>
              <AppAvatar
                name={user?.full_name}
                size="md"
                roleColor="#ffffff"
              />
            </View>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          {/* Operations Overview */}
          <AppSectionHeader title="Operations Overview" icon="chart-bar" />
          {loading ? (
            <AppSkeleton variant="stat" count={2} />
          ) : (
            <View style={styles.statsGrid}>
              <AppStatCard
                label="Enrolled Students"
                value={totalStudents || '—'}
                icon="user-graduate"
                color={colors.primary}
                style={{ flex: 1 }}
              />
              <AppStatCard
                label="New Admissions"
                value={newAdmissions || '0'}
                icon="user-plus"
                color={colors.success}
                style={{ flex: 1 }}
              />
            </View>
          )}

          {/* Quick Actions */}
          <AppSectionHeader title="Operations Shortcuts" icon="bolt" style={{ marginTop: spacing.sm }} />
          <View style={styles.actionsGrid}>
            {QUICK_ACTIONS.map((a, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.actionCard,
                  { backgroundColor: colors.surface, ...shadows.sm, borderColor: colors.border },
                ]}
                activeOpacity={0.8}
                onPress={() => a.screen && navigation?.navigate(a.screen)}
              >
                <View style={[styles.actionIconWrap, { backgroundColor: `${a.color}15` }]}>
                  <Icon name={a.icon} size={20} color={a.color} solid />
                </View>
                <Text style={[styles.actionLabel, { color: colors.text }]}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Recent Circulars */}
          <AppSectionHeader
            title="School Circulars"
            icon="bullhorn"
            onViewAll={() => navigation.navigate('Announcements')}
            style={{ marginTop: spacing.sm }}
          />
          {notices.map((n, idx) => (
            <TouchableOpacity
              key={idx}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Announcements')}
            >
              <AppCard variant="bordered" padding={12} style={{ marginBottom: spacing.xs }}>
                <Text style={[styles.noticeTitle, { color: colors.text }]}>{n.title}</Text>
                <Text style={[styles.noticeBody, { color: colors.textSecondary }]} numberOfLines={2}>
                  {n.content}
                </Text>
              </AppCard>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  hero: {
    padding: spacing.xl,
    borderBottomLeftRadius: radius['2xl'],
    borderBottomRightRadius: radius['2xl'],
    ...shadows.md,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greetingText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: typography.size.xs,
  },
  heroName: {
    color: '#ffffff',
    fontSize: typography.size.xl,
    fontWeight: typography.weight.extrabold,
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  rolePillText: {
    color: '#ffffff',
    fontSize: typography.size['2xs'],
    fontWeight: typography.weight.bold,
  },
  content: {
    padding: spacing.base,
    gap: spacing.md,
    paddingBottom: spacing['3xl'],
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  actionCard: {
    width: '48%',
    padding: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
  },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
  },
  noticeTitle: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
  },
  noticeBody: {
    fontSize: typography.size.xs,
    lineHeight: 18,
    marginTop: 2,
  },
});
