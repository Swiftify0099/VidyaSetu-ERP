/**
 * VidyaSetu Mobile — Homework Portal Screen
 * Teacher: create/view/grade homework
 * Student: view/submit homework
 * Parent: view child homework
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal,
  TextInput, Alert, ActivityIndicator, ScrollView, RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from '../../theme/ThemeContext';
import { homeworkAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { spacing, radius, typography, shadows } from '../../theme';
import { formatDateLong, formatStatus, today, getErrorMessage } from '../../utils/formatters';
import { CURRENT_ACADEMIC_YEAR, CLASSES, DIVISIONS } from '../../config/constants';
import Badge from '../../components/ui/Badge';
import PremiumCard from '../../components/ui/PremiumCard';
import SectionHeader from '../../components/ui/SectionHeader';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import Toast from 'react-native-toast-message';

interface Homework {
  id: number;
  subject_name: string;
  standard: string;
  division: string;
  title: string;
  description: string;
  due_date: string;
  assigned_date: string;
  status: string;
  submission_count?: number;
  total_students?: number;
  my_submission_status?: string;
}

interface Submission {
  id: number;
  student_name: string;
  gr_number: string;
  submitted_at: string;
  content: string;
  grade?: number;
  feedback?: string;
  status: string;
}

const EMPTY_FORM = {
  subject_id: '',
  standard: '8',
  division: 'A',
  title: '',
  description: '',
  due_date: '',
  academic_year: CURRENT_ACADEMIC_YEAR,
};

export default function HomeworkPortalScreen({ navigation }: { navigation: any }) {
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const role = user?.roles?.[0]?.code ?? '';
  const isTeacher = ['teacher', 'class_teacher', 'admin', 'principal', 'super_admin'].includes(role);
  const isStudent = role === 'student';

  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showSubmissions, setShowSubmissions] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const [selectedHW, setSelectedHW] = useState<Homework | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [submitContent, setSubmitContent] = useState('');
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [subjectsMap] = useState<{ id: number; name: string }[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'submitted'>('all');

  const load = useCallback(async () => {
    try {
      let res;
      if (isStudent) {
        res = await homeworkAPI.getMyHomework({ academic_year: CURRENT_ACADEMIC_YEAR });
      } else {
        res = await homeworkAPI.list({ academic_year: CURRENT_ACADEMIC_YEAR });
      }
      setHomeworks(res.data?.data?.items ?? res.data?.data ?? []);
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  }, [isStudent]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  const createHomework = async () => {
    if (!form.title.trim()) { Toast.show({ type: 'error', text1: 'Title is required' }); return; }
    if (!form.due_date.trim()) { Toast.show({ type: 'error', text1: 'Due date is required' }); return; }
    setSaving(true);
    try {
      await homeworkAPI.create({ ...form, subject_id: Number(form.subject_id) });
      Toast.show({ type: 'success', text1: 'Homework assigned successfully!' });
      setShowCreate(false);
      setForm({ ...EMPTY_FORM });
      load();
    } catch (e) {
      Toast.show({ type: 'error', text1: getErrorMessage(e) });
    } finally { setSaving(false); }
  };

  const viewSubmissions = async (hw: Homework) => {
    setSelectedHW(hw);
    setShowSubmissions(true);
    try {
      const res = await homeworkAPI.getSubmissions(hw.id);
      setSubmissions(res.data?.data?.items ?? res.data?.data ?? []);
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to load submissions' });
    }
  };

  const submitHomework = async () => {
    if (!submitContent.trim() || !selectedHW) {
      Toast.show({ type: 'error', text1: 'Please write your submission' });
      return;
    }
    setSaving(true);
    try {
      await homeworkAPI.submit(selectedHW.id, { content: submitContent });
      Toast.show({ type: 'success', text1: 'Homework submitted!' });
      setShowSubmit(false);
      setSubmitContent('');
      load();
    } catch (e) {
      Toast.show({ type: 'error', text1: getErrorMessage(e) });
    } finally { setSaving(false); }
  };

  const deleteHW = (id: number) => {
    Alert.alert('Delete Homework', 'Delete this homework assignment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await homeworkAPI.delete(id);
            Toast.show({ type: 'success', text1: 'Deleted' });
            load();
          } catch { Toast.show({ type: 'error', text1: 'Failed to delete' }); }
        },
      },
    ]);
  };

  const filtered = homeworks.filter(hw => {
    if (filter === 'all') return true;
    if (filter === 'pending')   return hw.my_submission_status !== 'submitted';
    if (filter === 'submitted') return hw.my_submission_status === 'submitted';
    return true;
  });

  function statusVariant(status: string): any {
    if (status === 'submitted') return 'success';
    if (status === 'graded')    return 'primary';
    if (status === 'overdue')   return 'danger';
    return 'warning';
  }

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      {/* Filter */}
      {isStudent && (
        <View style={[s.filterRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          {(['all', 'pending', 'submitted'] as const).map(f => (
            <TouchableOpacity
              key={f}
              style={[s.filterBtn, filter === f && { borderBottomColor: colors.primary, borderBottomWidth: 2.5 }]}
              onPress={() => setFilter(f)}
            >
              <Text style={[s.filterText, { color: filter === f ? colors.primary : colors.textSecondary }]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {loading ? (
        <View style={{ padding: spacing.base }}>
          <SkeletonLoader variant="list" count={5} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={hw => String(hw.id)}
          contentContainerStyle={{ padding: spacing.base, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => {
            const isOverdue = new Date(item.due_date) < new Date() && item.my_submission_status !== 'submitted';
            return (
              <PremiumCard variant="bordered" padding={12}>
                <View style={s.hwRow}>
                  <View style={[s.hwIcon, { backgroundColor: colors.primaryBg }]}>
                    <Icon name="book-open" size={16} color={colors.primary} solid />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={s.hwTitleRow}>
                      <Text style={[s.hwTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
                      {isStudent && item.my_submission_status && (
                        <Badge
                          label={formatStatus(item.my_submission_status)}
                          variant={statusVariant(item.my_submission_status)}
                          size="sm" rounded
                        />
                      )}
                    </View>
                    <Text style={[s.hwSubject, { color: colors.textSecondary }]}>
                      {item.subject_name} • Std {item.standard}-{item.division}
                    </Text>
                    <Text style={[s.hwDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                      {item.description}
                    </Text>
                    <View style={s.hwMeta}>
                      <Icon name="calendar" size={10} color={isOverdue ? colors.danger : colors.textTertiary} solid />
                      <Text style={[s.hwDate, { color: isOverdue ? colors.danger : colors.textTertiary }]}>
                        Due: {formatDateLong(item.due_date)}
                        {isOverdue && ' (Overdue)'}
                      </Text>
                      {isTeacher && item.submission_count != null && (
                        <Text style={[s.hwDate, { color: colors.textTertiary }]}>
                          • {item.submission_count}/{item.total_students} submitted
                        </Text>
                      )}
                    </View>
                    <View style={s.hwActions}>
                      {isTeacher && (
                        <>
                          <TouchableOpacity
                            style={[s.hwBtn, { backgroundColor: colors.primaryBg }]}
                            onPress={() => viewSubmissions(item)}
                          >
                            <Text style={[s.hwBtnText, { color: colors.primary }]}>Submissions</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[s.hwBtn, { backgroundColor: colors.dangerBg }]}
                            onPress={() => deleteHW(item.id)}
                          >
                            <Text style={[s.hwBtnText, { color: colors.danger }]}>Delete</Text>
                          </TouchableOpacity>
                        </>
                      )}
                      {isStudent && item.my_submission_status !== 'submitted' && (
                        <TouchableOpacity
                          style={[s.hwBtn, { backgroundColor: colors.success }]}
                          onPress={() => { setSelectedHW(item); setSubmitContent(''); setShowSubmit(true); }}
                        >
                          <Text style={[s.hwBtnText, { color: '#fff' }]}>Submit</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              </PremiumCard>
            );
          }}
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <Text style={s.emptyIcon}>📚</Text>
              <Text style={[s.emptyText, { color: colors.textSecondary }]}>No homework found</Text>
              {isTeacher && (
                <TouchableOpacity
                  style={[s.emptyBtn, { backgroundColor: colors.primaryBg }]}
                  onPress={() => setShowCreate(true)}
                >
                  <Text style={[s.emptyBtnText, { color: colors.primary }]}>Assign Homework</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* FAB */}
      {isTeacher && (
        <TouchableOpacity
          style={[s.fab, { backgroundColor: colors.primary }]}
          onPress={() => { setForm({ ...EMPTY_FORM }); setShowCreate(true); }}
        >
          <Icon name="plus" size={20} color="#fff" solid />
        </TouchableOpacity>
      )}

      {/* Create Homework Modal */}
      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet">
        <View style={[s.modal, { backgroundColor: colors.background }]}>
          <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowCreate(false)}>
              <Icon name="times" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={[s.modalTitle, { color: colors.text }]}>Assign Homework</Text>
            <TouchableOpacity onPress={createHomework} disabled={saving}>
              {saving
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Text style={[s.saveText, { color: colors.primary }]}>Assign</Text>}
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: spacing.base, gap: 14 }}>
            <View>
              <Text style={[s.label, { color: colors.textSecondary }]}>Title *</Text>
              <TextInput
                style={[s.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                value={form.title}
                onChangeText={v => setForm(f => ({ ...f, title: v }))}
                placeholder="Homework title..."
                placeholderTextColor={colors.placeholder}
              />
            </View>
            <View>
              <Text style={[s.label, { color: colors.textSecondary }]}>Description</Text>
              <TextInput
                style={[s.input, s.textarea, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                value={form.description}
                onChangeText={v => setForm(f => ({ ...f, description: v }))}
                placeholder="Describe the homework task..."
                placeholderTextColor={colors.placeholder}
                multiline
                numberOfLines={3}
              />
            </View>
            <View>
              <Text style={[s.label, { color: colors.textSecondary }]}>Standard</Text>
              <View style={s.chips}>
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
              <View style={s.chips}>
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
              <Text style={[s.label, { color: colors.textSecondary }]}>Due Date *</Text>
              <TextInput
                style={[s.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                value={form.due_date}
                onChangeText={v => setForm(f => ({ ...f, due_date: v }))}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.placeholder}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Submit Homework Modal (Student) */}
      <Modal visible={showSubmit} animationType="slide" presentationStyle="pageSheet">
        <View style={[s.modal, { backgroundColor: colors.background }]}>
          <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowSubmit(false)}>
              <Icon name="times" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={[s.modalTitle, { color: colors.text }]}>Submit Homework</Text>
            <TouchableOpacity onPress={submitHomework} disabled={saving}>
              {saving
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Text style={[s.saveText, { color: colors.success }]}>Submit</Text>}
            </TouchableOpacity>
          </View>
          <View style={{ padding: spacing.base }}>
            {selectedHW && (
              <PremiumCard variant="flat" style={{ marginBottom: spacing.md }} padding={12}>
                <Text style={[s.hwTitle, { color: colors.text }]}>{selectedHW.title}</Text>
                <Text style={[s.hwSubject, { color: colors.textSecondary }]}>{selectedHW.subject_name}</Text>
              </PremiumCard>
            )}
            <Text style={[s.label, { color: colors.textSecondary }]}>Your Answer *</Text>
            <TextInput
              style={[s.input, s.largeTextarea, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
              value={submitContent}
              onChangeText={setSubmitContent}
              placeholder="Type your answer here..."
              placeholderTextColor={colors.placeholder}
              multiline
              numberOfLines={8}
            />
          </View>
        </View>
      </Modal>

      {/* Submissions Modal (Teacher) */}
      <Modal visible={showSubmissions} animationType="slide" presentationStyle="pageSheet">
        <View style={[s.modal, { backgroundColor: colors.background }]}>
          <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowSubmissions(false)}>
              <Icon name="times" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={[s.modalTitle, { color: colors.text }]}>Submissions</Text>
            <View style={{ width: 40 }} />
          </View>
          <FlatList
            data={submissions}
            keyExtractor={s2 => String(s2.id)}
            contentContainerStyle={{ padding: spacing.base, gap: 8, paddingBottom: 40 }}
            renderItem={({ item }) => (
              <PremiumCard variant="bordered" padding={12}>
                <Text style={[s.studentName, { color: colors.text }]}>{item.student_name}</Text>
                <Text style={[s.grNr, { color: colors.textSecondary }]}>GR: {item.gr_number}</Text>
                <Text style={[s.submissionContent, { color: colors.text }]} numberOfLines={3}>{item.content}</Text>
                <Text style={[s.submittedAt, { color: colors.textTertiary }]}>
                  Submitted: {formatDateLong(item.submitted_at)}
                </Text>
                {item.grade != null && (
                  <View style={s.gradeRow}>
                    <Text style={[s.gradeLabel, { color: colors.success }]}>Grade: {item.grade}</Text>
                    {item.feedback && <Text style={[s.feedback, { color: colors.textSecondary }]}>{item.feedback}</Text>}
                  </View>
                )}
              </PremiumCard>
            )}
            ListEmptyComponent={
              <View style={s.emptyWrap}>
                <Text style={s.emptyIcon}>📭</Text>
                <Text style={[s.emptyText, { color: colors.textSecondary }]}>No submissions yet</Text>
              </View>
            }
          />
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  filterRow: { flexDirection: 'row', borderBottomWidth: 1 },
  filterBtn: { flex: 1, padding: 12, alignItems: 'center' },
  filterText: { fontSize: typography.size.sm, fontWeight: typography.weight.semibold },
  hwRow: { flexDirection: 'row', gap: 12 },
  hwIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  hwTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  hwTitle: { fontSize: typography.size.base, fontWeight: typography.weight.bold, flex: 1, marginRight: 6 },
  hwSubject: { fontSize: typography.size.sm, marginBottom: 3 },
  hwDesc: { fontSize: typography.size.sm, marginBottom: 4 },
  hwMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  hwDate: { fontSize: typography.size.xs },
  hwActions: { flexDirection: 'row', gap: 8 },
  hwBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full },
  hwBtnText: { fontSize: typography.size.xs, fontWeight: typography.weight.bold },
  emptyWrap: { alignItems: 'center', padding: spacing.xl },
  emptyIcon: { fontSize: 44, marginBottom: 12 },
  emptyText: { fontSize: typography.size.base },
  emptyBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: radius.full, marginTop: 12 },
  emptyBtnText: { fontWeight: typography.weight.semibold },
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
  textarea: { height: 100, textAlignVertical: 'top', paddingTop: 12 },
  largeTextarea: { height: 180, textAlignVertical: 'top', paddingTop: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full,
    backgroundColor: '#f3f4f6', borderWidth: 1.5, borderColor: '#e5e7eb',
  },
  chipText: { fontSize: typography.size.sm, fontWeight: typography.weight.semibold, color: '#6b7280' },
  studentName: { fontSize: typography.size.base, fontWeight: typography.weight.bold },
  grNr: { fontSize: typography.size.xs, marginTop: 2, marginBottom: 4 },
  submissionContent: { fontSize: typography.size.sm },
  submittedAt: { fontSize: typography.size.xs, marginTop: 6 },
  gradeRow: { marginTop: 8 },
  gradeLabel: { fontSize: typography.size.base, fontWeight: typography.weight.bold },
  feedback: { fontSize: typography.size.sm, marginTop: 2 },
});
