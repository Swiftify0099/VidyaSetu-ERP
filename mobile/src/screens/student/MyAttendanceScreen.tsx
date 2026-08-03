/**
 * VidyaSetu Mobile — My Attendance Screen (Student)
 * ===================================================
 * Complete student attendance tracking with calendar summary & daily logs.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator,
} from 'react-native';
import { studentPortalAPI } from '../../services/api';

interface AttendanceRecord {
  day: number;
  dateStr: string;
  status: string;
  remarks?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  present:       { label: 'Present',       color: '#059669', bg: '#d1fae5', icon: '✅' },
  P:             { label: 'Present',       color: '#059669', bg: '#d1fae5', icon: '✅' },
  absent:        { label: 'Absent',        color: '#dc2626', bg: '#fee2e2', icon: '❌' },
  A:             { label: 'Absent',        color: '#dc2626', bg: '#fee2e2', icon: '❌' },
  late:          { label: 'Late',          color: '#d97706', bg: '#fef3c7', icon: '⏰' },
  leave:         { label: 'Leave',         color: '#6366f1', bg: '#e0e7ff', icon: '🏖️' },
  medical_leave: { label: 'Medical Leave', color: '#0891b2', bg: '#cff4fc', icon: '🏥' },
  L:             { label: 'Leave',         color: '#6366f1', bg: '#e0e7ff', icon: '🏖️' },
  holiday:       { label: 'Holiday',       color: '#6b7280', bg: '#f3f4f6', icon: '🎉' },
  H:             { label: 'Holiday',       color: '#6b7280', bg: '#f3f4f6', icon: '🎉' },
};

export default function MyAttendanceScreen() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [monthName, setMonthName] = useState('');
  const [summary, setSummary] = useState({
    present: 0,
    absent: 0,
    late: 0,
    leave: 0,
    total: 0,
    percentage: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    try {
      const res = await studentPortalAPI.getMyAttendance({ year, month });
      const data = res.data?.data;

      if (data) {
        setMonthName(`${data.month_name_en || 'Current Month'} ${data.year || year}`);
        
        // Parse summary
        const sum = data.summary || {};
        setSummary({
          present: sum.present_days ?? data.present ?? 0,
          absent: sum.absent_days ?? data.absent ?? 0,
          late: sum.late_days ?? 0,
          leave: sum.leave_days ?? data.leave ?? 0,
          total: sum.working_days ?? data.total ?? 0,
          percentage: Math.round(sum.percentage ?? data.percentage ?? 0),
        });

        // Parse daily map { [day]: { status, remarks } } or records array
        const list: AttendanceRecord[] = [];
        if (data.daily && typeof data.daily === 'object') {
          Object.keys(data.daily).forEach(dayKey => {
            const item = data.daily[dayKey];
            const dayNum = parseInt(dayKey, 10);
            const d = new Date(year, month - 1, dayNum);
            const dateStr = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
            list.push({
              day: dayNum,
              dateStr,
              status: item.status || 'present',
              remarks: item.remarks,
            });
          });
          list.sort((a, b) => b.day - a.day); // newest first
        } else if (Array.isArray(data.records)) {
          data.records.forEach((r: any) => {
            list.push({
              day: new Date(r.date).getDate(),
              dateStr: new Date(r.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }),
              status: r.status,
              remarks: r.remarks,
            });
          });
        }
        setRecords(list);
      }
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
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
        <Text style={s.bannerTitle}>📅 {monthName || "This Month's Attendance"}</Text>
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
          <View style={s.miniStat}><Text style={[s.miniVal, { color: '#d97706' }]}>{summary.late}</Text><Text style={s.miniLabel}>Late</Text></View>
          <View style={s.miniStat}><Text style={[s.miniVal, { color: '#6366f1' }]}>{summary.leave}</Text><Text style={s.miniLabel}>Leave</Text></View>
          <View style={s.miniStat}><Text style={[s.miniVal, { color: '#6b7280' }]}>{summary.total}</Text><Text style={s.miniLabel}>Total</Text></View>
        </View>
        {summary.percentage < 75 && (
          <View style={s.warning}>
            <Text style={s.warningText}>⚠️ Low attendance! Minimum 75% required for eligibility.</Text>
          </View>
        )}
      </View>

      {/* Daily Records */}
      <Text style={s.sectionTitle}>Daily Attendance Log</Text>
      {records.length === 0 ? (
        <View style={s.center}><Text style={s.emptyText}>No attendance records found for this month</Text></View>
      ) : records.map((r, i) => {
        const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.present;
        return (
          <View key={i} style={[s.row, { borderLeftColor: cfg.color }]}>
            <View style={[s.iconBox, { backgroundColor: cfg.bg }]}>
              <Text style={{ fontSize: 16 }}>{cfg.icon}</Text>
            </View>
            <View style={s.rowInfo}>
              <Text style={s.rowDate}>{r.dateStr}</Text>
              {r.remarks && <Text style={s.rowRemarks}>{r.remarks}</Text>}
            </View>
            <View style={[s.statusBadge, { backgroundColor: cfg.bg }]}>
              <Text style={[s.statusBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
          </View>
        );
      })}
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, paddingBottom: 40 },
  banner: { backgroundColor: '#059669', padding: 20, alignItems: 'center', borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  bannerTitle: { color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 16 },
  circle: { width: 110, height: 110, borderRadius: 55, borderWidth: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', marginBottom: 16 },
  circleValue: { fontSize: 28, fontWeight: '900' },
  circleLabel: { fontSize: 10, color: '#6b7280', fontWeight: '600' },
  miniStats: { flexDirection: 'row', gap: 14, justifyContent: 'center' },
  miniStat: { alignItems: 'center' },
  miniVal: { fontSize: 18, fontWeight: '900' },
  miniLabel: { fontSize: 10, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  warning: { marginTop: 14, backgroundColor: 'rgba(220,38,38,0.25)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  warningText: { color: '#fff', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1e293b', marginHorizontal: 16, marginTop: 18, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8, borderRadius: 12, padding: 14, borderLeftWidth: 4, gap: 12, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4 },
  iconBox: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  rowInfo: { flex: 1 },
  rowDate: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  rowRemarks: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  emptyText: { color: '#6b7280', fontSize: 13 },
});
