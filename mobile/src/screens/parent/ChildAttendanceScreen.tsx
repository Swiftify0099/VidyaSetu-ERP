/**
 * VidyaSetu Mobile — Child Attendance Screen (Parent)
 * =====================================================
 * Parent sees ONLY their child's attendance
 */
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { api } from '../../services/api';

interface AttendanceRecord { date: string; status: string; }

export default function ChildAttendanceScreen() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState({ present: 0, absent: 0, total: 0, percentage: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/parent-portal/attendance', { params: { academic_year: '2025-2026' } });
      const d = res.data?.data;
      setRecords(d?.records ?? []);
      setSummary({ present: d?.present ?? 0, absent: d?.absent ?? 0, total: d?.total ?? 0, percentage: d?.percentage ?? 0 });
    } catch { setRecords([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <View style={s.center}><ActivityIndicator color="#f59e0b" size="large" /></View>;

  return (
    <View style={s.page}>
      <View style={s.banner}>
        <Text style={s.title}>📅 Child Attendance</Text>
        <View style={s.stats}>
          <View style={s.stat}><Text style={[s.sv, { color: '#059669' }]}>{summary.present}</Text><Text style={s.sl}>Present</Text></View>
          <View style={s.stat}><Text style={[s.sv, { color: '#dc2626' }]}>{summary.absent}</Text><Text style={s.sl}>Absent</Text></View>
          <View style={s.stat}><Text style={[s.sv, { color: summary.percentage >= 75 ? '#059669' : '#dc2626' }]}>{summary.percentage}%</Text><Text style={s.sl}>Rate</Text></View>
        </View>
      </View>
      <FlatList
        data={records}
        keyExtractor={(_, i) => String(i)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => (
          <View style={[s.row, { borderLeftColor: item.status === 'P' ? '#059669' : item.status === 'A' ? '#dc2626' : '#d97706' }]}>
            <Text style={s.date}>{new Date(item.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</Text>
            <View style={[s.badge, { backgroundColor: item.status === 'P' ? '#d1fae5' : item.status === 'A' ? '#fee2e2' : '#fef3c7' }]}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: item.status === 'P' ? '#059669' : item.status === 'A' ? '#dc2626' : '#d97706' }}>
                {item.status === 'P' ? 'Present' : item.status === 'A' ? 'Absent' : 'Leave'}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={<View style={s.center}><Text style={{ color: '#6b7280', fontSize: 13 }}>No attendance records</Text></View>}
      />
    </View>
  );
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
  banner: { backgroundColor: '#f59e0b', padding: 20 },
  title: { color: '#fff', fontSize: 16, fontWeight: '900', marginBottom: 14 },
  stats: { flexDirection: 'row', gap: 24 },
  stat: { alignItems: 'center' },
  sv: { fontSize: 22, fontWeight: '900' },
  sl: { fontSize: 10, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 6, borderLeftWidth: 4 },
  date: { fontSize: 13, fontWeight: '700', color: '#1e293b' },
  badge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
});
