/**
 * VidyaSetu Mobile — My Results Screen (Student)
 * ================================================
 * Detailed examination marksheets, class rank, subject breakdowns & grades.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { studentPortalAPI } from '../../services/api';

interface SubjectMark {
  subject: string;
  subject_marathi?: string;
  marks_obtained: number;
  theory_marks?: number;
  practical_marks?: number;
  max_marks: number;
  passing_marks: number;
  grade?: string;
  is_absent: boolean;
  is_pass: boolean;
  remarks?: string;
}

interface ExamResult {
  exam_id: number;
  exam_type: string;
  exam_type_marathi?: string;
  standard: string;
  division?: string;
  result_declared: boolean;
  result_date?: string;
  total_marks: number;
  total_max: number;
  percentage: number;
  grade?: string;
  gpa?: string;
  rank?: number;
  class_total_students?: number;
  all_pass: boolean;
  remarks?: string;
  subjects: SubjectMark[];
}

const GRADE_COLOR: Record<string, string> = {
  'A1': '#059669', 'A+': '#059669', 'A2': '#2563eb', 'A': '#2563eb',
  'B1': '#0891b2', 'B2': '#0284c7', 'B': '#0891b2',
  'C1': '#d97706', 'C2': '#f59e0b', 'C': '#d97706',
  'D': '#f97316', 'F': '#dc2626',
};

export default function MyResultsScreen() {
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedExam, setExpandedExam] = useState<number | null>(null);
  const [overallPerc, setOverallPerc] = useState<number>(0);

  const load = useCallback(async () => {
    try {
      const res = await studentPortalAPI.getMyResults();
      const data = res.data?.data;
      const list: ExamResult[] = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
      
      setExamResults(list);
      if (list.length > 0) {
        setExpandedExam(list[0].exam_id);
        const sumPct = list.reduce((acc, curr) => acc + (curr.percentage || 0), 0);
        setOverallPerc(Math.round(sumPct / list.length));
      }
    } catch {
      setExamResults([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <View style={s.center}><ActivityIndicator color="#4f46e5" size="large" /></View>;

  return (
    <View style={s.page}>
      {/* Overall Banner */}
      <View style={s.banner}>
        <Text style={s.bannerTitle}>📊 Academic Marksheets & Performance</Text>
        <Text style={s.bannerSub}>VidyaSetu ERP — Student Evaluation</Text>
        <View style={s.overallBadge}>
          <Text style={s.overallValue}>{overallPerc > 0 ? `${overallPerc}%` : '—'}</Text>
          <Text style={s.overallLabel}>Avg Percentage</Text>
        </View>
      </View>

      <FlatList
        data={examResults}
        keyExtractor={(item) => String(item.exam_id)}
        contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#4f46e5" />}
        ListEmptyComponent={
          <View style={s.center}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>📝</Text>
            <Text style={s.emptyText}>No examination results published yet</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isExpanded = expandedExam === item.exam_id;
          const gradeColor = GRADE_COLOR[item.grade || 'A1'] ?? '#6366f1';
          const perc = Math.round(item.percentage || 0);

          return (
            <View style={s.card}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setExpandedExam(isExpanded ? null : item.exam_id)}
                style={s.cardHeader}
              >
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={s.examTitle}>{item.exam_type}</Text>
                    {item.rank != null && (
                      <View style={s.rankPill}>
                        <Icon name="trophy" size={10} color="#f59e0b" solid />
                        <Text style={s.rankText}>Rank #{item.rank}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.examSub}>
                    Std {item.standard}{item.division ? `-${item.division}` : ''} • {item.result_date ? new Date(item.result_date).toLocaleDateString('en-IN') : 'Declared'}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <View style={[s.gradeBadge, { backgroundColor: `${gradeColor}18` }]}>
                    <Text style={[s.gradeText, { color: gradeColor }]}>{item.grade || 'PASS'}</Text>
                  </View>
                  <Text style={s.examPerc}>{item.total_marks} / {item.total_max} ({perc}%)</Text>
                </View>
              </TouchableOpacity>

              {/* Progress bar */}
              <View style={s.progressBg}>
                <View style={[s.progressFill, { width: `${Math.min(perc, 100)}%`, backgroundColor: gradeColor }]} />
              </View>

              {/* Remarks */}
              {item.remarks && (
                <Text style={s.remarksText}>💡 {item.remarks}</Text>
              )}

              {/* Expandable Subject Breakdown */}
              {isExpanded && (
                <View style={s.subjectsContainer}>
                  <Text style={s.subjectsHeader}>Subject Breakdown:</Text>
                  {item.subjects.map((sub, sIdx) => {
                    const subGradeColor = GRADE_COLOR[sub.grade || 'A1'] ?? '#64748b';
                    const subPerc = Math.round((sub.marks_obtained / sub.max_marks) * 100);

                    return (
                      <View key={sIdx} style={s.subjectRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={s.subjectName}>{sub.subject}</Text>
                          {sub.subject_marathi && (
                            <Text style={s.subjectMarathi}>{sub.subject_marathi}</Text>
                          )}
                          {sub.theory_marks != null && sub.practical_marks != null && sub.practical_marks > 0 && (
                            <Text style={s.breakdownText}>
                              Theory: {sub.theory_marks} | Practical: {sub.practical_marks}
                            </Text>
                          )}
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={s.subjectMarks}>
                            {sub.is_absent ? 'ABSENT' : `${sub.marks_obtained} / ${sub.max_marks}`}
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                            <Text style={[s.subjectGrade, { color: subGradeColor }]}>{sub.grade || `${subPerc}%`}</Text>
                            <View style={[s.passBadge, { backgroundColor: sub.is_pass ? '#d1fae5' : '#fee2e2' }]}>
                              <Text style={[s.passText, { color: sub.is_pass ? '#059669' : '#dc2626' }]}>
                                {sub.is_pass ? 'PASS' : 'FAIL'}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, paddingBottom: 40 },
  banner: { backgroundColor: '#4f46e5', padding: 20, alignItems: 'center', borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  bannerTitle: { color: '#fff', fontSize: 16, fontWeight: '900' },
  bannerSub: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 4, marginBottom: 12 },
  overallBadge: { backgroundColor: '#fff', borderRadius: 50, width: 92, height: 92, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  overallValue: { fontSize: 24, fontWeight: '900', color: '#4f46e5' },
  overallLabel: { fontSize: 10, color: '#6b7280', fontWeight: '700' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  examTitle: { fontSize: 15, fontWeight: '800', color: '#1e293b', flexShrink: 1 },
  examSub: { fontSize: 12, color: '#64748b', marginTop: 3 },
  rankPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  rankText: { fontSize: 11, fontWeight: '800', color: '#d97706' },
  gradeBadge: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 4 },
  gradeText: { fontSize: 14, fontWeight: '900' },
  examPerc: { fontSize: 12, fontWeight: '700', color: '#475569', marginTop: 4 },
  progressBg: { height: 6, backgroundColor: '#f1f5f9', borderRadius: 3, overflow: 'hidden', marginTop: 12, marginBottom: 8 },
  progressFill: { height: 6, borderRadius: 3 },
  remarksText: { fontSize: 12, color: '#475569', fontStyle: 'italic', marginTop: 4 },
  subjectsContainer: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  subjectsHeader: { fontSize: 13, fontWeight: '800', color: '#334155', marginBottom: 8 },
  subjectRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  subjectName: { fontSize: 13, fontWeight: '700', color: '#1e293b' },
  subjectMarathi: { fontSize: 11, color: '#64748b' },
  breakdownText: { fontSize: 10, color: '#94a3b8', marginTop: 1 },
  subjectMarks: { fontSize: 13, fontWeight: '800', color: '#1e293b' },
  subjectGrade: { fontSize: 12, fontWeight: '800' },
  passBadge: { borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  passText: { fontSize: 9, fontWeight: '900' },
  emptyText: { fontSize: 13, color: '#6b7280', textAlign: 'center' },
});
