/**
 * VidyaSetu Mobile — My Attendance Screen (Student)
 * ===================================================
 * Student can ONLY see their own attendance
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator,
} from 'react-native';
import { api } from '../../services/api';

interface AttendanceRecord {
  date: string;
  status: 'P' | 'A' | 'L' | 'H';
  remarks?: string;
}

const STATUS_CONFIG = {
  P: { label: 'Present', color: '#059669', bg: '#d1fae5', icon: '✅' },
  A: { label: 'Absent',  color: '#dc2626', bg: '#fee2e2', icon: '❌' },
  L: { label: 'Leave',   color: '#d97706', bg: '#fef3c7', icon: '🏖️' },
  H: { label: 'Holiday', color: '#6b7280', bg: '#f3f4f6', icon: '🎉' },
};

export default function MyAttendanceScreen() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState({ present: 0, absent: 0, leave: 0, total: 0, percentage: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const now = new Date();
    const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const to = now.toISOString().split('T')[0];
    try {
      const res = await api.get('/student-portal/attendance', { params: { from_date: from, to_date: to } });
      const data = res.data?.data;
      setRecords(data?.records ?? []);
      setSummary({
        present: data?.present ?? 0,
        absent: data?.absent ?? 0,
        leave: data?.leave ?? 0,
        total: data?.total ?? 0,
        percentage: data?.percentage ?? 0,
      });
    } catch { setRecords([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <View style={s.center}><ActivityIndicator color="#059669" size="large" /></View>;

  return (
    <ScrollView
      style={s.page}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#059669" />}
    >
      {/* Summary Banner */}
      <View style={s.banner}>
        <Text style={s.bannerTitle}>📅 This Month's Attendance</Text>
        {/* Circular percentage */}
        <View style={[s.circle, { borderColor: summary.percentage >= 75 ? '#059669' : '#dc2626' }]}>
          <Text style={[s.circleValue, { color: summary.percentage >= 75 ? '#059669' : '#dc2626' }]}>
            {summary.percentage}%
          </Text>
          <Text style={s.circleLabel}>Attendance</Text>
        </View>
        {/* Mini stats */}
        <View style={s.miniStats}>
          <View style={s.miniStat}><Text style={[s.miniVal, { color: '#059669' }]}>{summary.present}</Text><Text style={s.miniLabel}>Present</Text></View>
          <View style={s.miniStat}><Text style={[s.miniVal, { color: '#dc2626' }]}>{summary.absent}</Text><Text style={s.miniLabel}>Absent</Text></View>
          <View style={s.miniStat}><Text style={[s.miniVal, { color: '#d97706' }]}>{summary.leave}</Text><Text style={s.miniLabel}>Leave</Text></View>
          <View style={s.miniStat}><Text style={[s.miniVal, { color: '#6b7280' }]}>{summary.total}</Text><Text style={s.miniLabel}>Total</Text></View>
        </View>
        {summary.percentage < 75 && (
          <View style={s.warning}>
            <Text style={s.warningText}>⚠️ Low attendance! Minimum 75% required.</Text>
          </View>
        )}
      </View>

      {/* Daily Records */}
      <Text style={s.sectionTitle}>Daily Log</Text>
      {records.length === 0 ? (
        <View style={s.center}><Text style={s.emptyText}>No attendance records this month</Text></View>
      ) : records.map((r, i) => {
        const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.H;
        return (
          <View key={i} style={[s.row, { borderLeftColor: cfg.color }]}>
            <View style={[s.iconBox, { backgroundColor: cfg.bg }]}>
              <Text style={{ fontSize: 16 }}>{cfg.icon}</Text>
            </View>
            <View style={s.rowInfo}>
              <Text style={s.rowDate}>{new Date(r.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</Text>
              {r.remarks && <Text style={s.rowRemarks}>{r.remarks}</Text>}
            </View>
            <View style={[s.statusBadge, { backgroundColor: cfg.bg }]}>
              <Text style={[s.statusBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  banner: { backgroundColor: '#059669', padding: 20, alignItems: 'center' },
  bannerTitle: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '700', marginBottom: 16 },
  circle: { width: 110, height: 110, borderRadius: 55, borderWidth: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', marginBottom: 16 },
  circleValue: { fontSize: 28, fontWeight: '900' },
  circleLabel: { fontSize: 10, color: '#6b7280', fontWeight: '600' },
  miniStats: { flexDirection: 'row', gap: 20 },
  miniStat: { alignItems: 'center' },
  miniVal: { fontSize: 20, fontWeight: '900' },
  miniLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  warning: { marginTop: 12, backgroundColor: 'rgba(220,38,38,0.2)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  warningText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#1e293b', margin: 14 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 6, borderRadius: 10, padding: 12, borderLeftWidth: 4, gap: 10 },
  iconBox: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  rowInfo: { flex: 1 },
  rowDate: { fontSize: 13, fontWeight: '700', color: '#1e293b' },
  rowRemarks: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  emptyText: { color: '#6b7280', fontSize: 13 },
});
