/**
 * VidyaSetu Mobile — Homework Portal Screen (Premium Redesign)
 * =============================================================
 * Interactive assignments dashboard supporting teacher creation & grading,
 * student submissions, and parent monitoring.
 */
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from '../../theme/ThemeContext';
import { homeworkAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { spacing, radius, typography, shadows } from '../../theme';
import { formatDateLong, formatStatus, today, getErrorMessage } from '../../utils/formatters';
import { CURRENT_ACADEMIC_YEAR, CLASSES, DIVISIONS } from '../../config/constants';
import {
  AppCard,
  AppButton,
  AppBadge,
  AppTabs,
  AppInput,
  AppSelect,
  AppBottomSheet,
  AppProgress,
  AppEmptyState,
  AppSkeleton,
  AppDatePicker,
} from '../../components/ui';
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
  subject_id: '1',
  standard: '8',
  division: 'A',
  title: '',
  description: '',
  due_date: today(),
  academic_year: CURRENT_ACADEMIC_YEAR,
};

const CLASS_OPTIONS = CLASSES.map(c => ({ label: `Standard ${c}`, value: c }));
const DIVISION_OPTIONS = DIVISIONS.map(d => ({ label: `Division ${d}`, value: d }));

export default function HomeworkPortalScreen({ navigation }: { navigation: any }) {
  const { colors, roleAccent } = useTheme();
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
  const [activeTab, setActiveTab] = useState('all');

  const load = useCallback(async () => {
    try {
      let res;
      if (isStudent) {
        res = await homeworkAPI.getMyHomework({ academic_year: CURRENT_ACADEMIC_YEAR });
      } else {
        res = await homeworkAPI.list({ academic_year: CURRENT_ACADEMIC_YEAR });
      }
      setHomeworks(res.data?.data?.items ?? res.data?.data ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isStudent]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const createHomework = async () => {
    if (!form.title.trim()) {
      Toast.show({ type: 'error', text1: 'Title is required' });
      return;
    }
    if (!form.due_date.trim()) {
      Toast.show({ type: 'error', text1: 'Due date is required' });
      return;
    }
    setSaving(true);
    try {
      await homeworkAPI.create({ ...form, subject_id: Number(form.subject_id) });
      Toast.show({ type: 'success', text1: 'Homework Assigned Successfully' });
      setShowCreate(false);
      setForm({ ...EMPTY_FORM });
      load();
    } catch (e) {
      Toast.show({ type: 'error', text1: getErrorMessage(e) });
    } finally {
      setSaving(false);
    }
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
      Toast.show({ type: 'success', text1: 'Homework submitted successfully!' });
      setShowSubmit(false);
      setSubmitContent('');
      load();
    } catch (e) {
      Toast.show({ type: 'error', text1: getErrorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  const filteredHomeworks = useMemo(() => {
    if (activeTab === 'all') return homeworks;
    if (activeTab === 'pending') {
      return homeworks.filter(h => h.my_submission_status === 'pending' || h.status === 'assigned');
    }
    if (activeTab === 'submitted') {
      return homeworks.filter(h => h.my_submission_status === 'submitted' || h.status === 'completed');
    }
    return homeworks;
  }, [homeworks, activeTab]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Tab Filter Strip */}
      <View style={[styles.tabsWrap, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <AppTabs
          tabs={[
            { key: 'all', label: 'All Tasks', count: homeworks.length },
            {
              key: 'pending',
              label: 'Active / Due',
              count: homeworks.filter(h => h.status !== 'completed').length,
            },
            {
              key: 'submitted',
              label: 'Submitted',
              count: homeworks.filter(h => h.status === 'completed' || h.my_submission_status === 'submitted').length,
            },
          ]}
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          variant="segmented"
        />
      </View>

      {/* Main List */}
      {loading ? (
        <View style={{ padding: spacing.base }}>
          <AppSkeleton variant="card" count={4} />
        </View>
      ) : (
        <FlatList
          data={filteredHomeworks}
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
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <AppEmptyState
              icon="tasks"
              title="No Homework Found"
              description="No active homework or assignments scheduled for this class category."
              actionLabel={isTeacher ? 'Assign Homework' : undefined}
              onAction={isTeacher ? () => setShowCreate(true) : undefined}
              style={{ flex: 1 }}
            />
          }
          renderItem={({ item }) => {
            const isDueSoon = new Date(item.due_date).getTime() - Date.now() < 86400000 * 2;
            const submittedCount = item.submission_count ?? 0;
            const totalCount = item.total_students ?? 30;
            const completionPct = totalCount > 0 ? (submittedCount / totalCount) * 100 : 0;

            return (
              <AppCard variant="bordered" padding={14}>
                <View style={{ gap: 8 }}>
                  {/* Top Subject & Standard Row */}
                  <View style={styles.cardTop}>
                    <View style={styles.subjectPill}>
                      <Icon name="book" size={11} color={colors.primary} solid />
                      <Text style={[styles.subjectName, { color: colors.primary }]}>
                        {item.subject_name || 'General'}
                      </Text>
                      <Text style={[styles.classTag, { color: colors.textSecondary }]}>
                        • Std {item.standard}-{item.division}
                      </Text>
                    </View>

                    <AppBadge
                      label={isDueSoon ? 'Due Soon' : formatStatus(item.status)}
                      variant={isDueSoon ? 'warning' : 'neutral'}
                      size="sm"
                      rounded
                    />
                  </View>

                  {/* Title & Description */}
                  <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
                  {item.description ? (
                    <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
                      {item.description}
                    </Text>
                  ) : null}

                  {/* Due Date & Submission Stats */}
                  <View style={styles.footerRow}>
                    <View style={styles.dateRow}>
                      <Icon name="calendar-alt" size={11} color={colors.textTertiary} />
                      <Text style={[styles.dateText, { color: colors.textTertiary }]}>
                        Due: {formatDateLong(item.due_date)}
                      </Text>
                    </View>

                    {isTeacher ? (
                      <Text style={[styles.subCount, { color: colors.primary, fontWeight: 'bold' }]}>
                        {submittedCount} / {totalCount} Turnouts
                      </Text>
                    ) : (
                      <AppBadge
                        label={item.my_submission_status === 'submitted' ? 'Turned In' : 'Pending'}
                        variant={item.my_submission_status === 'submitted' ? 'success' : 'warning'}
                        size="sm"
                      />
                    )}
                  </View>

                  {/* Teacher Progress Bar */}
                  {isTeacher && (
                    <AppProgress
                      value={completionPct}
                      showPercentage={false}
                      height={4}
                      color={colors.primary}
                    />
                  )}

                  {/* Action Buttons */}
                  <View style={styles.cardActions}>
                    {isTeacher && (
                      <AppButton
                        label="View Turnouts"
                        iconLeft="users"
                        variant="secondary"
                        size="sm"
                        onPress={() => viewSubmissions(item)}
                      />
                    )}
                    {isStudent && item.my_submission_status !== 'submitted' && (
                      <AppButton
                        label="Turn In Work"
                        iconLeft="upload"
                        variant="primary"
                        size="sm"
                        onPress={() => {
                          setSelectedHW(item);
                          setShowSubmit(true);
                        }}
                      />
                    )}
                  </View>
                </View>
              </AppCard>
            );
          }}
        />
      )}

      {/* Floating Create Button for Teachers */}
      {isTeacher && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary, ...shadows.lg }]}
          onPress={() => {
            setForm({ ...EMPTY_FORM });
            setShowCreate(true);
          }}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Assign Homework"
        >
          <Icon name="plus" size={20} color="#fff" solid />
        </TouchableOpacity>
      )}

      {/* Create Homework Bottom Sheet */}
      <AppBottomSheet
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        title="Assign New Homework"
        subtitle="Create homework task for students"
      >
        <View style={{ gap: spacing.xs }}>
          <AppInput
            label="Homework Title *"
            value={form.title}
            onChangeText={v => setForm(f => ({ ...f, title: v }))}
            icon="heading"
            placeholder="e.g. Exercise 4.2 Problems 1 to 10"
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
            label="Due Date *"
            value={form.due_date}
            onChangeDate={d => setForm(f => ({ ...f, due_date: d }))}
          />

          <AppInput
            label="Instructions & Description"
            value={form.description}
            onChangeText={v => setForm(f => ({ ...f, description: v }))}
            icon="align-left"
            placeholder="Write details or required textbook pages..."
            multiline
          />

          <AppButton
            label="Publish Assignment"
            iconLeft="paper-plane"
            variant="primary"
            size="lg"
            onPress={createHomework}
            loading={saving}
            fullWidth
            style={{ marginTop: spacing.md }}
          />
        </View>
      </AppBottomSheet>

      {/* Student Submit Bottom Sheet */}
      <AppBottomSheet
        visible={showSubmit}
        onClose={() => setShowSubmit(false)}
        title="Submit Assignment"
        subtitle={selectedHW?.title ?? 'Submit your work'}
      >
        <View style={{ gap: spacing.base }}>
          <AppInput
            label="Your Solution / Answers *"
            value={submitContent}
            onChangeText={setSubmitContent}
            placeholder="Type your response, links, or solution summary..."
            multiline
          />
          <AppButton
            label="Turn In Assignment"
            iconLeft="check-circle"
            variant="primary"
            size="lg"
            onPress={submitHomework}
            loading={saving}
            fullWidth
          />
        </View>
      </AppBottomSheet>
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
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subjectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subjectName: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
  },
  classTag: {
    fontSize: typography.size.xs,
  },
  title: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
  },
  description: {
    fontSize: typography.size.xs,
    lineHeight: 18,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dateText: {
    fontSize: typography.size['2xs'],
  },
  subCount: {
    fontSize: typography.size.xs,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.xs,
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
