/**
 * VidyaSetu Mobile — Generic / Fallback Dashboard Screen (Premium Redesign)
 * ==========================================================================
 * Executive overview metrics, role quick actions, and recent announcements.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
  Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from '../../theme/ThemeContext';
import { useAuthStore } from '../../store/authStore';
import { dashboardAPI, communicationAPI } from '../../services/api';
import { spacing, radius, typography, shadows } from '../../theme';
import {
  AppCard,
  AppBadge,
  AppAvatar,
  AppStatCard,
  AppSectionHeader,
  AppSkeleton,
} from '../../components/ui';

const CUR_YEAR = '2025-2026';

export default function DashboardScreen({ navigation }: { navigation: any }) {
  const { colors, roleAccent } = useTheme();
  const { user } = useAuthStore();
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
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const attVal = stats.today_attendance ?? stats.today_attendance_pct;
  const feesVal = stats.fees_collected ?? stats.fee_collected;
  const duesVal = stats.pending_dues ?? stats.fee_pending;

  const hours = new Date().getHours();
  const greeting = hours < 12 ? 'Good Morning' : hours < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      {/* Hero Header */}
      <LinearGradient
        colors={roleAccent.gradient}
        style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 56 : 40 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Image
              source={require('../../assets/icon.png')}
              style={styles.headerAppIcon}
            />
            <View>
              <Text style={styles.greeting}>{greeting},</Text>
              <Text style={styles.userName}>{user?.full_name?.split(' ')[0]}</Text>
              <View style={[styles.rolePill, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
                <Text style={styles.rolePillText}>{user?.roles?.[0]?.name ?? 'Portal Member'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity
              style={[styles.notifBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
              onPress={() => navigation.navigate('Announcements')}
              activeOpacity={0.8}
            >
              <Icon name="bell" size={16} color="#fff" solid />
              {announcements.length > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.danger }]}>
                  <Text style={styles.badgeText}>{announcements.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Academic Year */}
        <View style={[styles.academicBadge, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
          <Icon name="calendar-alt" size={11} color="#fff" solid />
          <Text style={styles.academicText}>Academic Year {CUR_YEAR}</Text>
        </View>
      </LinearGradient>

      {/* Metrics Grid */}
      <View style={styles.statsGrid}>
        {loading ? (
          <View style={{ width: '100%' }}>
            <AppSkeleton variant="stat" count={4} />
          </View>
        ) : (
          <>
            <AppStatCard
              icon="user-graduate"
              label="Total Students"
              value={stats.total_students ?? '—'}
              color={colors.primary}
              style={{ width: '48%' }}
            />
            <AppStatCard
              icon="clipboard-check"
              label="Attendance Rate"
              value={attVal !== undefined ? `${attVal}%` : '—'}
              color={colors.success}
              style={{ width: '48%' }}
            />
            <AppStatCard
              icon="rupee-sign"
              label="Fees Collected"
              value={feesVal ? `₹${(feesVal / 1000).toFixed(0)}K` : '—'}
              color={colors.warning}
              style={{ width: '48%' }}
            />
            <AppStatCard
              icon="exclamation-triangle"
              label="Pending Dues"
              value={duesVal !== undefined ? `₹${(duesVal / 1000).toFixed(0)}K` : '—'}
              color={colors.danger}
              style={{ width: '48%' }}
            />
          </>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <AppSectionHeader title="Quick Actions" icon="bolt" />
        <View style={styles.actionsGrid}>
          {[
            { icon: 'clipboard-check', label: 'Attendance',   screen: 'Attendance',    color: '#059669' },
            { icon: 'user-graduate',   label: 'Students',     screen: 'Students',      color: '#4f46e5' },
            { icon: 'rupee-sign',      label: 'Fees',         screen: 'Fees',          color: '#d97706' },
            { icon: 'bullhorn',        label: 'Announcements',screen: 'Announcements', color: '#7c3aed' },
          ].map((item, i) => (
            <TouchableOpacity
              key={i}
              style={[
                styles.actionBtn,
                { backgroundColor: colors.surface, ...shadows.sm, borderColor: colors.border },
              ]}
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

      {/* Announcements Carousel / List */}
      <View style={[styles.section, { paddingBottom: spacing['3xl'] }]}>
        <AppSectionHeader
          title="Recent Notices"
          icon="bullhorn"
          onViewAll={() => navigation.navigate('Announcements')}
        />
        {loading ? (
          <AppSkeleton variant="list" count={3} />
        ) : announcements.length === 0 ? (
          <AppCard variant="bordered" padding={16}>
            <Text style={{ textAlign: 'center', color: colors.textSecondary, fontSize: typography.size.xs }}>
              No recent school circulars at this time.
            </Text>
          </AppCard>
        ) : (
          announcements.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Announcements')}
              style={{ marginBottom: spacing.sm }}
            >
              <AppCard variant="bordered" padding={12}>
                <Text style={[styles.noticeTitle, { color: colors.text }]}>{item.title}</Text>
                <Text style={[styles.noticeBody, { color: colors.textSecondary }]} numberOfLines={2}>
                  {item.content}
                </Text>
              </AppCard>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: spacing.xl,
    borderBottomLeftRadius: radius['2xl'],
    borderBottomRightRadius: radius['2xl'],
    ...shadows.md,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerAppIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
  },
  greeting: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: typography.size.xs,
  },
  userName: {
    color: '#ffffff',
    fontSize: typography.size.xl,
    fontWeight: typography.weight.extrabold,
  },
  rolePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  rolePillText: {
    color: '#ffffff',
    fontSize: typography.size['2xs'],
    fontWeight: typography.weight.bold,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  academicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  academicText: {
    color: '#ffffff',
    fontSize: typography.size['2xs'],
    fontWeight: typography.weight.semibold,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    padding: spacing.base,
  },
  section: {
    paddingHorizontal: spacing.base,
    marginTop: spacing.md,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  actionBtn: {
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
