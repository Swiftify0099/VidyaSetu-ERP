/**
 * VidyaSetu Mobile — Timetable Screen (Role-Aware)
 * Uses the correct portal endpoint based on the user's role:
 *   Teacher → /teacher-portal/timetable  (returns { timetable: [...] })
 *   Student → /student-portal/timetable  (returns { timetable: [...] })
 *   Others  → fallback message
 */
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { teacherPortalAPI, studentPortalAPI } from '../../services/api';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SUBJECT_COLORS = ['#4f46e5', '#059669', '#d97706', '#0891b2', '#7c3aed', '#dc2626', '#f97316', '#10b981'];

interface Period {
  period_number: number;
  start_time: string;
  end_time: string;
  subject: string;
  subject_name?: string;
  teacher_name?: string;
  teacher?: string;
  room?: string;
}
interface DayTimetable { day: number | string; day_en?: string; periods: Period[]; }

function resolveRole(user: any): string {
  if (!user) return '';
  if (Array.isArray(user.roles) && user.roles.length > 0) {
    const r0 = user.roles[0];
    return typeof r0 === 'string' ? r0.toLowerCase() : (r0?.code ?? '').toLowerCase();
  }
  return (user.role ?? '').toLowerCase();
}

export default function TimetableScreen() {
  const { user } = useAuthStore();
  const role = resolveRole(user);

  const [timetable, setTimetable] = useState<DayTimetable[]>([]);
  const [selectedDay, setSelectedDay] = useState(() => {
    const d = new Date().getDay(); // 0 = Sunday
    return Math.max(0, Math.min(d - 1, 5));
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isTeacher = ['teacher', 'class_teacher'].includes(role);
  const isStudent = role === 'student';

  const load = useCallback(async () => {
    setError(null);
    if (!isTeacher && !isStudent) {
      setLoading(false);
      setRefreshing(false);
      setError('Timetable is available for Teachers and Students only.');
      return;
    }
    try {
      let raw: any = null;
      if (isTeacher) {
        const res = await teacherPortalAPI.getMyTimetable();
        raw = res.data?.data;
      } else {
        const res = await studentPortalAPI.getMyTimetable();
        raw = res.data?.data;
      }
      // Both portals return { timetable: [{ day, day_en, periods }] }
      const items: DayTimetable[] = Array.isArray(raw?.timetable)
        ? raw.timetable
        : Array.isArray(raw)
        ? raw
        : [];
      setTimetable(items);
    } catch (e: any) {
      setError('Could not load timetable. Please try again.');
      setTimetable([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isTeacher, isStudent]);

  useEffect(() => { load(); }, [load]);

  // Match selected day index to day_en string or numeric day
  const currentDayData = timetable.find(d => {
    const dayLabel = (d.day_en ?? d.day ?? '').toString().toLowerCase();
    return dayLabel === DAYS[selectedDay].toLowerCase() || Number(d.day) === selectedDay + 1;
  });

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color="#4f46e5" size="large" />
        <Text style={s.loadingText}>Loading timetable…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={s.center}>
        <Text style={{ fontSize: 36 }}>📅</Text>
        <Text style={s.emptyText}>{error}</Text>
      </View>
    );
  }

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
            <Text style={s.emptyText}>No periods scheduled for {DAYS[selectedDay]}</Text>
          </View>
        ) : currentDayData.periods.map((p, i) => {
          const color = SUBJECT_COLORS[i % SUBJECT_COLORS.length];
          const subjectName = p.subject_name ?? p.subject ?? 'Period';
          const teacherName = p.teacher_name ?? p.teacher;
          return (
            <View key={i} style={[s.periodCard, { borderLeftColor: color }]}>
              <View style={[s.periodNum, { backgroundColor: color }]}>
                <Text style={s.periodNumText}>{p.period_number ?? i + 1}</Text>
              </View>
              <View style={s.periodInfo}>
                <Text style={[s.subject, { color }]}>{subjectName}</Text>
                {teacherName ? <Text style={s.teacher}>👨‍🏫 {teacherName}</Text> : null}
                {p.room ? <Text style={s.room}>🏫 {p.room}</Text> : null}
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { fontSize: 13, color: '#6b7280', marginTop: 8 },
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
  room: { fontSize: 11, color: '#9ca3af', marginTop: 1 },
  timeBox: { alignItems: 'flex-end' },
  time: { fontSize: 12, color: '#6b7280', fontWeight: '700' },
  timeSep: { fontSize: 10, color: '#9ca3af' },
  emptyBox: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 13, color: '#6b7280', marginTop: 12, textAlign: 'center', lineHeight: 20 },
});
