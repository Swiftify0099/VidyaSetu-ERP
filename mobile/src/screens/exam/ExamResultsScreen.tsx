/**
 * VidyaSetu Mobile — Exam Results Screen (Premium Redesign)
 * ==========================================================
 * Assessment scorecards with letter grades, percentage indicators,
 * filter chips, and search filtering.
 */
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from '../../theme/ThemeContext';
import { examAPI } from '../../services/api';
import { spacing, radius, typography, shadows } from '../../theme';
import { getGrade, GRADES, CURRENT_ACADEMIC_YEAR } from '../../config/constants';
import { formatDateLong, formatPercentage } from '../../utils/formatters';
import {
  AppCard,
  AppBadge,
  AppChip,
  AppSearchBar,
  AppEmptyState,
  AppSkeleton,
} from '../../components/ui';

interface Result {
  id: number;
  student_name: string;
  gr_number: string;
  subject_name: string;
  exam_type_name: string;
  marks_obtained: number | null;
  total_marks: number;
  passing_marks: number;
  is_absent: boolean;
  percentage: number | null;
  grade: string | null;
  exam_date: string;
}

export default function ExamResultsScreen({ navigation }: { navigation: any }) {
  const { colors } = useTheme();
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filterGrade, setFilterGrade] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await examAPI.getResults({ academic_year: CURRENT_ACADEMIC_YEAR });
      setResults(res.data?.data?.items ?? res.data?.data ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    return results.filter(r => {
      const matchSearch =
        !search ||
        r.student_name.toLowerCase().includes(search.toLowerCase()) ||
        r.gr_number.includes(search) ||
        r.subject_name.toLowerCase().includes(search.toLowerCase());
      const matchGrade = !filterGrade || r.grade === filterGrade;
      return matchSearch && matchGrade;
    });
  }, [results, search, filterGrade]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Top Search & Grade Filters */}
      <View style={[styles.topBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <AppSearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search by student, GR or subject..."
          style={{ marginVertical: 0 }}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.xs, paddingTop: spacing.xs }}
        >
          <AppChip
            label="All Grades"
            selected={filterGrade === null}
            onPress={() => setFilterGrade(null)}
          />
          {Object.keys(GRADES).map(g => (
            <AppChip
              key={g}
              label={g}
              selected={filterGrade === g}
              onPress={() => setFilterGrade(filterGrade === g ? null : g)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Main Results List */}
      {loading ? (
        <View style={{ padding: spacing.base }}>
          <AppSkeleton variant="list" count={6} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={r => String(r.id)}
          contentContainerStyle={{ padding: spacing.base, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={
            <AppEmptyState
              icon="award"
              title="No Results Found"
              description="No assessment results matching your current filters."
              style={{ flex: 1 }}
            />
          }
          renderItem={({ item }) => {
            const pct =
              item.percentage ??
              (item.marks_obtained != null ? (item.marks_obtained / item.total_marks) * 100 : null);
            const grade = item.grade ?? (pct != null ? getGrade(pct) : null);
            const passed =
              item.marks_obtained != null ? item.marks_obtained >= item.passing_marks : false;

            const gradeColor =
              grade && GRADES[grade as keyof typeof GRADES]?.color
                ? GRADES[grade as keyof typeof GRADES].color
                : colors.primary;

            return (
              <AppCard variant="bordered" padding={12}>
                <View style={styles.resultRow}>
                  {/* Grade Pill Badge */}
                  <View
                    style={[
                      styles.gradeBadge,
                      {
                        backgroundColor: item.is_absent ? colors.dangerBg : `${gradeColor}18`,
                        borderColor: item.is_absent ? colors.danger : gradeColor,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.gradeLetter,
                        { color: item.is_absent ? colors.danger : gradeColor },
                      ]}
                    >
                      {item.is_absent ? 'AB' : grade ?? '—'}
                    </Text>
                  </View>

                  {/* Student & Subject Details */}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.studentName, { color: colors.text }]} numberOfLines={1}>
                      {item.student_name}
                    </Text>
                    <Text style={[styles.subjectName, { color: colors.textSecondary }]}>
                      {item.subject_name} • {item.exam_type_name}
                    </Text>
                    <Text style={[styles.examDate, { color: colors.textTertiary }]}>
                      {formatDateLong(item.exam_date)}
                    </Text>
                  </View>

                  {/* Marks & Status */}
                  <View style={styles.scoreCol}>
                    {item.is_absent ? (
                      <AppBadge label="Absent" variant="danger" size="sm" rounded />
                    ) : (
                      <>
                        <Text style={[styles.scoreValue, { color: passed ? colors.success : colors.danger }]}>
                          {item.marks_obtained ?? '—'}
                          <Text style={[styles.scoreMax, { color: colors.textTertiary }]}>
                            /{item.total_marks}
                          </Text>
                        </Text>
                        <Text style={[styles.pctText, { color: colors.textSecondary }]}>
                          {pct != null ? formatPercentage(pct) : '—'}
                        </Text>
                      </>
                    )}
                  </View>
                </View>
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
  topBar: {
    padding: spacing.base,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  gradeBadge: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  gradeLetter: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.extrabold,
  },
  studentName: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
  },
  subjectName: {
    fontSize: typography.size.xs,
    marginTop: 2,
  },
  examDate: {
    fontSize: typography.size['2xs'],
    marginTop: 2,
  },
  scoreCol: {
    alignItems: 'flex-end',
  },
  scoreValue: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.extrabold,
  },
  scoreMax: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
  },
  pctText: {
    fontSize: typography.size['2xs'],
    marginTop: 2,
  },
});
