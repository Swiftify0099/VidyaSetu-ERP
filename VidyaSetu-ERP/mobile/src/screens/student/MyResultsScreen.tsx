/**
 * VidyaSetu Mobile — My Results Screen (Student)
 * ================================================
 * Student sees only their own exam results
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator,
} from 'react-native';
import { api } from '../../services/api';

interface Result {
  exam_name: string;
  subject: string;
  marks_obtained: number;
  max_marks: number;
  percentage: number;
  grade: string;
  status: 'pass' | 'fail' | 'absent';
  exam_date: string;
}

const GRADE_COLOR: Record<string, string> = {
  'A+': '#059669', A: '#2563eb', B: '#0891b2', C: '#d97706', D: '#f97316', F: '#dc2626',
};

export default function MyResultsScreen() {
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [overallPerc, setOverallPerc] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/student-portal/results', { params: { academic_year: '2025-2026' } });
      const data = res.data?.data;
      setResults(data?.results ?? []);
      setOverallPerc(data?.overall_percentage ?? 0);
    } catch { setResults([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <View style={s.center}><ActivityIndicator color="#4f46e5" size="large" /></View>;

  return (
    <View style={s.page}>
      {/* Overall Banner */}
      <View style={s.banner}>
        <Text style={s.bannerTitle}>📊 My Academic Performance</Text>
        <Text style={s.bannerSub}>Academic Year 2025–2026</Text>
        <View style={s.overallBadge}>
          <Text style={s.overallValue}>{overallPerc}%</Text>
          <Text style={s.overallLabel}>Overall</Text>
        </View>
      </View>

      <FlatList
        data={results}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={{ padding: 12, paddingBottom: 30 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        ListEmptyComponent={
          <View style={s.center}>
            <Text style={{ fontSize: 40 }}>📝</Text>
            <Text style={s.emptyText}>No results published yet</Text>
          </View>
        }
        renderItem={({ item }) => {
          const gradeColor = GRADE_COLOR[item.grade] ?? '#6b7280';
          const barWidth = Math.min(Math.round((item.marks_obtained / item.max_marks) * 100), 100);
          return (
            <View style={s.card}>
              <View style={s.cardTop}>
                <View style={s.cardLeft}>
                  <Text style={s.subject}>{item.subject}</Text>
                  <Text style={s.examName}>{item.exam_name}</Text>
                </View>
                <View style={[s.gradeBadge, { backgroundColor: gradeColor + '20' }]}>
                  <Text style={[s.gradeText, { color: gradeColor }]}>{item.grade}</Text>
                </View>
              </View>
              <Text style={s.marks}>{item.marks_obtained} / {item.max_marks}  ({item.percentage}%)</Text>
              {/* Progress bar */}
              <View style={s.progressBg}>
                <View style={[s.progressFill, { width: `${barWidth}%`, backgroundColor: gradeColor }]} />
              </View>
              <View style={s.cardBottom}>
                <Text style={s.dateText}>{new Date(item.exam_date).toLocaleDateString('en-IN')}</Text>
                <View style={[s.statusBadge, { backgroundColor: item.status === 'pass' ? '#d1fae5' : '#fee2e2' }]}>
                  <Text style={[s.statusText, { color: item.status === 'pass' ? '#059669' : '#dc2626' }]}>
                    {item.status.toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  banner: { backgroundColor: '#4f46e5', padding: 20, alignItems: 'center' },
  bannerTitle: { color: '#fff', fontSize: 16, fontWeight: '900' },
  bannerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 4, marginBottom: 12 },
  overallBadge: { backgroundColor: '#fff', borderRadius: 50, width: 90, height: 90, alignItems: 'center', justifyContent: 'center' },
  overallValue: { fontSize: 24, fontWeight: '900', color: '#4f46e5' },
  overallLabel: { fontSize: 10, color: '#6b7280', fontWeight: '700' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  cardLeft: { flex: 1 },
  subject: { fontSize: 15, fontWeight: '800', color: '#1e293b' },
  examName: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  gradeBadge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  gradeText: { fontSize: 16, fontWeight: '900' },
  marks: { fontSize: 13, color: '#1e293b', fontWeight: '700', marginBottom: 8 },
  progressBg: { height: 6, backgroundColor: '#f1f5f9', borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: 6, borderRadius: 3 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateText: { fontSize: 11, color: '#6b7280' },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  statusText: { fontSize: 10, fontWeight: '800' },
  emptyText: { fontSize: 13, color: '#6b7280', textAlign: 'center', marginTop: 12 },
});
