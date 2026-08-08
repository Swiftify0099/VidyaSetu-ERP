/**
 * VidyaSetu Mobile — Exam Results Screen
 * View results with grade calculations.
 * Accessible to: admin, principal, teacher, student (own), parent (child)
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl, ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from '../../theme/ThemeContext';
import { examAPI } from '../../services/api';
import { spacing, radius, typography, shadows } from '../../theme';
import { getGrade, GRADES, CURRENT_ACADEMIC_YEAR } from '../../config/constants';
import { formatDateLong, formatPercentage } from '../../utils/formatters';
import Badge from '../../components/ui/Badge';
import SectionHeader from '../../components/ui/SectionHeader';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import PremiumCard from '../../components/ui/PremiumCard';

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
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = results.filter(r => {
    const matchSearch = !search || r.student_name.toLowerCase().includes(search.toLowerCase()) ||
      r.gr_number.includes(search) || r.subject_name.toLowerCase().includes(search.toLowerCase());
    const matchGrade = !filterGrade || r.grade === filterGrade;
    return matchSearch && matchGrade;
  });

  function badgeVariant(grade: string | null): any {
    if (!grade) return 'default';
    if (['A+', 'A'].includes(grade)) return 'success';
    if (['B+', 'B'].includes(grade)) return 'primary';
    if (grade === 'C') return 'warning';
    return 'danger';
  }

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      {/* Search */}
      <View style={[s.searchWrap, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[s.searchBox, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
          <Icon name="search" size={14} color={colors.textTertiary} />
          <TextInput
            style={[s.searchInput, { color: colors.text }]}
            value={search}
            onChangeText={setSearch}
            placeholder="Search by student, GR or subject..."
            placeholderTextColor={colors.placeholder}
          />
        </View>
      </View>

      {/* Grade Filter */}
      <View style={[s.gradeFilter, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[s.gradeChip, !filterGrade && { backgroundColor: colors.primary }]}
          onPress={() => setFilterGrade(null)}
        >
          <Text style={[s.gradeChipText, !filterGrade && { color: '#fff' }]}>All</Text>
        </TouchableOpacity>
        {Object.keys(GRADES).map(g => (
          <TouchableOpacity
            key={g}
            style={[s.gradeChip, filterGrade === g && { backgroundColor: GRADES[g as keyof typeof GRADES].color }]}
            onPress={() => setFilterGrade(filterGrade === g ? null : g)}
          >
            <Text style={[s.gradeChipText, filterGrade === g && { color: '#fff' }]}>{g}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={{ padding: spacing.base }}>
          <SkeletonLoader variant="list" count={6} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={r => String(r.id)}
          contentContainerStyle={{ padding: spacing.base, paddingBottom: 30 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} colors={[colors.primary]} />}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => {
            const pct = item.percentage ?? (item.marks_obtained != null ? (item.marks_obtained / item.total_marks) * 100 : null);
            const grade = item.grade ?? (pct != null ? getGrade(pct) : null);
            const passed = item.marks_obtained != null ? item.marks_obtained >= item.passing_marks : false;

            return (
              <PremiumCard variant="bordered" padding={12}>
                <View style={s.resultRow}>
                  <View style={[
                    s.gradeBadge,
                    { backgroundColor: grade ? GRADES[grade as keyof typeof GRADES]?.color ?? colors.primaryBg : colors.surfaceAlt },
                  ]}>
                    <Text style={s.gradeLetter}>{item.is_absent ? 'AB' : grade ?? '—'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.studentName, { color: colors.text }]} numberOfLines={1}>
                      {item.student_name}
                    </Text>
                    <Text style={[s.subjectName, { color: colors.textSecondary }]}>
                      {item.subject_name} • {item.exam_type_name}
                    </Text>
                    <Text style={[s.examDate, { color: colors.textTertiary }]}>
                      {formatDateLong(item.exam_date)}
                    </Text>
                  </View>
                  <View style={s.rightCol}>
                    {item.is_absent ? (
                      <Text style={[s.marksText, { color: colors.danger }]}>Absent</Text>
                    ) : (
                      <>
                        <Text style={[s.marksText, { color: passed ? colors.success : colors.danger }]}>
                          {item.marks_obtained ?? '—'}/{item.total_marks}
                        </Text>
                        {pct != null && (
                          <Text style={[s.pct, { color: colors.textSecondary }]}>
                            {formatPercentage(pct)}
                          </Text>
                        )}
                        <Badge
                          label={passed ? 'Pass' : 'Fail'}
                          variant={passed ? 'success' : 'danger'}
                          size="sm"
                          rounded
                        />
                      </>
                    )}
                  </View>
                </View>
              </PremiumCard>
            );
          }}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyIcon}>📊</Text>
              <Text style={[s.emptyText, { color: colors.textSecondary }]}>No results found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  searchWrap: { padding: spacing.sm, borderBottomWidth: 1 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: 12, height: 40,
  },
  searchInput: { flex: 1, fontSize: typography.size.base },
  gradeFilter: {
    flexDirection: 'row', paddingHorizontal: spacing.sm, paddingVertical: 8,
    gap: 6, borderBottomWidth: 1,
  },
  gradeChip: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.full,
    backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb',
  },
  gradeChipText: { fontSize: typography.size.xs, fontWeight: typography.weight.bold, color: '#6b7280' },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  gradeBadge: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  gradeLetter: { color: '#fff', fontSize: typography.size.sm, fontWeight: typography.weight.black },
  studentName: { fontSize: typography.size.base, fontWeight: typography.weight.bold },
  subjectName: { fontSize: typography.size.sm, marginTop: 1 },
  examDate: { fontSize: typography.size.xs, marginTop: 2 },
  rightCol: { alignItems: 'flex-end', gap: 3 },
  marksText: { fontSize: typography.size.md, fontWeight: typography.weight.bold },
  pct: { fontSize: typography.size.xs },
  empty: { alignItems: 'center', padding: spacing.xl },
  emptyIcon: { fontSize: 44, marginBottom: 12 },
  emptyText: { fontSize: typography.size.base },
});
