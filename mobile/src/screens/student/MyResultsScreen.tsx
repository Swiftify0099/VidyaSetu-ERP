/**
 * VidyaSetu Mobile — My Results Screen (Student Portal - Premium Redesign)
 * =========================================================================
 * Detailed examination marksheets, class rank, subject breakdowns & letter grades.
 */
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from '../../theme/ThemeContext';
import { studentPortalAPI } from '../../services/api';
import { spacing, radius, typography, shadows } from '../../theme';
import { formatDateLong } from '../../utils/formatters';
import {
  AppCard,
  AppBadge,
  AppProgress,
  AppEmptyState,
  AppSkeleton,
} from '../../components/ui';

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
  const { colors, roleAccent } = useTheme();
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedExam, setExpandedExam] = useState<number | null>(null);
  const [overallPerc, setOverallPerc] = useState<number>(0);

  const load = useCallback(async () => {
    try {
      const res = await studentPortalAPI.getMyResults();
      const data = res.data?.data;
      const list: ExamResult[] = Array.isArray(data?.results)
        ? data.results
        : Array.isArray(data)
        ? data
        : [];

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

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Overall Cumulative Banner */}
      <LinearGradient
        colors={roleAccent.gradient}
        style={[styles.banner, { paddingTop: Platform.OS === 'ios' ? 24 : spacing.xl }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.bannerTitle}>Academic Evaluation & Marksheets</Text>
        <Text style={styles.bannerSub}>Cumulative Examination Performance</Text>

        <View style={styles.overallBadge}>
          <Text style={styles.overallValue}>{overallPerc > 0 ? `${overallPerc}%` : '—'}</Text>
          <Text style={styles.overallLabel}>Average Score</Text>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={{ padding: spacing.base }}>
          <AppSkeleton variant="card" count={3} />
        </View>
      ) : (
        <FlatList
          data={examResults}
          keyExtractor={item => String(item.exam_id)}
          contentContainerStyle={{ padding: spacing.base, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={roleAccent.primary}
              colors={[roleAccent.primary]}
            />
          }
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <AppEmptyState
              icon="file-signature"
              title="No Results Declared"
              description="No assessment reports or terminal exam marks published yet."
              style={{ flex: 1 }}
            />
          }
          renderItem={({ item }) => {
            const isExpanded = expandedExam === item.exam_id;
            const gradeColor = GRADE_COLOR[item.grade || 'A1'] ?? colors.primary;
            const perc = Math.round(item.percentage || 0);

            return (
              <AppCard variant="bordered" padding={0}>
                {/* Exam Header */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setExpandedExam(isExpanded ? null : item.exam_id)}
                  style={styles.cardHeader}
                >
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={styles.titleRow}>
                      <Text style={[styles.examTitle, { color: colors.text }]}>{item.exam_type}</Text>
                      {item.rank != null && (
                        <View style={[styles.rankPill, { backgroundColor: '#fef3c7' }]}>
                          <Icon name="trophy" size={9} color="#d97706" solid />
                          <Text style={styles.rankText}>Rank #{item.rank}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.examSub, { color: colors.textSecondary }]}>
                      Std {item.standard}
                      {item.division ? `-${item.division}` : ''} •{' '}
                      {item.result_date ? formatDateLong(item.result_date) : 'Declared'}
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <AppBadge
                      label={item.grade || 'PASS'}
                      variant={item.all_pass ? 'success' : 'danger'}
                      size="md"
                      rounded
                    />
                    <Text style={[styles.examPerc, { color: colors.text }]}>
                      {item.total_marks} / {item.total_max} ({perc}%)
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Expanded Subject Breakdown */}
                {isExpanded && (
                  <View style={[styles.breakdownWrap, { borderTopColor: colors.border, backgroundColor: colors.surfaceAlt }]}>
                    <View style={styles.tableHeader}>
                      <Text style={[styles.colHead, { flex: 2, color: colors.textTertiary }]}>Subject</Text>
                      <Text style={[styles.colHead, { flex: 1, textAlign: 'center', color: colors.textTertiary }]}>
                        Marks
                      </Text>
                      <Text style={[styles.colHead, { flex: 1, textAlign: 'right', color: colors.textTertiary }]}>
                        Grade
                      </Text>
                    </View>

                    {item.subjects?.map((s, idx) => {
                      const sGradeColor = GRADE_COLOR[s.grade || 'B1'] ?? colors.text;
                      return (
                        <View
                          key={idx}
                          style={[
                            styles.subjectRow,
                            idx < item.subjects.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
                          ]}
                        >
                          <View style={{ flex: 2 }}>
                            <Text style={[styles.subjectName, { color: colors.text }]}>{s.subject}</Text>
                            {s.is_absent && (
                              <Text style={[styles.absentLabel, { color: colors.danger }]}>ABSENT</Text>
                            )}
                          </View>

                          <View style={{ flex: 1, alignItems: 'center' }}>
                            <Text style={[styles.subjectMarks, { color: colors.text }]}>
                              {s.is_absent ? '—' : `${s.marks_obtained}/${s.max_marks}`}
                            </Text>
                          </View>

                          <View style={{ flex: 1, alignItems: 'flex-end' }}>
                            <Text style={[styles.subjectGrade, { color: sGradeColor }]}>
                              {s.grade || (s.is_pass ? 'P' : 'F')}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </AppCard>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  banner: {
    padding: spacing.xl,
    borderBottomLeftRadius: radius['2xl'],
    borderBottomRightRadius: radius['2xl'],
    alignItems: 'center',
    ...shadows.md,
  },
  bannerTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: '#ffffff',
  },
  bannerSub: {
    fontSize: typography.size.xs,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  overallBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radius.xl,
    marginTop: spacing.md,
  },
  overallValue: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.extrabold,
    color: '#ffffff',
  },
  overallLabel: {
    fontSize: typography.size['2xs'],
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.base,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  examTitle: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
  },
  rankPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  rankText: {
    fontSize: typography.size['2xs'],
    fontWeight: typography.weight.bold,
    color: '#d97706',
  },
  examSub: {
    fontSize: typography.size.xs,
  },
  examPerc: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
  },
  breakdownWrap: {
    borderTopWidth: 1,
    padding: spacing.md,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 6,
  },
  colHead: {
    fontSize: typography.size['2xs'],
    fontWeight: typography.weight.bold,
    textTransform: 'uppercase',
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  subjectName: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
  },
  absentLabel: {
    fontSize: typography.size['2xs'],
    fontWeight: typography.weight.bold,
  },
  subjectMarks: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
  },
  subjectGrade: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.extrabold,
  },
});
