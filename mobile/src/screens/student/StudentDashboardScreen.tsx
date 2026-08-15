/**
 * EduShakti One ERP — Student Dashboard Screen (Premium Redesign)
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
import { studentPortalAPI, communicationAPI } from '../../services/api';
import StatCard from '../../components/ui/StatCard';
import SectionHeader from '../../components/ui/SectionHeader';
import PremiumCard from '../../components/ui/PremiumCard';
import Badge from '../../components/ui/Badge';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import { spacing, radius, typography, shadows } from '../../theme';

const { width } = Dimensions.get('window');

export default function StudentDashboardScreen({ navigation }: { navigation: any }) {
  const { user } = useAuthStore();
  const { colors, roleAccent } = useTheme();
  const [profile, setProfile] = useState<Record<string, any>>({});
  const [stats, setStats] = useState<Record<string, any>>({});
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [profRes, annRes] = await Promise.allSettled([
        studentPortalAPI.getProfile(),
        communicationAPI.getAnnouncements({ limit: 3 }),
      ]);
      if (profRes.status === 'fulfilled') {
        const pData = profRes.value.data?.data ?? {};
        setProfile(pData);
        setStats(pData.stats ?? {});
      }
      if (annRes.status === 'fulfilled') {
        setAnnouncements(annRes.value.data?.data?.items ?? []);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const firstName = user?.full_name?.split(' ')[0] ?? 'Student';
  const attendance = stats.attendance_percentage ?? 0;
  const attendanceColor = attendance >= 75 ? colors.success : attendance >= 60 ? colors.warning : colors.danger;

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
          <View style={styles.heroTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greetingText}>Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}</Text>
              <Text style={styles.heroName}>{firstName}</Text>
              <View style={[styles.rolePill, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
                <Icon name="user-graduate" size={10} color="rgba(255,255,255,0.9)" solid />
                <Text style={styles.rolePillText}>Student</Text>
              </View>
            </View>
            <View style={{ gap: 8, alignItems: 'flex-end' }}>
              <TouchableOpacity style={[styles.avatarWrap, { backgroundColor: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.4)' }]} onPress={() => navigation.navigate('Profile')}>
                <Text style={styles.avatarText}>{firstName[0]}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Attendance Ring Card */}
          <View style={[styles.attendanceCard, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
            <View style={styles.attendanceLeft}>
              <Text style={styles.attendanceLabel}>Attendance</Text>
              <Text style={styles.attendanceValue}>{attendance > 0 ? `${attendance}%` : '—'}</Text>
              <Text style={styles.attendanceSub}>{attendance >= 75 ? 'Eligible' : 'Below minimum'}</Text>
            </View>
            <View style={styles.attendanceRight}>
              {/* Simple ring indicator */}
              <View style={[styles.ring, { borderColor: 'rgba(255,255,255,0.3)' }]}>
                <View style={[styles.ringFill, { backgroundColor: attendance >= 75 ? '#fff' : 'rgba(255,255,255,0.5)' }]} />
                <Text style={styles.ringText}>{attendance > 0 ? `${Math.round(attendance)}` : '—'}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* ── Stats ─────────────────────────────────────────── */}
        <View style={styles.section}>
          <SectionHeader title="My Academics & Status" icon="graduation-cap" />
          {loading ? (
            <View style={styles.statsGrid}><SkeletonLoader variant="stat" count={4} /></View>
          ) : (
            <View style={styles.statsGrid}>
              <StatCard label="Attendance" value={attendance > 0 ? `${attendance}%` : '0%'} icon="clipboard-check" color={attendanceColor} />
              <StatCard label="Pending Fees" value={stats.pending_fees != null ? `₹${stats.pending_fees}` : '₹0'} icon="rupee-sign" color={colors.warning} />
              <StatCard label="Library Books" value={stats.issued_books != null ? `${stats.issued_books}` : '0'} icon="book" color={colors.info} />
              <StatCard label="Upcoming Exams" value={stats.upcoming_exams != null ? `${stats.upcoming_exams}` : '0'} icon="calendar-alt" color={colors.primary} />
            </View>
          )}
        </View>

        {/* ── Quick Links ───────────────────────────────────── */}
        <View style={styles.section}>
          <SectionHeader title="Quick Access" icon="bolt" />
          <View style={styles.quickLinks}>
            {[
              { icon: 'calendar-alt', label: 'Timetable',  screen: 'Timetable',  color: '#6366f1' },
              { icon: 'chart-bar',    label: 'My Results', screen: 'Results',    color: '#10b981' },
              { icon: 'clipboard-check', label: 'Attendance', screen: 'Attendance', color: '#3b82f6' },
              { icon: 'bell',         label: 'Notices',    screen: 'Notices',    color: '#f59e0b' },
            ].map((item, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.quickBtn, { backgroundColor: colors.surface, ...shadows.sm }]}
                onPress={() => navigation.navigate(item.screen)}
                activeOpacity={0.75}
              >
                <View style={[styles.quickIcon, { backgroundColor: `${item.color}18` }]}>
                  <Icon name={item.icon} size={20} color={item.color} solid />
                </View>
                <Text style={[styles.quickLabel, { color: colors.text }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Exam Countdown ────────────────────────────────── */}
        <View style={styles.section}>
          <PremiumCard variant="default" padding={spacing.base}>
            <View style={styles.examRow}>
              <View style={[styles.examIcon, { backgroundColor: colors.dangerBg }]}>
                <Icon name="exclamation-circle" size={20} color={colors.danger} solid />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.examTitle, { color: colors.text }]}>Exam Countdown</Text>
                <Text style={[styles.examSub, { color: colors.textSecondary }]}>
                  {stats.next_exam_days != null
                    ? `Next exam in ${stats.next_exam_days} days`
                    : 'No upcoming exams scheduled'}
                </Text>
              </View>
              <Badge
                label={stats.next_exam_days != null ? `${stats.next_exam_days}d` : 'N/A'}
                variant={stats.next_exam_days <= 7 ? 'danger' : stats.next_exam_days <= 30 ? 'warning' : 'success'}
                size="md"
                rounded
              />
            </View>
          </PremiumCard>
        </View>

        {/* ── Announcements ─────────────────────────────────── */}
        {announcements.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Latest Notices" icon="bullhorn" onViewAll={() => navigation.navigate('Notices')} />
            {announcements.slice(0, 3).map((ann: any, i) => (
              <PremiumCard key={ann.id ?? i} variant="flat" style={styles.annCard} padding={12}>
                <View style={styles.annRow}>
                  <View style={[styles.annIcon, { backgroundColor: colors.primaryBg }]}>
                    <Icon name="bullhorn" size={13} color={roleAccent.primary} solid />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.annTitle, { color: colors.text }]} numberOfLines={1}>{ann.title}</Text>
                    <Text style={[styles.annBody, { color: colors.textSecondary }]} numberOfLines={2}>{ann.content}</Text>
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
  heroCircle: { position: 'absolute', width: 220, height: 220, borderRadius: 110, top: -80, right: -60 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: spacing.sm },
  greetingText: { color: 'rgba(255,255,255,0.8)', fontSize: typography.size.sm, fontWeight: typography.weight.medium },
  heroName: { color: '#fff', fontSize: typography.size['3xl'], fontWeight: typography.weight.extrabold, letterSpacing: -0.5 },
  rolePill: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full, marginTop: 2 },
  rolePillText: { color: 'rgba(255,255,255,0.95)', fontSize: typography.size.xs, fontWeight: typography.weight.semibold },
  avatarWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  avatarText: { color: '#fff', fontSize: typography.size.lg, fontWeight: typography.weight.black },

  attendanceCard: {
    borderRadius: radius.xl,
    padding: spacing.base,
    marginTop: spacing.base,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attendanceLeft: { gap: 4 },
  attendanceLabel: { color: 'rgba(255,255,255,0.8)', fontSize: typography.size.sm, fontWeight: typography.weight.medium },
  attendanceValue: { color: '#fff', fontSize: typography.size['3xl'], fontWeight: typography.weight.extrabold },
  attendanceSub: { color: 'rgba(255,255,255,0.7)', fontSize: typography.size.xs },
  attendanceRight: {},
  ring: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 6,
    alignItems: 'center', justifyContent: 'center',
  },
  ringFill: { position: 'absolute', width: 20, height: 20, borderRadius: 10 },
  ringText: { color: '#fff', fontSize: typography.size.lg, fontWeight: typography.weight.extrabold },

  section: { paddingHorizontal: spacing.base, marginTop: spacing.xl },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  quickLinks: { flexDirection: 'row', gap: spacing.sm },
  quickBtn: { flex: 1, borderRadius: radius.xl, padding: spacing.md, alignItems: 'center', gap: 6 },
  quickIcon: { width: 44, height: 44, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: typography.size.xs, fontWeight: typography.weight.semibold, textAlign: 'center' },

  examRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  examIcon: { width: 44, height: 44, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  examTitle: { fontSize: typography.size.md, fontWeight: typography.weight.bold, marginBottom: 2 },
  examSub: { fontSize: typography.size.sm },

  annCard: { marginBottom: spacing.sm, borderRadius: radius.xl },
  annRow: { flexDirection: 'row', gap: spacing.sm },
  annIcon: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  annTitle: { fontSize: typography.size.base, fontWeight: typography.weight.bold },
  annBody: { fontSize: typography.size.sm, marginTop: 2 },
});
