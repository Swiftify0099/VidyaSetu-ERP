/**
 * VidyaSetu Mobile — Report Card Screen (Premium Redesign)
 * ==========================================================
 * Holistic student assessment report card with exam tabs, overall percentage,
 * letter grade pills, and subject-wise score table.
 */
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from '../../theme/ThemeContext';
import { examAPI, studentPortalAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { getGrade, GRADES, CURRENT_ACADEMIC_YEAR } from '../../config/constants';
import { spacing, radius, typography, shadows } from '../../theme';
import { formatPercentage } from '../../utils/formatters';
import {
  AppCard,
  AppBadge,
  AppTabs,
  AppProgress,
  AppEmptyState,
  AppSkeleton,
  AppErrorState,
  AppSectionHeader,
  AppStatCard,
} from '../../components/ui';

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

export default function ReportCardScreen({
  navigation,
  route,
}: {
  navigation: any;
  route: any;
}) {
  const { studentId } = route?.params ?? {};
  const { user } = useAuthStore();
  const role = resolveRole(user);
  const { colors, roleAccent } = useTheme();

  const isStudent = role === 'student';

  const [examGroups, setExamGroups] = useState<ExamGroup[]>([]);
  const [selectedExamKey, setSelectedExamKey] = useState('0');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<any>(null);
  const [studentInfo, setStudentInfo] = useState<{
    name?: string;
    standard?: string;
    division?: string;
  } | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      let results: SubjectResult[] = [];
      let meta: any = {};

      if (isStudent) {
        const res = await studentPortalAPI.getMyResults({ academic_year: CURRENT_ACADEMIC_YEAR });
        const data = res.data?.data;
        results = Array.isArray(data?.results)
          ? data.results
          : Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data)
          ? data
          : [];
        meta = { name: user?.full_name };
      } else {
        const id = studentId ?? user?.id;
        if (!id) throw new Error('No student ID provided');
        const res = await examAPI.getReportCard(id, { academic_year: CURRENT_ACADEMIC_YEAR });
        const data = res.data?.data;
        results = Array.isArray(data?.results)
          ? data.results
          : Array.isArray(data?.marks)
          ? data.marks
          : Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data)
          ? data
          : [];
        meta = data?.student ?? {};
      }

      setStudentInfo(meta);

      // Group by exam type
      const groups: Record<string, ExamGroup> = {};
      for (const r of results) {
        const examType = r.exam_type_name ?? r.exam_type ?? 'Term Exam';
        if (!groups[examType]) {
          groups[examType] = {
            exam_type: examType,
            subjects: [],
            total_obtained: 0,
            total_marks: 0,
            percentage: 0,
          };
        }
        const pct =
          r.percentage ??
          (r.total_marks > 0 ? Math.round((r.marks_obtained / r.total_marks) * 100) : 0);
        groups[examType].subjects.push({ ...r, percentage: pct });
        groups[examType].total_obtained += r.marks_obtained;
        groups[examType].total_marks += r.total_marks;
      }
      const groupArr = Object.values(groups).map(g => ({
        ...g,
        percentage: g.total_marks > 0 ? Math.round((g.total_obtained / g.total_marks) * 100) : 0,
      }));
      setExamGroups(groupArr);
    } catch (e: any) {
      setError(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isStudent, studentId, user]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const selectedIdx = parseInt(selectedExamKey, 10);
  const group = examGroups[selectedIdx] ?? examGroups[0];
  const overallPct = group?.percentage ?? 0;
  const overallGrade = getGrade(overallPct);
  const gradeInfo = GRADES[overallGrade as keyof typeof GRADES];

  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, padding: spacing.base }]}>
        <AppSkeleton variant="card" count={3} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <AppErrorState
          error={error}
          title="Report Card Unavailable"
          onRetry={load}
          style={{ flex: 1 }}
        />
      </View>
    );
  }

  if (examGroups.length === 0) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <AppEmptyState
          icon="award"
          title="No Published Results"
          description="Assessment scores and term report cards have not been published yet for this session."
          style={{ flex: 1 }}
        />
      </View>
    );
  }

  const examTabs = examGroups.map((g, i) => ({
    key: String(i),
    label: g.exam_type,
  }));

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Exam Term Tabs */}
      {examTabs.length > 1 && (
        <View style={[styles.tabsWrap, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <AppTabs
            tabs={examTabs}
            activeTab={selectedExamKey}
            onChangeTab={setSelectedExamKey}
            variant="segmented"
          />
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Overall Score Header Banner */}
        <LinearGradient
          colors={roleAccent.gradient}
          style={styles.banner}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.bannerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerSub}>Overall Assessment Score</Text>
              <Text style={styles.bannerTitle}>{group?.exam_type}</Text>
              {studentInfo?.name && (
                <Text style={styles.studentSub}>
                  {studentInfo.name} {studentInfo.standard ? `• Std ${studentInfo.standard}` : ''}
                </Text>
              )}
            </View>

            <View style={[styles.gradeCircle, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Text style={styles.gradeLetter}>{overallGrade}</Text>
              <Text style={styles.gradeLabel}>Grade</Text>
            </View>
          </View>

          <View style={styles.scoreBarWrap}>
            <View style={styles.scoreMetaRow}>
              <Text style={styles.scoreMetaText}>
                Total Marks: {group?.total_obtained} / {group?.total_marks}
              </Text>
              <Text style={styles.scoreMetaText}>
                Percentage: {formatPercentage(overallPct)}
              </Text>
            </View>
            <AppProgress
              value={overallPct}
              showPercentage={false}
              height={6}
              color="#ffffff"
            />
          </View>
        </LinearGradient>

        <View style={styles.body}>
          {/* Subject Marks Table Card */}
          <AppCard variant="bordered" padding={14}>
            <AppSectionHeader title="Subject Breakdown" icon="book-open" />

            <View style={styles.tableHeader}>
              <Text style={[styles.colHead, styles.colSubject, { color: colors.textSecondary }]}>Subject</Text>
              <Text style={[styles.colHead, styles.colMarks, { color: colors.textSecondary }]}>Marks</Text>
              <Text style={[styles.colHead, styles.colPct, { color: colors.textSecondary }]}>Percent</Text>
              <Text style={[styles.colHead, styles.colGrade, { color: colors.textSecondary }]}>Grade</Text>
            </View>

            {group?.subjects.map((sub, idx) => {
              const subName = sub.subject_name ?? sub.subject ?? `Subject ${idx + 1}`;
              const subPct = sub.percentage ?? 0;
              const subGrade = sub.grade ?? getGrade(subPct);
              const subGradeInfo = GRADES[subGrade as keyof typeof GRADES];

              return (
                <View
                  key={idx}
                  style={[styles.tableRow, { borderBottomColor: colors.divider }]}
                >
                  <Text style={[styles.colCell, styles.colSubject, { color: colors.text, fontWeight: '600' }]} numberOfLines={1}>
                    {subName}
                  </Text>
                  <Text style={[styles.colCell, styles.colMarks, { color: colors.text }]}>
                    {sub.marks_obtained}/{sub.total_marks}
                  </Text>
                  <Text style={[styles.colCell, styles.colPct, { color: colors.textSecondary }]}>
                    {formatPercentage(subPct)}
                  </Text>
                  <View style={styles.colGrade}>
                    <AppBadge
                      label={subGrade}
                      variant={subPct >= 35 ? 'success' : 'danger'}
                      size="sm"
                      rounded
                    />
                  </View>
                </View>
              );
            })}
          </AppCard>

          {/* Performance Assessment Summary */}
          <View style={styles.statsRow}>
            <AppStatCard
              label="Cumulative Score"
              value={`${group?.total_obtained} / ${group?.total_marks}`}
              icon="chart-bar"
              color={colors.primary}
            />
            <AppStatCard
              label="Overall Grade"
              value={overallGrade}
              subtitle={gradeInfo?.label ?? 'Satisfactory'}
              icon="award"
              color={gradeInfo?.color ?? colors.success}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  tabsWrap: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  scroll: {
    paddingBottom: spacing['3xl'],
  },
  banner: {
    padding: spacing.xl,
    paddingTop: Platform.OS === 'ios' ? 24 : spacing.xl,
    borderBottomLeftRadius: radius['2xl'],
    borderBottomRightRadius: radius['2xl'],
    ...shadows.md,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: typography.size.xs,
    textTransform: 'uppercase',
    fontWeight: typography.weight.bold,
  },
  bannerTitle: {
    color: '#ffffff',
    fontSize: typography.size.xl,
    fontWeight: typography.weight.extrabold,
    marginTop: 2,
  },
  studentSub: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: typography.size.xs,
    marginTop: 4,
  },
  gradeCircle: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  gradeLetter: {
    color: '#ffffff',
    fontSize: typography.size.xl,
    fontWeight: typography.weight.black,
  },
  gradeLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: typography.size['2xs'],
    fontWeight: typography.weight.bold,
    marginTop: -2,
  },
  scoreBarWrap: {
    marginTop: spacing.lg,
  },
  scoreMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  scoreMetaText: {
    color: '#ffffff',
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
  },
  body: {
    padding: spacing.base,
    gap: spacing.md,
    marginTop: -spacing.xs,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginTop: spacing.xs,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
  },
  colHead: {
    fontSize: typography.size['2xs'],
    fontWeight: typography.weight.bold,
    textTransform: 'uppercase',
  },
  colCell: {
    fontSize: typography.size.xs,
  },
  colSubject: {
    flex: 2.2,
  },
  colMarks: {
    flex: 1.2,
    textAlign: 'center',
  },
  colPct: {
    flex: 1.2,
    textAlign: 'center',
  },
  colGrade: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
