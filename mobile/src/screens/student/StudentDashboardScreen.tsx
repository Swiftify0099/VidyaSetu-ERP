/**
 * VidyaSetu Mobile — Student Dashboard Screen
 * =============================================
 * STRICTLY for Student role only
 * Cannot see any admin/teacher/finance content
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, ActivityIndicator, Dimensions,
} from 'react-native';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

const { width } = Dimensions.get('window');

interface StudentPortalData {
  student: { full_name: string; gr_number: string; standard: string; division: string; roll_number: number };
  attendance_this_month: number;
  attendance_percentage: number;
  pending_fees: number;
  next_exam?: string;
  books_issued: number;
  notices: { id: number; title: string; created_at: string }[];
}

const QUICK_LINKS = [
  { icon: '📅', label: 'My Attendance', color: '#059669' },
  { icon: '📝', label: 'My Results',    color: '#4f46e5' },
  { icon: '🕐', label: 'Timetable',     color: '#d97706' },
  { icon: '💰', label: 'Fee Status',    color: '#dc2626' },
  { icon: '📚', label: 'Library',       color: '#0891b2' },
  { icon: '📢', label: 'Notices',       color: '#7c3aed' },
];

export default function StudentDashboardScreen() {
  const [data, setData] = useState<StudentPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuthStore();

  const load = useCallback(async () => {
    try {
      const res = await api.get('/student-portal/dashboard');
      setData(res.data?.data);
    } catch { /* offline */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <View style={s.center}><ActivityIndicator color="#059669" size="large" /></View>;

  return (
    <ScrollView
      style={s.page}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#059669" />}
    >
      {/* Header Banner */}
      <View style={s.header}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{user?.full_name?.charAt(0) ?? 'S'}</Text>
        </View>
        <View style={s.headerInfo}>
          <Text style={s.studentName}>{data?.student?.full_name ?? user?.full_name}</Text>
          <Text style={s.studentMeta}>
            GR: {data?.student?.gr_number ?? '—'}  |  Std {data?.student?.standard ?? '—'}-{data?.student?.division ?? '—'}
          </Text>
          <Text style={s.rollText}>Roll No: {data?.student?.roll_number ?? '—'}</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={s.statsRow}>
        {[
          { icon: '📅', label: 'Days Present\nThis Month', value: data?.attendance_this_month ?? '—', color: '#059669' },
          { icon: '📊', label: 'Attendance\n%',            value: data ? `${data.attendance_percentage}%` : '—', color: '#2563eb' },
          { icon: '💰', label: 'Pending\nFees ₹',         value: data ? `₹${data.pending_fees.toLocaleString('en-IN')}` : '—', color: '#dc2626' },
          { icon: '📚', label: 'Books\nIssued',            value: data?.books_issued ?? '—', color: '#d97706' },
        ].map((item, i) => (
          <View key={i} style={[s.statCard, { borderTopColor: item.color }]}>
            <Text style={s.statIcon}>{item.icon}</Text>
            <Text style={[s.statValue, { color: item.color }]}>{item.value}</Text>
            <Text style={s.statLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* Quick Links */}
      <Text style={s.sectionTitle}>📌 Quick Access</Text>
      <View style={s.linksGrid}>
        {QUICK_LINKS.map((l, i) => (
          <TouchableOpacity key={i} style={[s.linkCard, { backgroundColor: l.color + '15' }]}>
            <Text style={s.linkIcon}>{l.icon}</Text>
            <Text style={[s.linkLabel, { color: l.color }]}>{l.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Recent Notices */}
      {(data?.notices?.length ?? 0) > 0 && (
        <>
          <Text style={s.sectionTitle}>📢 Recent Notices</Text>
          <View style={s.noticesBox}>
            {data!.notices.slice(0, 3).map(n => (
              <TouchableOpacity key={n.id} style={s.noticeItem}>
                <Text style={s.noticeTitle}>{n.title}</Text>
                <Text style={s.noticeDate}>{new Date(n.created_at).toLocaleDateString('en-IN')}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {/* Next Exam Alert */}
      {data?.next_exam && (
        <View style={s.examAlert}>
          <Text style={s.examAlertIcon}>📝</Text>
          <View>
            <Text style={s.examAlertTitle}>Upcoming Exam</Text>
            <Text style={s.examAlertSub}>{data.next_exam}</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { backgroundColor: '#059669', flexDirection: 'row', alignItems: 'center', padding: 20, gap: 16 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 26, color: '#fff', fontWeight: '900' },
  headerInfo: { flex: 1 },
  studentName: { fontSize: 18, fontWeight: '900', color: '#fff' },
  studentMeta: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 3 },
  rollText: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', padding: 10, gap: 8 },
  statCard: { width: (width - 36) / 2, backgroundColor: '#fff', borderRadius: 14, padding: 14, borderTopWidth: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  statIcon: { fontSize: 20 },
  statValue: { fontSize: 20, fontWeight: '900', marginTop: 6 },
  statLabel: { fontSize: 10, color: '#6b7280', fontWeight: '600', marginTop: 3 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#1e293b', marginHorizontal: 14, marginTop: 4, marginBottom: 10 },
  linksGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10, gap: 8 },
  linkCard: { width: (width - 36) / 3, borderRadius: 14, padding: 14, alignItems: 'center', gap: 6 },
  linkIcon: { fontSize: 26 },
  linkLabel: { fontSize: 10, fontWeight: '700', textAlign: 'center' },
  noticesBox: { marginHorizontal: 14, backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  noticeItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  noticeTitle: { fontSize: 13, fontWeight: '700', color: '#1e293b' },
  noticeDate: { fontSize: 11, color: '#6b7280', marginTop: 3 },
  examAlert: { margin: 14, backgroundColor: '#fef3c7', borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderColor: '#fcd34d' },
  examAlertIcon: { fontSize: 28 },
  examAlertTitle: { fontSize: 13, fontWeight: '800', color: '#92400e' },
  examAlertSub: { fontSize: 12, color: '#78350f', marginTop: 2 },
});
