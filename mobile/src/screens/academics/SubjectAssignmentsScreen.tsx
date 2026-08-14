/**
 * VidyaSetu Mobile — Subject Assignments & Academics Hub (Premium Redesign)
 * =========================================================================
 * Teacher-to-subject and class allocation matrix with workload period tracking.
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
import { academicsAPI, teachersAPI } from '../../services/api';
import { spacing, radius, typography, shadows } from '../../theme';
import { getErrorMessage } from '../../utils/formatters';
import { CLASSES, DIVISIONS, CURRENT_ACADEMIC_YEAR } from '../../config/constants';
import {
  AppCard,
  AppBadge,
  AppChip,
  AppButton,
  AppInput,
  AppSelect,
  AppBottomSheet,
  AppConfirmDialog,
  AppEmptyState,
  AppSkeleton,
} from '../../components/ui';
import Toast from 'react-native-toast-message';

interface Assignment {
  id: number;
  subject_name: string;
  subject_code?: string;
  standard: string;
  division: string;
  teacher_name?: string;
  teacher_id?: number;
  academic_year: string;
  periods_per_week?: number;
}

const EMPTY_FORM = {
  subject_id: '',
  teacher_id: '',
  standard: '8',
  division: 'A',
  periods_per_week: '5',
  academic_year: CURRENT_ACADEMIC_YEAR,
};

const CLASS_OPTIONS = CLASSES.map(c => ({ label: `Standard ${c}`, value: c }));
const DIVISION_OPTIONS = DIVISIONS.map(d => ({ label: `Division ${d}`, value: d }));

export default function SubjectAssignmentsScreen({ navigation }: { navigation: any }) {
  const { colors, roleAccent } = useTheme();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [selectedStandard, setSelectedStandard] = useState<string>('8');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  // Delete Dialog
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [assignRes, subRes, teachRes] = await Promise.allSettled([
        academicsAPI.getSubjectAssignments({ academic_year: CURRENT_ACADEMIC_YEAR }),
        academicsAPI.getSubjects(),
        teachersAPI.list({ limit: 100 }),
      ]);

      if (assignRes.status === 'fulfilled') {
        const d = assignRes.value.data?.data;
        setAssignments(Array.isArray(d?.items) ? d.items : Array.isArray(d) ? d : []);
      }
      if (subRes.status === 'fulfilled') {
        const d = subRes.value.data?.data;
        setSubjects(Array.isArray(d?.items) ? d.items : Array.isArray(d) ? d : []);
      }
      if (teachRes.status === 'fulfilled') {
        const d = teachRes.value.data?.data;
        setTeachers(Array.isArray(d?.items) ? d.items : Array.isArray(d) ? d : []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const filtered = useMemo(() => {
    return assignments.filter(a => String(a.standard) === selectedStandard);
  }, [assignments, selectedStandard]);

  const saveAssignment = async () => {
    if (!form.subject_id || !form.teacher_id) {
      Toast.show({ type: 'error', text1: 'Select both subject and faculty teacher' });
      return;
    }
    setSaving(true);
    try {
      await academicsAPI.createAssignment({
        subject_id: Number(form.subject_id),
        teacher_id: Number(form.teacher_id),
        standard: form.standard,
        division: form.division,
        periods_per_week: Number(form.periods_per_week) || 5,
        academic_year: form.academic_year,
      });
      Toast.show({ type: 'success', text1: 'Faculty Allocated Successfully' });
      setShowModal(false);
      setForm({ ...EMPTY_FORM });
      loadData();
    } catch (e) {
      Toast.show({ type: 'error', text1: getErrorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    setDeleting(true);
    try {
      await academicsAPI.deleteAssignment(deleteTargetId);
      Toast.show({ type: 'success', text1: 'Subject Allocation Removed' });
      setDeleteTargetId(null);
      loadData();
    } catch (e) {
      Toast.show({ type: 'error', text1: getErrorMessage(e) });
    } finally {
      setDeleting(false);
    }
  };

  const subjectOptions = subjects.map(s => ({
    label: s.name ?? s.subject_name,
    value: String(s.id),
  }));

  const teacherOptions = teachers.map(t => ({
    label: `${t.full_name} (${t.designation ?? 'Faculty'})`,
    value: String(t.id),
  }));

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Standard Selector Bar */}
      <View style={[styles.topBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.barLabel, { color: colors.textSecondary }]}>Filter by Standard:</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.xs, paddingTop: spacing.xs }}
        >
          {CLASSES.map(cls => (
            <AppChip
              key={cls}
              label={`Std ${cls}`}
              selected={selectedStandard === cls}
              onPress={() => setSelectedStandard(cls)}
            />
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={{ padding: spacing.base }}>
          <AppSkeleton variant="card" count={4} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          contentContainerStyle={{ padding: spacing.base, paddingBottom: 100 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={
            <AppEmptyState
              icon="book"
              title={`No Allocations in Std ${selectedStandard}`}
              description="No subject-to-teacher mappings have been configured for this class standard."
              actionLabel="Allocate Subject"
              onAction={() => setShowModal(true)}
              style={{ flex: 1 }}
            />
          }
          renderItem={({ item }) => (
            <AppCard variant="bordered" padding={14}>
              <View style={styles.cardRow}>
                {/* Left Subject Icon */}
                <View style={[styles.iconBox, { backgroundColor: colors.primaryBg }]}>
                  <Icon name="book" size={16} color={colors.primary} solid />
                </View>

                {/* Details */}
                <View style={{ flex: 1 }}>
                  <View style={styles.headerRow}>
                    <Text style={[styles.subjectTitle, { color: colors.text }]}>
                      {item.subject_name}
                    </Text>
                    <AppBadge
                      label={`Div ${item.division}`}
                      variant="primary"
                      size="sm"
                      rounded
                    />
                  </View>

                  <View style={styles.teacherRow}>
                    <Icon name="chalkboard-teacher" size={11} color={colors.textSecondary} />
                    <Text style={[styles.teacherName, { color: colors.textSecondary }]}>
                      {item.teacher_name || 'Unassigned Faculty'}
                    </Text>
                  </View>

                  {item.periods_per_week && (
                    <Text style={[styles.periodsText, { color: colors.textTertiary }]}>
                      {item.periods_per_week} lectures / week
                    </Text>
                  )}
                </View>

                {/* Trash Button */}
                <TouchableOpacity
                  style={[styles.deleteBtn, { backgroundColor: colors.dangerBg }]}
                  onPress={() => setDeleteTargetId(item.id)}
                  activeOpacity={0.75}
                >
                  <Icon name="trash-alt" size={12} color={colors.danger} />
                </TouchableOpacity>
              </View>
            </AppCard>
          )}
        />
      )}

      {/* Floating Create Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, ...shadows.lg }]}
        onPress={() => {
          setForm({ ...EMPTY_FORM, standard: selectedStandard });
          setShowModal(true);
        }}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Allocate Subject"
      >
        <Icon name="plus" size={20} color="#fff" solid />
      </TouchableOpacity>

      {/* Allocate Subject Bottom Sheet */}
      <AppBottomSheet
        visible={showModal}
        onClose={() => setShowModal(false)}
        title="Assign Subject to Faculty"
        subtitle="Configure timetable lecture load"
      >
        <View style={{ gap: spacing.xs }}>
          <AppSelect
            label="Subject *"
            value={form.subject_id}
            options={subjectOptions}
            onSelect={v => setForm(f => ({ ...f, subject_id: String(v) }))}
          />

          <AppSelect
            label="Faculty Teacher *"
            value={form.teacher_id}
            options={teacherOptions}
            onSelect={v => setForm(f => ({ ...f, teacher_id: String(v) }))}
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

          <AppInput
            label="Lectures Per Week"
            value={form.periods_per_week}
            onChangeText={v => setForm(f => ({ ...f, periods_per_week: v }))}
            icon="clock"
            keyboardType="number-pad"
          />

          <AppButton
            label="Confirm Allocation"
            iconLeft="check"
            variant="primary"
            size="lg"
            onPress={saveAssignment}
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
        title="Remove Allocation"
        message="Are you sure you want to remove this teacher-subject mapping? This may affect timetable scheduling."
        confirmLabel="Remove Allocation"
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
  topBar: {
    padding: spacing.base,
    borderBottomWidth: 1,
    gap: spacing.xs,
  },
  barLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subjectTitle: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
  },
  teacherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  teacherName: {
    fontSize: typography.size.xs,
  },
  periodsText: {
    fontSize: typography.size['2xs'],
    marginTop: 2,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
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
