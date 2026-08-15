/**
 * VidyaSetu Mobile — Marks Entry Screen (Premium Redesign)
 * ==========================================================
 * Interactive assessment score entry with realtime grade computation,
 * absent toggling, score validation against max limits, and bulk saving.
 */
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from '../../theme/ThemeContext';
import { examAPI } from '../../services/api';
import { spacing, radius, typography, shadows } from '../../theme';
import { getGrade } from '../../config/constants';
import {
  AppCard,
  AppButton,
  AppBadge,
  AppProgress,
  AppEmptyState,
  AppSkeleton,
  AppSearchBar,
} from '../../components/ui';
import Toast from 'react-native-toast-message';
import { getErrorMessage } from '../../utils/formatters';

interface StudentMark {
  student_id: number;
  full_name: string;
  gr_number: string;
  roll_number: number;
  marks_obtained: string;
  is_absent: boolean;
}

export default function MarksEntryScreen({
  route,
  navigation,
}: {
  route: any;
  navigation: any;
}) {
  const { colors } = useTheme();
  const { examId, exam } = route.params ?? {};
  const [students, setStudents] = useState<StudentMark[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const maxMarks = exam?.total_marks ?? 100;
  const passingMarks = exam?.passing_marks ?? 35;

  const fetchMarks = useCallback(async () => {
    if (!examId) {
      setLoading(false);
      return;
    }
    try {
      const res = await examAPI.getMarks(examId, {});
      const data = res.data?.data ?? [];
      setStudents(
        data.map((s: any) => ({
          ...s,
          marks_obtained: s.marks_obtained != null ? String(s.marks_obtained) : '',
          is_absent: s.is_absent ?? false,
        }))
      );
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Failed to load student marks', text2: getErrorMessage(e) });
    } finally {
      setLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    fetchMarks();
  }, [fetchMarks]);

  const updateMark = (studentId: number, value: string) => {
    // Only allow numbers and decimal
    const clean = value.replace(/[^0-9.]/g, '');
    setStudents(prev =>
      prev.map(s =>
        s.student_id === studentId ? { ...s, marks_obtained: clean, is_absent: false } : s
      )
    );
  };

  const toggleAbsent = (studentId: number) => {
    setStudents(prev =>
      prev.map(s =>
        s.student_id === studentId
          ? {
              ...s,
              is_absent: !s.is_absent,
              marks_obtained: !s.is_absent ? '' : s.marks_obtained,
            }
          : s
      )
    );
  };

  const saveMarks = async () => {
    const invalids = students.filter(
      s =>
        !s.is_absent &&
        s.marks_obtained !== '' &&
        (isNaN(Number(s.marks_obtained)) ||
          Number(s.marks_obtained) < 0 ||
          Number(s.marks_obtained) > maxMarks)
    );
    if (invalids.length > 0) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: `Scores must be between 0 and ${maxMarks}. Check highlighted rows.`,
      });
      return;
    }
    setSaving(true);
    try {
      const records = students.map(s => ({
        student_id: s.student_id,
        marks_obtained: s.is_absent
          ? null
          : s.marks_obtained === ''
          ? null
          : Number(s.marks_obtained),
        is_absent: s.is_absent,
      }));
      await examAPI.submitMarks(examId, { marks: records });
      Toast.show({
        type: 'success',
        text1: 'Marks Recorded Successfully!',
        text2: `${students.length} student scores synchronized`,
      });
      navigation.goBack();
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Failed to save marks', text2: getErrorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = useMemo(() => {
    if (!search.trim()) return students;
    const q = search.toLowerCase();
    return students.filter(
      s =>
        s.full_name.toLowerCase().includes(q) ||
        s.gr_number.includes(q) ||
        String(s.roll_number).includes(q)
    );
  }, [students, search]);

  const enteredCount = students.filter(s => !s.is_absent && s.marks_obtained !== '').length;
  const absentCount  = students.filter(s => s.is_absent).length;
  const completionPct = students.length > 0 ? ((enteredCount + absentCount) / students.length) * 100 : 0;

  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, padding: spacing.base }]}>
        <AppSkeleton variant="list" count={6} />
      </View>
    );
  }

  if (!examId) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <AppEmptyState
          icon="clipboard-list"
          title="No Exam Selected"
          description="Please navigate from an active exam schedule to enter student marks."
          actionLabel="Go Back"
          onAction={() => navigation.goBack()}
          style={{ flex: 1 }}
        />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Exam Header Information Card */}
      {exam && (
        <View style={[styles.examHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={styles.examTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.examTitle, { color: colors.text }]}>{exam.subject_name}</Text>
              <Text style={[styles.examMeta, { color: colors.textSecondary }]}>
                {exam.exam_type_name} • Std {exam.standard}-{exam.division}
              </Text>
            </View>
            <View style={styles.marksCapsule}>
              <Text style={[styles.capsuleLabel, { color: colors.textSecondary }]}>Max: {maxMarks}</Text>
              <Text style={[styles.capsuleLabel, { color: colors.success }]}>Pass: {passingMarks}</Text>
            </View>
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Icon name="check" size={10} color={colors.success} solid />
              <Text style={[styles.metricText, { color: colors.success }]}>Entered: {enteredCount}</Text>
            </View>
            <View style={styles.metricItem}>
              <Icon name="user-slash" size={10} color={colors.danger} solid />
              <Text style={[styles.metricText, { color: colors.danger }]}>Absent: {absentCount}</Text>
            </View>
            <View style={styles.metricItem}>
              <Icon name="users" size={10} color={colors.textSecondary} solid />
              <Text style={[styles.metricText, { color: colors.textSecondary }]}>Total: {students.length}</Text>
            </View>
          </View>

          <AppProgress
            value={completionPct}
            showPercentage={false}
            height={4}
            color={colors.primary}
            style={{ marginTop: spacing.xs }}
          />

          <AppSearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Filter roster by student name or roll..."
            style={{ marginVertical: 0, marginTop: spacing.sm }}
          />
        </View>
      )}

      {/* Marks Entry Roster */}
      <FlatList
        data={filteredStudents}
        keyExtractor={item => String(item.student_id)}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => {
          const valNum = Number(item.marks_obtained);
          const hasScore = !item.is_absent && item.marks_obtained !== '' && !isNaN(valNum);
          const isInvalid = hasScore && (valNum < 0 || valNum > maxMarks);
          const isPass = hasScore && valNum >= passingMarks;
          const letterGrade = hasScore && !isInvalid ? getGrade((valNum / maxMarks) * 100) : null;

          return (
            <AppCard
              variant="bordered"
              padding={12}
              style={[
                isInvalid && { borderColor: colors.danger, borderWidth: 1.5 },
              ]}
            >
              <View style={styles.row}>
                {/* Roll Number Circle */}
                <View style={[styles.rollCircle, { backgroundColor: colors.primaryBg }]}>
                  <Text style={[styles.rollNum, { color: colors.primary }]}>{item.roll_number}</Text>
                </View>

                {/* Student Identity */}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                    {item.full_name}
                  </Text>
                  <Text style={[styles.gr, { color: colors.textSecondary }]}>GR: {item.gr_number}</Text>
                </View>

                {/* Grade Preview Badge */}
                {letterGrade && (
                  <AppBadge
                    label={letterGrade}
                    variant={isPass ? 'success' : 'danger'}
                    size="sm"
                    rounded
                    style={{ marginRight: spacing.xs }}
                  />
                )}

                {/* Absent Pill Toggle */}
                <TouchableOpacity
                  style={[
                    styles.absentBtn,
                    item.is_absent
                      ? { backgroundColor: colors.dangerBg, borderColor: colors.danger }
                      : { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
                  ]}
                  onPress={() => toggleAbsent(item.student_id)}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.absentText,
                      { color: item.is_absent ? colors.danger : colors.textSecondary },
                    ]}
                  >
                    AB
                  </Text>
                </TouchableOpacity>

                {/* Score Input */}
                <View
                  style={[
                    styles.inputWrap,
                    {
                      backgroundColor: item.is_absent ? colors.surfaceAlt : colors.inputBg,
                      borderColor: isInvalid ? colors.danger : colors.inputBorder,
                    },
                  ]}
                >
                  <TextInput
                    style={[
                      styles.scoreInput,
                      { color: item.is_absent ? colors.textTertiary : colors.text },
                    ]}
                    value={item.is_absent ? '—' : item.marks_obtained}
                    onChangeText={v => updateMark(item.student_id, v)}
                    placeholder="0"
                    placeholderTextColor={colors.placeholder}
                    keyboardType="numeric"
                    editable={!item.is_absent}
                    maxLength={5}
                  />
                </View>
              </View>
            </AppCard>
          );
        }}
      />

      {/* Floating Save Footer */}
      <View
        style={[
          styles.saveWrap,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            ...shadows.lg,
          },
        ]}
      >
        <AppButton
          label={`Save Scores (${enteredCount} Entered)`}
          iconLeft="save"
          variant="primary"
          size="lg"
          onPress={saveMarks}
          loading={saving}
          fullWidth
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  examHeader: {
    padding: spacing.base,
    borderBottomWidth: 1,
    gap: spacing.xs,
  },
  examTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  examTitle: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.extrabold,
  },
  examMeta: {
    fontSize: typography.size.xs,
    marginTop: 2,
  },
  marksCapsule: {
    alignItems: 'flex-end',
  },
  capsuleLabel: {
    fontSize: typography.size['2xs'],
    fontWeight: typography.weight.bold,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
  },
  list: {
    padding: spacing.base,
    paddingBottom: 100,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rollCircle: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rollNum: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
  },
  name: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
  },
  gr: {
    fontSize: typography.size['2xs'],
    marginTop: 1,
  },
  absentBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  absentText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.extrabold,
  },
  inputWrap: {
    width: 64,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreInput: {
    width: '100%',
    height: '100%',
    textAlign: 'center',
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    padding: 0,
  },
  saveWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.base,
    borderTopWidth: 1,
  },
});
