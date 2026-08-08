/**
 * VidyaSetu Mobile — Child Attendance Screen (Parent)
 * =====================================================
 * Parent sees their child(ren)'s attendance.
 * If multiple children, shows a child selector.
 * Uses: GET /parent-portal/children (get list) then
 *       GET /parent-portal/children/{childId}/attendance
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl,
  ActivityIndicator, TouchableOpacity, ScrollView,
} from 'react-native';
import { parentAPI } from '../../services/api';

interface Child { id: number; full_name: string; standard?: string; division?: string; }
interface AttendanceRecord { date: string; status: string; }
interface Summary { present: number; absent: number; leave: number; total: number; percentage: number; }

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  present: { label: 'Present', bg: '#d1fae5', color: '#059669' },
  absent:  { label: 'Absent',  bg: '#fee2e2', color: '#dc2626' },
  leave:   { label: 'Leave',   bg: '#fef3c7', color: '#d97706' },
  late:    { label: 'Late',    bg: '#ede9fe', color: '#7c3aed' },
  // Short form fallback (P/A/L)
  P: { label: 'Present', bg: '#d1fae5', color: '#059669' },
  A: { label: 'Absent',  bg: '#fee2e2', color: '#dc2626' },
  L: { label: 'Leave',   bg: '#fef3c7', color: '#d97706' },
};

export default function ChildAttendanceScreen() {
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<Summary>({ present: 0, absent: 0, leave: 0, total: 0, percentage: 0 });
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Load children list
  useEffect(() => {
    (async () => {
      try {
        const res = await parentAPI.getMyChildren();
        const data = res.data?.data;
        const list: Child[] = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
        setChildren(list);
        if (list.length > 0) setSelectedChildId(list[0].id);
      } catch {
        setError('Could not load children list.');
      } finally {
        setLoadingChildren(false);
      }
    })();
  }, []);

  // Step 2: Load attendance for selected child
  const loadAttendance = useCallback(async () => {
    if (!selectedChildId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await parentAPI.getChildAttendance(selectedChildId, { academic_year: '2025-2026' });
      const d = res.data?.data;
      // Response can be: { records: [...], present, absent, total, percentage }
      // or a flat array of attendance records
      if (Array.isArray(d)) {
        setRecords(d);
        const present = d.filter(r => ['present', 'P'].includes(r.status)).length;
        const absent  = d.filter(r => ['absent',  'A'].includes(r.status)).length;
        const leave   = d.filter(r => ['leave',   'L'].includes(r.status)).length;
        const total   = d.length;
        setSummary({ present, absent, leave, total, percentage: total > 0 ? Math.round((present / total) * 100) : 0 });
      } else {
        setRecords(d?.records ?? []);
        setSummary({
          present:    d?.present    ?? 0,
          absent:     d?.absent     ?? 0,
          leave:      d?.leave      ?? 0,
          total:      d?.total      ?? 0,
          percentage: d?.percentage ?? 0,
        });
      }
    } catch {
      setError('Could not load attendance data.');
      setRecords([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedChildId]);

  useEffect(() => {
    if (selectedChildId !== null) loadAttendance();
  }, [loadAttendance, selectedChildId]);

  const onRefresh = () => { setRefreshing(true); loadAttendance(); };

  if (loadingChildren) {
    return <View style={s.center}><ActivityIndicator color="#f59e0b" size="large" /></View>;
  }

  if (children.length === 0) {
    return (
      <View style={s.center}>
        <Text style={{ fontSize: 36 }}>👶</Text>
        <Text style={s.emptyText}>No children linked to your account.</Text>
      </View>
    );
  }

  const selectedChild = children.find(c => c.id === selectedChildId);
  const pct = summary.percentage ?? 0;

  return (
    <View style={s.page}>
      {/* Header banner */}
      <View style={s.banner}>
        <Text style={s.bannerTitle}>📅 Attendance Report</Text>
        {selectedChild && (
          <Text style={s.bannerSub}>{selectedChild.full_name}
            {selectedChild.standard ? ` · Std ${selectedChild.standard}${selectedChild.division ? `-${selectedChild.division}` : ''}` : ''}
          </Text>
        )}
        {/* Stats row */}
        {!loading && (
          <View style={s.statsRow}>
            <View style={s.stat}>
              <Text style={[s.statVal, { color: '#d1fae5' }]}>{summary.present}</Text>
              <Text style={s.statLbl}>Present</Text>
            </View>
            <View style={s.stat}>
              <Text style={[s.statVal, { color: '#fee2e2' }]}>{summary.absent}</Text>
              <Text style={s.statLbl}>Absent</Text>
            </View>
            <View style={s.stat}>
              <Text style={[s.statVal, { color: pct >= 75 ? '#d1fae5' : '#fecaca' }]}>{pct}%</Text>
              <Text style={s.statLbl}>Rate</Text>
            </View>
            <View style={s.stat}>
              <Text style={[s.statVal, { color: 'rgba(255,255,255,0.9)' }]}>{summary.total}</Text>
              <Text style={s.statLbl}>Total</Text>
            </View>
          </View>
        )}
      </View>

      {/* Child selector (only if multiple children) */}
      {children.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.childBar} contentContainerStyle={s.childBarContent}>
          {children.map(child => (
            <TouchableOpacity
              key={child.id}
              style={[s.childChip, selectedChildId === child.id && s.childChipActive]}
              onPress={() => setSelectedChildId(child.id)}
            >
              <Text style={[s.childChipText, selectedChildId === child.id && s.childChipTextActive]}>
                {child.full_name.split(' ')[0]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {loading ? (
        <View style={s.center}><ActivityIndicator color="#f59e0b" size="large" /></View>
      ) : error ? (
        <View style={s.center}>
          <Text style={{ fontSize: 30 }}>⚠️</Text>
          <Text style={s.emptyText}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={loadAttendance}>
            <Text style={s.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(_, i) => String(i)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f59e0b" />}
          contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
          ListEmptyComponent={
            <View style={s.center}>
              <Text style={{ fontSize: 36 }}>📋</Text>
              <Text style={s.emptyText}>No attendance records found.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const statusKey = item.status ?? '';
            const cfg = STATUS_CONFIG[statusKey] ?? { label: statusKey, bg: '#f3f4f6', color: '#374151' };
            return (
              <View style={[s.row, { borderLeftColor: cfg.color }]}>
                <Text style={s.date}>
                  {new Date(item.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                </Text>
                <View style={[s.badge, { backgroundColor: cfg.bg }]}>
                  <Text style={[s.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40, gap: 8 },
  emptyText: { fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 20, paddingHorizontal: 32 },
  banner: { backgroundColor: '#f59e0b', padding: 20, paddingBottom: 16 },
  bannerTitle: { color: '#fff', fontSize: 16, fontWeight: '900', marginBottom: 2 },
  bannerSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginBottom: 14 },
  statsRow: { flexDirection: 'row', gap: 16 },
  stat: { alignItems: 'center' },
  statVal: { fontSize: 22, fontWeight: '900' },
  statLbl: { fontSize: 10, color: 'rgba(255,255,255,0.8)', fontWeight: '600', marginTop: 1 },
  childBar: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', flexGrow: 0 },
  childBarContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  childChip: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: '#f1f5f9' },
  childChipActive: { backgroundColor: '#f59e0b' },
  childChipText: { fontSize: 12, fontWeight: '700', color: '#6b7280' },
  childChipTextActive: { color: '#fff' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 6, borderLeftWidth: 4 },
  date: { fontSize: 13, fontWeight: '700', color: '#1e293b' },
  badge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: '800' },
  retryBtn: { backgroundColor: '#f59e0b', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10, marginTop: 8 },
  retryText: { color: '#fff', fontWeight: '700' },
});
