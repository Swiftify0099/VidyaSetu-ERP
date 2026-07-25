/**
 * VidyaSetu Mobile — Teacher Dashboard Screen
 * =============================================
 * For: Teacher, Class Teacher
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, ActivityIndicator, Dimensions,
} from 'react-native';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

const { width } = Dimensions.get('window');

interface TeacherStats {
  my_classes: number;
  students_assigned: number;
  pending_marks: number;
  attendance_done_today: boolean;
  pending_leave: number;
  upcoming_periods: number;
}

export default function TeacherDashboardScreen() {
  const [stats, setStats] = useState<TeacherStats | null>(null);
  const [timetable, setTimetable] = useState<{ time: string; subject: string; standard: string; division: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuthStore();
  const today = new Date().toISOString().split('T')[0];

  const loadData = useCallback(async () => {
    try {
      const [statsRes, ttRes] = await Promise.allSettled([
        api.get('/analytics/teacher-dashboard'),
        api.get('/timetable', { params: { date: today } }),
      ]);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data?.data);
      if (ttRes.status === 'fulfilled')    setTimetable(ttRes.value.data?.data?.items?.slice(0, 5) ?? []);
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  }, [today]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  if (loading) return <View style={s.center}><ActivityIndicator color="#4f46e5" size="large" /></View>;

  return (
    <ScrollView
      style={s.page}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4f46e5" />}
    >
      {/* Header */}
      <View style={s.header}>
        <Text style={s.role}>Teacher</Text>
        <Text style={s.name}>👋 {user?.full_name?.split(' ').slice(0, 2).join(' ')}</Text>
        <Text style={s.dateText}>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
        {/* Attendance done badge */}
        <View style={[s.attendanceBadge, { backgroundColor: stats?.attendance_done_today ? '#d1fae5' : '#fee2e2' }]}>
          <Text style={[s.attendanceBadgeText, { color: stats?.attendance_done_today ? '#059669' : '#dc2626' }]}>
            {stats?.attendance_done_today ? '✅ Attendance Marked' : '⚠️ Attendance Pending'}
          </Text>
        </View>
      </View>

      {/* Stats Row */}
      <View style={s.statsRow}>
        {[
          { icon: '🏫', label: 'My Classes', value: stats?.my_classes ?? '—', color: '#4f46e5' },
          { icon: '🎓', label: 'Students',   value: stats?.students_assigned ?? '—', color: '#059669' },
          { icon: '📝', label: 'Pending Marks', value: stats?.pending_marks ?? '—', color: '#dc2626' },
          { icon: '🏖️', label: 'Pending Leave', value: stats?.pending_leave ?? '—', color: '#d97706' },
        ].map((item, i) => (
          <View key={i} style={[s.statCard, { borderTopColor: item.color }]}>
            <Text style={s.statIcon}>{item.icon}</Text>
            <Text style={[s.statValue, { color: item.color }]}>{item.value}</Text>
            <Text style={s.statLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* Quick Actions */}
      <Text style={s.sectionTitle}>Quick Actions</Text>
      <View style={s.actionsRow}>
        {[
          { icon: '📅', label: 'Mark\nAttendance', color: '#4f46e5' },
          { icon: '📝', label: 'Enter\nMarks',     color: '#059669' },
          { icon: '📖', label: 'Lesson\nPlan',     color: '#d97706' },
          { icon: '🏖️', label: 'Apply\nLeave',     color: '#7c3aed' },
        ].map((a, i) => (
          <TouchableOpacity key={i} style={[s.actionBtn, { backgroundColor: a.color + '15', borderColor: a.color + '40' }]}>
            <Text style={s.actionIcon}>{a.icon}</Text>
            <Text style={[s.actionLabel, { color: a.color }]}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Today's Timetable */}
      <Text style={s.sectionTitle}>📅 Today's Schedule</Text>
      <View style={s.card}>
        {timetable.length === 0 ? (
          <Text style={s.emptyMsg}>No periods scheduled today</Text>
        ) : timetable.map((p, i) => (
          <View key={i} style={s.periodRow}>
            <Text style={s.periodTime}>{p.time}</Text>
            <View style={s.periodInfo}>
              <Text style={s.periodSubject}>{p.subject}</Text>
              <Text style={s.periodClass}>Std {p.standard}-{p.division}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { backgroundColor: '#2563eb', padding: 20, paddingBottom: 24 },
  role: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  name: { color: '#fff', fontSize: 22, fontWeight: '900', marginTop: 4 },
  dateText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 4 },
  attendanceBadge: { marginTop: 10, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, alignSelf: 'flex-start' },
  attendanceBadgeText: { fontSize: 12, fontWeight: '700' },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', padding: 10, gap: 8 },
  statCard: { width: (width - 36) / 2, backgroundColor: '#fff', borderRadius: 14, padding: 14, borderTopWidth: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  statIcon: { fontSize: 22 },
  statValue: { fontSize: 22, fontWeight: '900', marginTop: 6 },
  statLabel: { fontSize: 11, color: '#6b7280', fontWeight: '600', marginTop: 3 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#1e293b', marginHorizontal: 14, marginTop: 6, marginBottom: 10 },
  actionsRow: { flexDirection: 'row', paddingHorizontal: 10, gap: 8 },
  actionBtn: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center', gap: 6, borderWidth: 1 },
  actionIcon: { fontSize: 26 },
  actionLabel: { fontSize: 10, fontWeight: '700', textAlign: 'center' },
  card: { margin: 14, backgroundColor: '#fff', borderRadius: 14, padding: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  periodRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  periodTime: { width: 70, fontSize: 11, color: '#6b7280', fontWeight: '700' },
  periodInfo: { flex: 1 },
  periodSubject: { fontSize: 13, fontWeight: '700', color: '#1e293b' },
  periodClass: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  emptyMsg: { color: '#6b7280', fontSize: 13, textAlign: 'center', paddingVertical: 20 },
});
