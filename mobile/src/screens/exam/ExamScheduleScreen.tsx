/**
 * VidyaSetu Mobile — Exam Schedule Screen
 * Create / Edit / List exam schedules.
 * Admin, Principal, Exam Coordinator.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, ScrollView, RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from '../../theme/ThemeContext';
import { examAPI } from '../../services/api';
import { spacing, radius, typography } from '../../theme';
import { formatDateLong, formatStatus } from '../../utils/formatters';
import { CURRENT_ACADEMIC_YEAR, CLASSES, DIVISIONS } from '../../config/constants';
import Badge from '../../components/ui/Badge';
import PremiumCard from '../../components/ui/PremiumCard';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
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

interface ExamType { id: number; name: string; }

const EMPTY_FORM = {
  exam_type_id: '',
  subject_id: '',
  standard: '8',
  division: 'A',
  exam_date: '',
  start_time: '09:00',
  end_time: '11:00',
  total_marks: '100',
  passing_marks: '35',
  academic_year: CURRENT_ACADEMIC_YEAR,
};

export default function ExamScheduleScreen({ navigation }: { navigation: any }) {
  const { colors } = useTheme();
  const [schedules, setSchedules] = useState<ExamSchedule[]>([]);
  const [examTypes, setExamTypes] = useState<ExamType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [editId, setEditId] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'completed'>('all');

  const load = useCallback(async () => {
    try {
      const [schRes, typesRes] = await Promise.allSettled([
        examAPI.getSchedules({ academic_year: CURRENT_ACADEMIC_YEAR }),
        examAPI.getExamTypes(),
      ]);
      if (schRes.status === 'fulfilled')
        setSchedules(schRes.value.data?.data?.items ?? schRes.value.data?.data ?? []);
      if (typesRes.status === 'fulfilled')
        setExamTypes(typesRes.value.data?.data ?? []);
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  const save = async () => {
    if (!form.exam_date.trim()) { Toast.show({ type: 'error', text1: 'Exam date is required' }); return; }
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
        Toast.show({ type: 'success', text1: 'Exam schedule updated' });
      } else {
        await examAPI.createSchedule(payload);
        Toast.show({ type: 'success', text1: 'Exam scheduled successfully' });
      }
      setShowForm(false);
      setForm({ ...EMPTY_FORM });
      setEditId(null);
      load();
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e?.response?.data?.detail ?? 'Failed to save schedule' });
    } finally { setSaving(false); }
  };

  const deleteSchedule = (id: number) => {
    Alert.alert('Delete Schedule', 'Are you sure you want to delete this exam schedule?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await examAPI.deleteSchedule(id);
            Toast.show({ type: 'success', text1: 'Schedule deleted' });
            load();
          } catch {
            Toast.show({ type: 'error', text1: 'Failed to delete' });
          }
        },
      },
    ]);
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

  const filtered = schedules.filter(e =>
    filter === 'all' ? true : e.status === filter
  );

  function badgeVariant(s: string) {
    if (s === 'completed') return 'success';
    if (s === 'ongoing')   return 'warning';
    return 'primary';
  }

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      {/* Filter Tabs */}
      <View style={[s.tabs, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {(['all', 'scheduled', 'completed'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[s.tab, filter === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2.5 }]}
            onPress={() => setFilter(tab)}
          >
            <Text style={[s.tabText, { color: filter === tab ? colors.primary : colors.textSecondary }]}>
              {tab === 'all' ? 'All' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={{ padding: spacing.base }}>
          <SkeletonLoader variant="list" count={5} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={e => String(e.id)}
          contentContainerStyle={{ padding: spacing.base, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => (
            <PremiumCard variant="bordered" padding={12}>
              <View style={s.examRow}>
                <View style={{ flex: 1 }}>
                  <View style={s.titleRow}>
                    <Text style={[s.subject, { color: colors.text }]}>{item.subject_name}</Text>
                    <Badge label={formatStatus(item.status)} variant={badgeVariant(item.status) as any} size="sm" rounded />
                  </View>
                  <Text style={[s.type, { color: colors.textSecondary }]}>
                    {item.exam_type_name} • Std {item.standard}-{item.division}
                  </Text>
                  <Text style={[s.date, { color: colors.textTertiary }]}>
                    📅 {formatDateLong(item.exam_date)}  ⏰ {item.start_time}–{item.end_time}
                  </Text>
                  <Text style={[s.marks, { color: colors.textTertiary }]}>
                    Max: {item.total_marks}  Pass: {item.passing_marks}
                  </Text>
                </View>
                <View style={s.actions}>
                  <TouchableOpacity
                    style={[s.actionBtn, { backgroundColor: colors.primaryBg }]}
                    onPress={() => navigation.navigate('ExamMarks', { examId: item.id, exam: item })}
                  >
                    <Icon name="pen" size={13} color={colors.primary} solid />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.actionBtn, { backgroundColor: colors.primaryBg }]}
                    onPress={() => openEdit(item)}
                  >
                    <Icon name="edit" size={13} color={colors.warning} solid />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.actionBtn, { backgroundColor: colors.dangerBg }]}
                    onPress={() => deleteSchedule(item.id)}
                  >
                    <Icon name="trash" size={13} color={colors.danger} solid />
                  </TouchableOpacity>
                </View>
              </View>
            </PremiumCard>
          )}
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <Text style={s.emptyIcon}>📋</Text>
              <Text style={[s.emptyText, { color: colors.textSecondary }]}>No schedules found</Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[s.fab, { backgroundColor: colors.primary }]}
        onPress={() => { setForm({ ...EMPTY_FORM }); setEditId(null); setShowForm(true); }}
      >
        <Icon name="plus" size={20} color="#fff" solid />
      </TouchableOpacity>

      {/* Form Modal */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <View style={[s.modal, { backgroundColor: colors.background }]}>
          <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <Icon name="times" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={[s.modalTitle, { color: colors.text }]}>
              {editId ? 'Edit Schedule' : 'Schedule Exam'}
            </Text>
            <TouchableOpacity onPress={save} disabled={saving}>
              {saving
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Text style={[s.saveText, { color: colors.primary }]}>Save</Text>}
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: spacing.base, gap: 14 }}>
            <View>
              <Text style={[s.label, { color: colors.textSecondary }]}>Exam Date *</Text>
              <TextInput
                style={[s.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                value={form.exam_date}
                onChangeText={v => setForm(f => ({ ...f, exam_date: v }))}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.placeholder}
              />
            </View>
            <View>
              <Text style={[s.label, { color: colors.textSecondary }]}>Standard</Text>
              <View style={s.chipRow}>
                {CLASSES.map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[s.chip, form.standard === c && { backgroundColor: colors.primary }]}
                    onPress={() => setForm(f => ({ ...f, standard: c }))}
                  >
                    <Text style={[s.chipText, form.standard === c && { color: '#fff' }]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View>
              <Text style={[s.label, { color: colors.textSecondary }]}>Division</Text>
              <View style={s.chipRow}>
                {DIVISIONS.map(d => (
                  <TouchableOpacity
                    key={d}
                    style={[s.chip, form.division === d && { backgroundColor: colors.primary }]}
                    onPress={() => setForm(f => ({ ...f, division: d }))}
                  >
                    <Text style={[s.chipText, form.division === d && { color: '#fff' }]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View>
              <Text style={[s.label, { color: colors.textSecondary }]}>Start Time</Text>
              <TextInput
                style={[s.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                value={form.start_time}
                onChangeText={v => setForm(f => ({ ...f, start_time: v }))}
                placeholder="HH:MM"
                placeholderTextColor={colors.placeholder}
              />
            </View>
            <View>
              <Text style={[s.label, { color: colors.textSecondary }]}>End Time</Text>
              <TextInput
                style={[s.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                value={form.end_time}
                onChangeText={v => setForm(f => ({ ...f, end_time: v }))}
                placeholder="HH:MM"
                placeholderTextColor={colors.placeholder}
              />
            </View>
            <View>
              <Text style={[s.label, { color: colors.textSecondary }]}>Total Marks</Text>
              <TextInput
                style={[s.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                value={form.total_marks}
                onChangeText={v => setForm(f => ({ ...f, total_marks: v }))}
                keyboardType="numeric"
                placeholderTextColor={colors.placeholder}
              />
            </View>
            <View>
              <Text style={[s.label, { color: colors.textSecondary }]}>Passing Marks</Text>
              <TextInput
                style={[s.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                value={form.passing_marks}
                onChangeText={v => setForm(f => ({ ...f, passing_marks: v }))}
                keyboardType="numeric"
                placeholderTextColor={colors.placeholder}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, padding: 12, alignItems: 'center' },
  tabText: { fontSize: typography.size.sm, fontWeight: typography.weight.semibold },
  examRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  subject: { fontSize: typography.size.base, fontWeight: typography.weight.bold, flex: 1, marginRight: 8 },
  type: { fontSize: typography.size.sm, marginBottom: 2 },
  date: { fontSize: typography.size.xs, marginBottom: 2 },
  marks: { fontSize: typography.size.xs },
  actions: { gap: 6 },
  actionBtn: { width: 32, height: 32, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: { alignItems: 'center', padding: spacing.xl },
  emptyIcon: { fontSize: 44, marginBottom: 12 },
  emptyText: { fontSize: typography.size.base },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8,
  },
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.base, borderBottomWidth: 1,
  },
  modalTitle: { fontSize: typography.size.lg, fontWeight: typography.weight.bold },
  saveText: { fontSize: typography.size.base, fontWeight: typography.weight.bold },
  label: { fontSize: typography.size.xs, fontWeight: typography.weight.semibold, textTransform: 'uppercase', marginBottom: 6 },
  input: {
    height: 48, borderWidth: 1.5, borderRadius: radius.md,
    paddingHorizontal: spacing.md, fontSize: typography.size.base,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.full,
    backgroundColor: '#f3f4f6', borderWidth: 1.5, borderColor: '#e5e7eb',
  },
  chipText: { fontSize: typography.size.sm, fontWeight: typography.weight.semibold, color: '#6b7280' },
});
