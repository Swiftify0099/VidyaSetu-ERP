/**
 * VidyaSetu Mobile — Exam Schedule Screen (Premium Redesign)
 * ============================================================
 * Comprehensive examination timetable management, schedule creation,
 * marks entry links, and status filters.
 */
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from '../../theme/ThemeContext';
import { examAPI } from '../../services/api';
import { spacing, radius, typography, shadows } from '../../theme';
import { formatDateLong, formatTime, today, getErrorMessage } from '../../utils/formatters';
import { CURRENT_ACADEMIC_YEAR, CLASSES, DIVISIONS } from '../../config/constants';
import {
  AppCard,
  AppBadge,
  AppButton,
  AppTabs,
  AppInput,
  AppSelect,
  AppDatePicker,
  AppBottomSheet,
  AppConfirmDialog,
  AppEmptyState,
  AppSkeleton,
} from '../../components/ui';
import Toast from 'react-native-toast-message';

interface ExamSchedule {
  id: number;
  exam_type_name: string;
  exam_type_id: number;
  subject_name: string;
  subject_id: number;
  standard: string;
  division: string;
  exam_date: string;
  start_time: string;
  end_time: string;
  total_marks: number;
  passing_marks: number;
  status: string;
}

interface ExamType {
  id: number;
  name: string;
}

const EMPTY_FORM = {
  exam_type_id: '1',
  subject_id: '1',
  standard: '8',
  division: 'A',
  exam_date: today(),
  start_time: '09:00',
  end_time: '11:00',
  total_marks: '100',
  passing_marks: '35',
  academic_year: CURRENT_ACADEMIC_YEAR,
};

const CLASS_OPTIONS = CLASSES.map(c => ({ label: `Standard ${c}`, value: c }));
const DIVISION_OPTIONS = DIVISIONS.map(d => ({ label: `Division ${d}`, value: d }));

export default function ExamScheduleScreen({ navigation }: { navigation: any }) {
  const { colors, roleAccent } = useTheme();
  const [schedules, setSchedules] = useState<ExamSchedule[]>([]);
  const [examTypes, setExamTypes] = useState<ExamType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [editId, setEditId] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'completed'>('all');

  // Deletion state
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [schRes, typesRes] = await Promise.allSettled([
        examAPI.getSchedules({ academic_year: CURRENT_ACADEMIC_YEAR }),
        examAPI.getExamTypes(),
      ]);
      if (schRes.status === 'fulfilled') {
        setSchedules(schRes.value.data?.data?.items ?? schRes.value.data?.data ?? []);
      }
      if (typesRes.status === 'fulfilled') {
        setExamTypes(typesRes.value.data?.data ?? []);
      }
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

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const save = async () => {
    if (!form.exam_date.trim()) {
      Toast.show({ type: 'error', text1: 'Exam date is required' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        exam_type_id: Number(form.exam_type_id),
        subject_id:   Number(form.subject_id),
        total_marks:  Number(form.total_marks),
        passing_marks: Number(form.passing_marks),
      };
      if (editId) {
        await examAPI.updateSchedule(editId, payload);
        Toast.show({ type: 'success', text1: 'Exam Schedule Updated' });
      } else {
        await examAPI.createSchedule(payload);
        Toast.show({ type: 'success', text1: 'Exam Scheduled Successfully' });
      }
      setShowForm(false);
      setForm({ ...EMPTY_FORM });
      setEditId(null);
      load();
    } catch (e: any) {
      Toast.show({ type: 'error', text1: getErrorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    setDeleting(true);
    try {
      await examAPI.deleteSchedule(deleteTargetId);
      Toast.show({ type: 'success', text1: 'Exam Schedule Deleted' });
      setDeleteTargetId(null);
      load();
    } catch (e) {
      Toast.show({ type: 'error', text1: getErrorMessage(e) });
    } finally {
      setDeleting(false);
    }
  };

  const openEdit = (exam: ExamSchedule) => {
    setForm({
      exam_type_id: String(exam.exam_type_id),
      subject_id:   String(exam.subject_id),
      standard:     exam.standard,
      division:     exam.division,
      exam_date:    exam.exam_date,
      start_time:   exam.start_time,
      end_time:     exam.end_time,
      total_marks:  String(exam.total_marks),
      passing_marks: String(exam.passing_marks),
      academic_year: CURRENT_ACADEMIC_YEAR,
    });
    setEditId(exam.id);
    setShowForm(true);
  };

  const filtered = useMemo(() => {
    if (filter === 'all') return schedules;
    return schedules.filter(s => s.status === filter);
  }, [schedules, filter]);

  const examTypeOptions = examTypes.length > 0
    ? examTypes.map(t => ({ label: t.name, value: String(t.id) }))
    : [
        { label: 'Unit Test 1', value: '1' },
        { label: 'Semester 1 Exam', value: '2' },
        { label: 'Unit Test 2', value: '3' },
        { label: 'Annual Examination', value: '4' },
      ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Filter Tabs */}
      <View style={[styles.tabsWrap, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <AppTabs
          tabs={[
            { key: 'all', label: 'All Exams', count: schedules.length },
            {
              key: 'scheduled',
              label: 'Scheduled',
              count: schedules.filter(s => s.status === 'scheduled').length,
            },
            {
              key: 'completed',
              label: 'Completed',
              count: schedules.filter(s => s.status === 'completed').length,
            },
          ]}
          activeTab={filter}
          onChangeTab={k => setFilter(k as any)}
          variant="segmented"
        />
      </View>

      {loading ? (
        <View style={{ padding: spacing.base }}>
          <AppSkeleton variant="card" count={4} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={{ padding: spacing.base, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={
            <AppEmptyState
              icon="calendar-alt"
              title="No Exam Schedules"
              description="No exams currently scheduled in this filter view."
              actionLabel="Schedule Exam"
              onAction={() => {
                setForm({ ...EMPTY_FORM });
                setEditId(null);
                setShowForm(true);
              }}
              style={{ flex: 1 }}
            />
          }
          renderItem={({ item }) => {
            const isCompleted = item.status === 'completed';
            return (
              <AppCard variant="bordered" padding={14}>
                <View style={{ gap: 8 }}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.subjectName, { color: colors.text }]}>
                        {item.subject_name || 'Academic Subject'}
                      </Text>
                      <Text style={[styles.examTypeName, { color: colors.primary, fontWeight: '600' }]}>
                        {item.exam_type_name}
                      </Text>
                    </View>
                    <AppBadge
                      label={isCompleted ? 'Completed' : 'Scheduled'}
                      variant={isCompleted ? 'success' : 'primary'}
                      size="sm"
                      rounded
                    />
                  </View>

                  {/* Standard & Date Meta */}
                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <Icon name="graduation-cap" size={11} color={colors.textTertiary} />
                      <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                        Std {item.standard}-{item.division}
                      </Text>
                    </View>

                    <View style={styles.metaItem}>
                      <Icon name="calendar-alt" size={11} color={colors.textTertiary} />
                      <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                        {formatDateLong(item.exam_date)}
                      </Text>
                    </View>

                    {item.start_time && (
                      <View style={styles.metaItem}>
                        <Icon name="clock" size={11} color={colors.textTertiary} />
                        <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                          {formatTime(item.start_time)} - {formatTime(item.end_time)}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Marks Capsule */}
                  <View style={[styles.marksStrip, { backgroundColor: colors.surfaceAlt }]}>
                    <Text style={[styles.marksText, { color: colors.textSecondary }]}>
                      Total Marks: <Text style={{ fontWeight: 'bold', color: colors.text }}>{item.total_marks}</Text>
                    </Text>
                    <Text style={[styles.marksText, { color: colors.textSecondary }]}>
                      Passing: <Text style={{ fontWeight: 'bold', color: colors.success }}>{item.passing_marks}</Text>
                    </Text>
                  </View>

                  {/* Actions */}
                  <View style={styles.actionsRow}>
                    <AppButton
                      label="Enter Marks"
                      iconLeft="pen"
                      variant="primary"
                      size="sm"
                      onPress={() =>
                        navigation?.navigate('MarksEntry', {
                          examId: item.id,
                          exam: item,
                        })
                      }
                    />

                    <TouchableOpacity
                      style={[styles.iconBtn, { backgroundColor: colors.surfaceAlt }]}
                      onPress={() => openEdit(item)}
                      activeOpacity={0.75}
                    >
                      <Icon name="edit" size={12} color={colors.primary} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.iconBtn, { backgroundColor: colors.dangerBg }]}
                      onPress={() => setDeleteTargetId(item.id)}
                      activeOpacity={0.75}
                    >
                      <Icon name="trash-alt" size={12} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              </AppCard>
            );
          }}
        />
      )}

      {/* Floating Create Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, ...shadows.lg }]}
        onPress={() => {
          setForm({ ...EMPTY_FORM });
          setEditId(null);
          setShowForm(true);
        }}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Schedule Exam"
      >
        <Icon name="plus" size={20} color="#fff" solid />
      </TouchableOpacity>

      {/* Create / Edit Schedule Bottom Sheet */}
      <AppBottomSheet
        visible={showForm}
        onClose={() => setShowForm(false)}
        title={editId ? 'Edit Exam Schedule' : 'Schedule New Exam'}
        subtitle="Configure date, standard and marks criteria"
      >
        <View style={{ gap: spacing.xs }}>
          <AppSelect
            label="Exam Type *"
            value={form.exam_type_id}
            options={examTypeOptions}
            onSelect={v => setForm(f => ({ ...f, exam_type_id: String(v) }))}
          />

          <View style={styles.formRow}>
            <View style={{ flex: 1 }}>
              <AppSelect
                label="Standard"
                value={form.standard}
                options={CLASS_OPTIONS}
                onSelect={v => setForm(f => ({ ...f, standard: String(v) }))}
              />
            </View>
            <View style={{ flex: 1 }}>
              <AppSelect
                label="Division"
                value={form.division}
                options={DIVISION_OPTIONS}
                onSelect={v => setForm(f => ({ ...f, division: String(v) }))}
              />
            </View>
          </View>

          <AppDatePicker
            label="Exam Date *"
            value={form.exam_date}
            onChangeDate={d => setForm(f => ({ ...f, exam_date: d }))}
          />

          <View style={styles.formRow}>
            <View style={{ flex: 1 }}>
              <AppInput
                label="Total Marks *"
                value={form.total_marks}
                onChangeText={v => setForm(f => ({ ...f, total_marks: v }))}
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1 }}>
              <AppInput
                label="Passing Marks *"
                value={form.passing_marks}
                onChangeText={v => setForm(f => ({ ...f, passing_marks: v }))}
                keyboardType="numeric"
              />
            </View>
          </View>

          <AppButton
            label={editId ? 'Save Changes' : 'Publish Schedule'}
            iconLeft="calendar-check"
            variant="primary"
            size="lg"
            onPress={save}
            loading={saving}
            fullWidth
            style={{ marginTop: spacing.md }}
          />
        </View>
      </AppBottomSheet>

      {/* Delete Confirmation Dialog */}
      <AppConfirmDialog
        visible={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={confirmDelete}
        title="Delete Exam Schedule"
        message="Are you sure you want to delete this scheduled exam? Existing recorded marks will be removed."
        confirmLabel="Delete Exam"
        variant="danger"
        loading={deleting}
      />
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  subjectName: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
  },
  examTypeName: {
    fontSize: typography.size.xs,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: typography.size.xs,
  },
  marksStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.md,
  },
  marksText: {
    fontSize: typography.size.xs,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 54,
    height: 54,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
