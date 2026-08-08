/**
 * VidyaSetu Mobile — Dashboard Screen
 * Shows key stats: students, attendance, fees, announcements.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useAuthStore } from '../../store/authStore';
import { dashboardAPI, communicationAPI } from '../../services/api';

const COLORS = {
  primary: '#4f46e5', primaryDark: '#4338ca',
  success: '#10b981', warning: '#f59e0b', danger: '#ef4444',
  surface: '#fff', bg: '#f0f0ff', border: '#e5e7eb',
  text: '#111827', textSecondary: '#6b7280',
};

interface StatCard {
  icon: string; label: string; value: string | number;
  sub?: string; color: string;
}

const CUR_YEAR = '2025-2026';

export default function DashboardScreen({ navigation }: { navigation: any }) {
  const { user, logout } = useAuthStore();
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
    } catch {/* ignore */}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const attVal = stats.today_attendance ?? stats.today_attendance_pct;
  const feesVal = stats.fees_collected ?? stats.fee_collected;
  const duesVal = stats.pending_dues ?? stats.fee_pending;

  const statCards: StatCard[] = [
    { icon: '🎓', label: 'Total Students', value: stats.total_students ?? '—', color: COLORS.primary },
    { icon: '✅', label: "Today's Attendance", value: attVal !== undefined ? `${attVal}%` : '—', color: COLORS.success },
    { icon: '💰', label: 'Fees Collected', value: feesVal ? `₹${(feesVal / 1000).toFixed(0)}K` : '—', color: COLORS.warning },
    { icon: '⚠️', label: 'Pending Dues', value: duesVal !== undefined ? `₹${(duesVal / 1000).toFixed(0)}K` : '—', color: COLORS.danger },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
    >
      {/* Header */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>
              {new Date().getHours() < 12 ? '🌅 Good Morning' : new Date().getHours() < 17 ? '☀️ Good Afternoon' : '🌙 Good Evening'}
            </Text>
            <Text style={styles.userName}>{user?.full_name?.split(' ')[0]}</Text>
            <Text style={styles.userRole}>{user?.roles?.[0]?.name ?? 'User'}</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.notifBtn}
              onPress={() => navigation.navigate('Announcements')}
            >
              <Text style={styles.notifIcon}>🔔</Text>
              {announcements.length > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{announcements.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Academic Year */}
        <View style={styles.academicBadge}>
          <Text style={styles.academicText}>📅 {CUR_YEAR}</Text>
        </View>
      </LinearGradient>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        {statCards.map((card, i) => (
          <View key={i} style={[styles.statCard, { borderTopColor: card.color }]}>
            <Text style={styles.statIcon}>{card.icon}</Text>
            <Text style={[styles.statValue, { color: card.color }]}>{card.value}</Text>
            <Text style={styles.statLabel}>{card.label}</Text>
          </View>
        ))}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {[
            { icon: '📅', label: 'Attendance', screen: 'Attendance' },
            { icon: '🎓', label: 'Students', screen: 'Students' },
            { icon: '💰', label: 'Fees', screen: 'Fees' },
            { icon: '📖', label: 'Lesson Plans', screen: 'LessonPlans' },
            { icon: '🏖️', label: 'Leave', screen: 'Leave' },
            { icon: '📢', label: 'Notices', screen: 'Announcements' },
          ].map((item, i) => (
            <TouchableOpacity
              key={i}
              style={styles.actionCard}
              onPress={() => navigation.navigate(item.screen)}
              activeOpacity={0.8}
            >
              <Text style={styles.actionIcon}>{item.icon}</Text>
              <Text style={styles.actionLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Recent Announcements */}
      {announcements.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Announcements</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Announcements')}>
              <Text style={styles.viewAll}>View All →</Text>
            </TouchableOpacity>
          </View>
          {announcements.slice(0, 3).map((ann: any) => (
            <View key={ann.id} style={styles.announcementCard}>
              <View style={styles.annIconWrap}>
                <Text style={styles.annIcon}>📢</Text>
              </View>
              <View style={styles.annContent}>
                <Text style={styles.annTitle} numberOfLines={1}>{ann.title}</Text>
                <Text style={styles.annBody} numberOfLines={2}>{ann.content}</Text>
                <Text style={styles.annDate}>{new Date(ann.created_at).toLocaleDateString('en-IN')}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: COLORS.textSecondary, fontSize: 14 },

  /* Header */
  header: {
    paddingTop: Platform.OS === 'ios' ? 54 : 24,
    paddingBottom: 28,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greeting: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '500' },
  userName: { color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 2 },
  userRole: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  headerRight: { alignItems: 'flex-end', gap: 8 },
  notifBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  notifIcon: { fontSize: 18 },
  badge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: COLORS.danger,
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  academicBadge: {
    marginTop: 12, alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 20,
  },
  academicText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  /* Stats Grid */
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 12, paddingTop: 16, gap: 8,
  },
  statCard: {
    width: '47%', backgroundColor: COLORS.surface,
    borderRadius: 14, padding: 16,
    borderTopWidth: 3, borderTopColor: COLORS.primary,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  statIcon: { fontSize: 24, marginBottom: 6 },
  statValue: { fontSize: 22, fontWeight: '800', color: COLORS.primary },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2, fontWeight: '500' },

  /* Sections */
  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  viewAll: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },

  /* Quick Actions */
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionCard: {
    width: '30%', backgroundColor: COLORS.surface,
    borderRadius: 14, padding: 14,
    alignItems: 'center', gap: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  actionIcon: { fontSize: 26 },
  actionLabel: { fontSize: 11, fontWeight: '600', color: COLORS.text, textAlign: 'center' },

  /* Announcements */
  announcementCard: {
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 12,
    flexDirection: 'row', gap: 10, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  annIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#ede9fe',
    alignItems: 'center', justifyContent: 'center',
  },
  annIcon: { fontSize: 18 },
  annContent: { flex: 1 },
  annTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  annBody: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2, lineHeight: 16 },
  annDate: { fontSize: 10, color: COLORS.textSecondary, marginTop: 4 },
});
