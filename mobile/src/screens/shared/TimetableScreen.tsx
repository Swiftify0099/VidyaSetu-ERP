/**
 * VidyaSetu Mobile — Timetable Screen (Shared)
 */
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { api } from '../../services/api';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const DAY_SHORT = ['Mon','Tue','Wed','Thu','Fri','Sat'];
const SUBJECT_COLORS = ['#4f46e5','#059669','#d97706','#0891b2','#7c3aed','#dc2626','#f97316','#10b981'];

interface Period { period_number: number; start_time: string; end_time: string; subject: string; teacher_name?: string; }
interface DayTimetable { day: string; periods: Period[]; }

export default function TimetableScreen() {
  const [timetable, setTimetable] = useState<DayTimetable[]>([]);
  const [selectedDay, setSelectedDay] = useState(() => {
    const d = new Date().getDay(); // 0 = Sunday
    return Math.max(0, Math.min(d - 1, 5));
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/timetable', { params: { academic_year: '2025-2026' } });
      setTimetable(res.data?.data?.items ?? []);
    } catch { setTimetable([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const currentDayData = timetable.find(d => d.day?.toLowerCase() === DAYS[selectedDay]?.toLowerCase());

  if (loading) return <View style={s.center}><ActivityIndicator color="#4f46e5" size="large" /></View>;

  return (
    <View style={s.page}>
      {/* Day Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.dayTabsBar} contentContainerStyle={s.dayTabsContent}>
        {DAY_SHORT.map((d, i) => (
          <TouchableOpacity
            key={d}
            style={[s.dayTab, i === selectedDay && s.dayTabActive]}
            onPress={() => setSelectedDay(i)}
          >
            <Text style={[s.dayTabText, i === selectedDay && s.dayTabTextActive]}>{d}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#4f46e5" />}
      >
        <Text style={s.dayTitle}>{DAYS[selectedDay]}</Text>
        {!currentDayData || currentDayData.periods.length === 0 ? (
          <View style={s.emptyBox}>
            <Text style={{ fontSize: 36 }}>🎉</Text>
            <Text style={s.emptyText}>No periods on {DAYS[selectedDay]}</Text>
          </View>
        ) : currentDayData.periods.map((p, i) => {
          const color = SUBJECT_COLORS[i % SUBJECT_COLORS.length];
          return (
            <View key={i} style={[s.periodCard, { borderLeftColor: color }]}>
              <View style={[s.periodNum, { backgroundColor: color }]}>
                <Text style={s.periodNumText}>{p.period_number}</Text>
              </View>
              <View style={s.periodInfo}>
                <Text style={[s.subject, { color }]}>{p.subject}</Text>
                {p.teacher_name && <Text style={s.teacher}>👨‍🏫 {p.teacher_name}</Text>}
              </View>
              <View style={s.timeBox}>
                <Text style={s.time}>{p.start_time}</Text>
                <Text style={s.timeSep}>—</Text>
                <Text style={s.time}>{p.end_time}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dayTabsBar: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', flexGrow: 0 },
  dayTabsContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  dayTab: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: '#f1f5f9' },
  dayTabActive: { backgroundColor: '#4f46e5' },
  dayTabText: { fontSize: 12, fontWeight: '700', color: '#6b7280' },
  dayTabTextActive: { color: '#fff' },
  content: { padding: 14, paddingBottom: 30 },
  dayTitle: { fontSize: 18, fontWeight: '900', color: '#1e293b', marginBottom: 14 },
  periodCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12, borderLeftWidth: 5, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  periodNum: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  periodNumText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  periodInfo: { flex: 1 },
  subject: { fontSize: 15, fontWeight: '800' },
  teacher: { fontSize: 11, color: '#6b7280', marginTop: 3 },
  timeBox: { alignItems: 'flex-end' },
  time: { fontSize: 12, color: '#6b7280', fontWeight: '700' },
  timeSep: { fontSize: 10, color: '#9ca3af' },
  emptyBox: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 13, color: '#6b7280', marginTop: 12 },
});
