/**
 * VidyaSetu Mobile — Report Card Screen
 * =======================================
 * Shows subject-wise marks, grades, and overall performance.
 * Accessible to: Admin, Teacher, Student, Parent
 * Uses: GET /exam/report-card/{studentId} or /exam/my-results (for students)
 *       GET /student-portal/results (for student portal)
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from '../../theme/ThemeContext';
import { examAPI, studentPortalAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { getGrade, GRADES, CURRENT_ACADEMIC_YEAR } from '../../config/constants';
import { shadows } from '../../theme';
import PremiumCard from '../../components/ui/PremiumCard';
import SectionHeader from '../../components/ui/SectionHeader';
import SkeletonLoader from '../../components/ui/SkeletonLoader';

interface SubjectResult {
  subject_name?: string;
  subject?: string;
  marks_obtained: number;
  total_marks: number;
  percentage?: number;
  grade?: string;
  exam_type?: string;
  exam_type_name?: string;
  status?: string;
}

interface ExamGroup {
  exam_type: string;
  subjects: SubjectResult[];
  total_obtained: number;
  total_marks: number;
  percentage: number;
  rank?: number;
}

function resolveRole(user: any): string {
  if (!user) return '';
  if (Array.isArray(user.roles) && user.roles.length > 0) {
    const r0 = user.roles[0];
    return typeof r0 === 'string' ? r0.toLowerCase() : (r0?.code ?? '').toLowerCase();
  }
  return (user.role ?? '').toLowerCase();
}

export default function ReportCardScreen({ navigation, route }: { navigation: any; route: any }) {
  const { studentId } = route?.params ?? {};
  const { user } = useAuthStore();
  const role = resolveRole(user);
  const { colors } = useTheme();

  const isStudent = role === 'student';

  const [examGroups, setExamGroups] = useState<ExamGroup[]>([]);
  const [selectedExam, setSelectedExam] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [studentInfo, setStudentInfo] = useState<{ name?: string; standard?: string; division?: string } | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      let results: SubjectResult[] = [];
      let meta: any = {};

      if (isStudent) {
        // Student portal: GET /student-portal/results
        const res = await studentPortalAPI.getMyResults({ academic_year: CURRENT_ACADEMIC_YEAR });
        const data = res.data?.data;
        results = Array.isArray(data?.results) ? data.results
          : Array.isArray(data?.items) ? data.items
          : Array.isArray(data) ? data : [];
        meta = { name: user?.full_name };
      } else {
        // Admin/Teacher: GET /exam/report-card/{studentId}
        const id = studentId ?? user?.id;
        if (!id) throw new Error('No student ID provided');
        const res = await examAPI.getReportCard(id, { academic_year: CURRENT_ACADEMIC_YEAR });
        const data = res.data?.data;
        results = Array.isArray(data?.results) ? data.results
          : Array.isArray(data?.marks) ? data.marks
          : Array.isArray(data?.items) ? data.items
          : Array.isArray(data) ? data : [];
        meta = data?.student ?? {};
      }

      setStudentInfo(meta);

      // Group by exam type
      const groups: Record<string, ExamGroup> = {};
      for (const r of results) {
        const examType = r.exam_type_name ?? r.exam_type ?? 'Exam';
        if (!groups[examType]) {
          groups[examType] = { exam_type: examType, subjects: [], total_obtained: 0, total_marks: 0, percentage: 0 };
        }
        const pct = r.percentage ?? (r.total_marks > 0 ? Math.round((r.marks_obtained / r.total_marks) * 100) : 0);
        groups[examType].subjects.push({ ...r, percentage: pct });
        groups[examType].total_obtained += r.marks_obtained;
        groups[examType].total_marks    += r.total_marks;
      }
      const groupArr = Object.values(groups).map(g => ({
        ...g,
        percentage: g.total_marks > 0 ? Math.round((g.total_obtained / g.total_marks) * 100) : 0,
      }));
      setExamGroups(groupArr);
    } catch (e: any) {
      setError('Could not load results. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isStudent, studentId, user]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  const group = examGroups[selectedExam];
  const overallPct = group?.percentage ?? 0;
  const overallGrade = getGrade(overallPct);
  const gradeInfo = GRADES[overallGrade];

  if (loading) {
    return (
      <View style={[s.root, { backgroundColor: colors.background }]}>
        <SkeletonLoader />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[s.root, s.center, { backgroundColor: colors.background }]}>
        <Text style={{ fontSize: 40 }}>📋</Text>
        <Text style={[s.errorText, { color: colors.textSecondary }]}>{error}</Text>
        <TouchableOpacity style={[s.retryBtn, { backgroundColor: colors.primary }]} onPress={load}>
          <Text style={s.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (examGroups.length === 0) {
    return (
      <View style={[s.root, s.center, { backgroundColor: colors.background }]}>
        <Text style={{ fontSize: 40 }}>📊</Text>
        <Text style={[s.errorText, { color: colors.textSecondary }]}>No results available yet.</Text>
      </View>
    );
  }

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* ── Header Card ──────────────────────────────────────── */}
        <View style={[s.hero, { backgroundColor: colors.primary }]}>
          <Text style={s.heroTitle}>📋 Report Card</Text>
          {studentInfo?.name && <Text style={s.heroSub}>{studentInfo.name}</Text>}
          {studentInfo?.standard && (
            <Text style={s.heroSub2}>Std {studentInfo.standard}{studentInfo.division ? `-${studentInfo.division}` : ''}</Text>
          )}
        </View>

        {/* ── Exam Type Tabs ────────────────────────────────────── */}
        {examGroups.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabBar} contentContainerStyle={s.tabContent}>
            {examGroups.map((g, i) => (
              <TouchableOpacity
                key={g.exam_type}
                style={[s.tab, i === selectedExam && s.tabActive]}
                onPress={() => setSelectedExam(i)}
              >
                <Text style={[s.tabText, i === selectedExam && s.tabTextActive]}>{g.exam_type}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <View style={s.body}>
          {/* ── Overall Summary ───────────────────────────────── */}
          <View style={[s.summaryCard, { borderColor: gradeInfo?.color ?? colors.primary }]}>
            <View style={s.summaryLeft}>
              <Text style={[s.grade, { color: gradeInfo?.color ?? colors.primary }]}>{overallGrade}</Text>
              <Text style={[s.gradeLabel, { color: colors.textSecondary }]}>{gradeInfo?.label ?? ''}</Text>
            </View>
            <View style={s.summaryRight}>
              <Text style={[s.pct, { color: gradeInfo?.color ?? colors.primary }]}>{overallPct}%</Text>
              <Text style={[s.marks, { color: colors.text }]}>
                {group?.total_obtained} / {group?.total_marks}
              </Text>
              {group?.rank && <Text style={[s.rank, { color: colors.textSecondary }]}>Rank: #{group.rank}</Text>}
            </View>
          </View>

          {/* ── Subject-wise Results ─────────────────────────── */}
          <PremiumCard>
            <SectionHeader title="Subject Results" />
            {group?.subjects.map((sub, i) => {
              const subPct = sub.percentage ?? 0;
              const subGrade = getGrade(subPct);
              const subGradeInfo = GRADES[subGrade];
              const subName = sub.subject_name ?? sub.subject ?? `Subject ${i + 1}`;
              const subBalance = (sub.total_marks - sub.marks_obtained);
              return (
                <View key={i} style={[s.subjectRow, { borderBottomColor: colors.border }]}>
                  <View style={s.subjectLeft}>
                    <Text style={[s.subjectName, { color: colors.text }]}>{subName}</Text>
                    <Text style={[s.subjectMeta, { color: colors.textSecondary }]}>
                      {sub.marks_obtained} / {sub.total_marks} marks
                    </Text>
                  </View>
                  <View style={s.subjectRight}>
                    <Text style={[s.subjectPct, { color: subGradeInfo?.color ?? colors.primary }]}>{subPct}%</Text>
                    <View style={[s.gradeBadge, { backgroundColor: (subGradeInfo?.color ?? '#6366f1') + '22' }]}>
                      <Text style={[s.gradeBadgeText, { color: subGradeInfo?.color ?? colors.primary }]}>{subGrade}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </PremiumCard>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { fontSize: 14, textAlign: 'center', lineHeight: 22, paddingHorizontal: 32 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10, marginTop: 4 },
  retryText: { color: '#fff', fontWeight: '700' },
  hero: { padding: 24, paddingTop: Platform.OS === 'ios' ? 60 : 40, alignItems: 'center', gap: 4 },
  heroTitle: { fontSize: 20, fontWeight: '900', color: '#fff' },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.85)', fontWeight: '700' },
  heroSub2: { fontSize: 12, color: 'rgba(255,255,255,0.65)' },
  tabBar: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', flexGrow: 0 },
  tabContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  tab: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: '#f1f5f9' },
  tabActive: { backgroundColor: '#4f46e5' },
  tabText: { fontSize: 12, fontWeight: '700', color: '#6b7280' },
  tabTextActive: { color: '#fff' },
  body: { padding: 16, gap: 12 },
  summaryCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 2.5, ...shadows.md },
  summaryLeft: { alignItems: 'center' },
  grade: { fontSize: 44, fontWeight: '900' },
  gradeLabel: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  summaryRight: { alignItems: 'flex-end' },
  pct: { fontSize: 32, fontWeight: '900' },
  marks: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  rank: { fontSize: 12, marginTop: 4 },
  subjectRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  subjectLeft: { flex: 1 },
  subjectName: { fontSize: 14, fontWeight: '700' },
  subjectMeta: { fontSize: 11, marginTop: 3 },
  subjectRight: { alignItems: 'flex-end', gap: 4 },
  subjectPct: { fontSize: 16, fontWeight: '900' },
  gradeBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  gradeBadgeText: { fontSize: 11, fontWeight: '800' },
});
