/**
 * VidyaSetu Mobile — Marks Entry Screen (Teacher Portal - Premium Redesign)
 * =========================================================================
 * Fast grid entry for exam subject marks, absent toggle, grade evaluation and bulk saving.
 */
import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from '../../theme/ThemeContext';
import { api, examAPI } from '../../services/api';
import { spacing, radius, typography, shadows } from '../../theme';
import { getErrorMessage } from '../../utils/formatters';
import { CLASSES, DIVISIONS, CURRENT_ACADEMIC_YEAR } from '../../config/constants';
import {
  AppCard,
  AppBadge,
  AppChip,
  AppButton,
  AppSelect,
  AppEmptyState,
  AppSkeleton,
} from '../../components/ui';
import Toast from 'react-native-toast-message';

interface Student {
  id: number;
  full_name: string;
  gr_number: string;
  marks?: string;
}

interface Exam {
  id: number;
  name: string;
  subject_name?: string;
  subject?: string;
  max_marks?: number;
  total_marks?: number;
  passing_marks?: number;
}

const CLASS_OPTIONS = CLASSES.map(c => ({ label: `Standard ${c}`, value: c }));
const DIVISION_OPTIONS = DIVISIONS.map(d => ({ label: `Division ${d}`, value: d }));

export default function TeacherMarksEntryScreen() {
  const { colors, roleAccent } = useTheme();
  const [standard, setStandard] = useState('8');
  const [division, setDivision] = useState('A');
  const [exam, setExam] = useState<Exam | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [marks, setMarks] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadExams = useCallback(async () => {
    try {
      const res = await examAPI.getSchedules({ standard, academic_year: CURRENT_ACADEMIC_YEAR });
      const items = res.data?.data?.items ?? res.data?.data ?? [];
      setExams(items);
      if (items.length > 0) {
        setExam(items[0]);
      } else {
        setExam(null);
      }
    } catch {
      setExams([]);
    }
  }, [standard]);

  const loadStudents = useCallback(async () => {
    if (!exam) return;
    setLoading(true);
    try {
      const res = await api.get('/students', {
        params: { standard, division, academic_year: CURRENT_ACADEMIC_YEAR, per_page: 60 },
      });
      const items = res.data?.data?.items ?? res.data?.data ?? [];
      setStudents(items);
    } catch {
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [exam, standard, division]);

  const fetchAll = () => {
    loadExams();
    loadStudents();
  };

  const maxScore = exam?.max_marks ?? exam?.total_marks ?? 100;

  const saveMarks = async () => {
    if (!exam || students.length === 0) return;
    setSaving(true);
    try {
      const payload = students.map(s => ({
        student_id: s.id,
        exam_id: exam.id,
        marks_obtained: marks[s.id] === 'AB' ? 0 : Number(marks[s.id] ?? 0),
        is_absent: marks[s.id] === 'AB',
      }));
      await examAPI.submitMarks(exam.id, { marks: payload });
      Toast.show({ type: 'success', text1: 'Marks saved successfully!' });
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Failed to save marks', text2: getErrorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  const toggleAbsent = (studentId: number) => {
    setMarks(prev => ({
      ...prev,
      [studentId]: prev[studentId] === 'AB' ? '' : 'AB',
    }));
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Top Filter Selection */}
      <View style={[styles.filterBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.filterRow}>
          <View style={{ flex: 1 }}>
            <AppSelect
              label="Standard"
              value={standard}
              options={CLASS_OPTIONS}
              onSelect={v => setStandard(String(v))}
            />
          </View>
          <View style={{ flex: 1 }}>
            <AppSelect
              label="Division"
              value={division}
              options={DIVISION_OPTIONS}
              onSelect={v => setDivision(String(v))}
            />
          </View>
        </View>

        <AppButton
          label="Load Roster"
          iconLeft="search"
          variant="primary"
          size="md"
          onPress={fetchAll}
          fullWidth
          style={{ marginTop: spacing.xs }}
        />
      </View>

      {/* Exam Schedule Chips */}
      {exams.length > 0 && (
        <View style={[styles.examChipsBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing.xs }}
          >
            {exams.map(e => (
              <AppChip
                key={e.id}
                label={e.name ?? e.subject_name ?? 'Exam'}
                selected={exam?.id === e.id}
                onPress={() => setExam(e)}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Student Marks List */}
      {loading ? (
        <View style={{ padding: spacing.base }}>
          <AppSkeleton variant="list" count={6} />
        </View>
      ) : (
        <FlatList
          data={students}
          keyExtractor={i => String(i.id)}
          contentContainerStyle={{ padding: spacing.base, paddingBottom: 120 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={
            <AppEmptyState
              icon="pen"
              title="Select Class & Load"
              description="Choose standard and division above, then tap 'Load Roster' to enter marks."
              style={{ flex: 1 }}
            />
          }
          renderItem={({ item, index }) => {
            const isAbsent = marks[item.id] === 'AB';
            const val = marks[item.id] ?? '';

            return (
              <AppCard variant="bordered" padding={12}>
                <View style={styles.studentRow}>
                  <Text style={[styles.indexNum, { color: colors.textTertiary }]}>
                    #{index + 1}
                  </Text>

                  <View style={{ flex: 1 }}>
                    <Text style={[styles.studentName, { color: colors.text }]}>
                      {item.full_name}
                    </Text>
                    <Text style={[styles.grNum, { color: colors.textSecondary }]}>
                      GR: {item.gr_number}
                    </Text>
                  </View>

                  {/* Absent Toggle Button */}
                  <TouchableOpacity
                    style={[
                      styles.abBtn,
                      {
                        backgroundColor: isAbsent ? colors.danger : colors.surfaceAlt,
                        borderColor: isAbsent ? colors.danger : colors.border,
                      },
                    ]}
                    onPress={() => toggleAbsent(item.id)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.abText,
                        { color: isAbsent ? '#ffffff' : colors.textSecondary },
                      ]}
                    >
                      AB
                    </Text>
                  </TouchableOpacity>

                  {/* Marks Input */}
                  <View style={[styles.inputBox, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                    <TextInput
                      style={[styles.input, { color: isAbsent ? colors.danger : colors.text }]}
                      value={isAbsent ? 'AB' : val}
                      onChangeText={t => {
                        if (!isAbsent) {
                          setMarks(prev => ({ ...prev, [item.id]: t }));
                        }
                      }}
                      placeholder={`/${maxScore}`}
                      placeholderTextColor={colors.textTertiary}
                      keyboardType="numeric"
                      maxLength={3}
                      editable={!isAbsent}
                    />
                  </View>
                </View>
              </AppCard>
            );
          }}
        />
      )}

      {/* Floating Save Button */}
      {students.length > 0 && (
        <View style={[styles.bottomSaveBar, { backgroundColor: colors.surface, borderTopColor: colors.border, ...shadows.lg }]}>
          <AppButton
            label="Save All Marks"
            iconLeft="save"
            variant="primary"
            size="lg"
            onPress={saveMarks}
            loading={saving}
            fullWidth
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  filterBar: {
    padding: spacing.base,
    borderBottomWidth: 1,
    gap: spacing.xs,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  examChipsBar: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  indexNum: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    width: 24,
  },
  studentName: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
  },
  grNum: {
    fontSize: typography.size.xs,
    marginTop: 2,
  },
  abBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  abText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
  },
  inputBox: {
    width: 64,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    textAlign: 'center',
    width: '100%',
    height: '100%',
    padding: 0,
  },
  bottomSaveBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.base,
    borderTopWidth: 1,
  },
});
