/**
 * VidyaSetu Mobile — Lesson Plan Screen (Teacher Portal - Premium Redesign)
 * =========================================================================
 * Manage curriculum syllabus, chapter topics, lesson objectives & completion status.
 */
import React, { useEffect, useState, useCallback } from 'react';
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
import { lessonPlanAPI } from '../../services/api';
import { spacing, radius, typography, shadows } from '../../theme';
import { formatDateLong, today } from '../../utils/formatters';
import { CLASSES, DIVISIONS } from '../../config/constants';
import {
  AppCard,
  AppBadge,
  AppButton,
  AppInput,
  AppSelect,
  AppDatePicker,
  AppBottomSheet,
  AppEmptyState,
  AppSkeleton,
} from '../../components/ui';
import Toast from 'react-native-toast-message';
import { getErrorMessage } from '../../utils/formatters';

interface LessonPlan {
  id: number;
  subject_name?: string;
  topic?: string;
  topic_name?: string;
  standard?: string;
  division?: string;
  plan_date?: string;
  objectives?: string;
  status: string;
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; icon: string; variant: any }> = {
  completed:   { label: 'Completed',   color: '#059669', bg: '#d1fae5', icon: 'check-circle', variant: 'success' },
  in_progress: { label: 'In Progress', color: '#d97706', bg: '#fef3c7', icon: 'spinner',      variant: 'warning' },
  pending:     { label: 'Pending',     color: '#6b7280', bg: '#f3f4f6', icon: 'clock',        variant: 'neutral' },
};

const EMPTY_PLAN = {
  topic_name: '',
  subject_id: '1',
  standard: '8',
  division: 'A',
  plan_date: today(),
  objectives: '',
};

const CLASS_OPTIONS = CLASSES.map(c => ({ label: `Standard ${c}`, value: c }));
const DIVISION_OPTIONS = DIVISIONS.map(d => ({ label: `Division ${d}`, value: d }));

export default function LessonPlanScreen() {
  const { colors, roleAccent } = useTheme();
  const [plans, setPlans] = useState<LessonPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_PLAN });

  const loadData = useCallback(async () => {
    try {
      const res = await lessonPlanAPI.list({ academic_year: '2025-2026' });
      const items = res.data?.data?.items ?? res.data?.data ?? [];
      setPlans(Array.isArray(items) ? items : []);
    } catch {
      setPlans([]);
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

  const handleCreate = async () => {
    if (!form.topic_name.trim()) {
      Toast.show({ type: 'error', text1: 'Topic name is required' });
      return;
    }
    setSaving(true);
    try {
      await lessonPlanAPI.create({
        topic_name: form.topic_name,
        subject_id: Number(form.subject_id),
        standard: form.standard,
        division: form.division,
        plan_date: form.plan_date,
        objectives: form.objectives,
        academic_year: '2025-2026',
      });
      Toast.show({ type: 'success', text1: 'Lesson Plan Created Successfully' });
      setShowModal(false);
      setForm({ ...EMPTY_PLAN });
      loadData();
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Failed to create lesson plan', text2: getErrorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (item: LessonPlan) => {
    const nextStatus = item.status === 'completed' ? 'pending' : 'completed';
    try {
      await lessonPlanAPI.update(item.id, { status: nextStatus });
      Toast.show({ type: 'success', text1: `Plan marked as ${nextStatus}` });
      loadData();
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Status update failed', text2: getErrorMessage(e) });
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {loading ? (
        <View style={{ padding: spacing.base }}>
          <AppSkeleton variant="card" count={4} />
        </View>
      ) : (
        <FlatList
          data={plans}
          keyExtractor={i => String(i.id)}
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
              icon="book-reader"
              title="No Lesson Plans Created"
              description="Start mapping syllabus topics and lecture objectives for your assigned classes."
              actionLabel="Create Lesson Plan"
              onAction={() => setShowModal(true)}
              style={{ flex: 1 }}
            />
          }
          renderItem={({ item }) => {
            const topic = item.topic_name ?? item.topic ?? 'Lesson Topic';
            const cfg = STATUS_MAP[item.status] ?? STATUS_MAP.pending;
            return (
              <AppCard
                variant="bordered"
                padding={14}
                style={{ borderLeftWidth: 3.5, borderLeftColor: cfg.color }}
              >
                <View style={{ gap: 6 }}>
                  <View style={styles.cardTop}>
                    <Text style={[styles.topicTitle, { color: colors.text }]}>{topic}</Text>
                    <TouchableOpacity
                      style={[styles.statusPill, { backgroundColor: cfg.bg }]}
                      onPress={() => toggleStatus(item)}
                      activeOpacity={0.8}
                    >
                      <Icon name={cfg.icon} size={10} color={cfg.color} solid />
                      <Text style={[styles.statusPillText, { color: cfg.color }]}>{cfg.label}</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.metaRow}>
                    <Text style={[styles.metaText, { color: colors.primary, fontWeight: 'bold' }]}>
                      {item.subject_name || 'Academic Subject'}
                    </Text>
                    {item.standard && (
                      <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                        • Std {item.standard}-{item.division || 'A'}
                      </Text>
                    )}
                    {item.plan_date && (
                      <Text style={[styles.metaText, { color: colors.textTertiary }]}>
                        • {formatDateLong(item.plan_date)}
                      </Text>
                    )}
                  </View>

                  {item.objectives ? (
                    <Text style={[styles.objectives, { color: colors.textSecondary }]} numberOfLines={2}>
                      Goal: {item.objectives}
                    </Text>
                  ) : null}
                </View>
              </AppCard>
            );
          }}
        />
      )}

      {/* Floating Create Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, ...shadows.lg }]}
        onPress={() => setShowModal(true)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Create Lesson Plan"
      >
        <Icon name="plus" size={20} color="#fff" solid />
      </TouchableOpacity>

      {/* Create Lesson Plan Bottom Sheet */}
      <AppBottomSheet
        visible={showModal}
        onClose={() => setShowModal(false)}
        title="New Lesson Plan"
        subtitle="Schedule curriculum topics & teaching goals"
      >
        <View style={{ gap: spacing.xs }}>
          <AppInput
            label="Lesson / Topic Title *"
            value={form.topic_name}
            onChangeText={v => setForm(f => ({ ...f, topic_name: v }))}
            icon="heading"
            placeholder="e.g. Chapter 5: Trigonometric Identities"
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
            label="Target Plan Date *"
            value={form.plan_date}
            onChangeDate={d => setForm(f => ({ ...f, plan_date: d }))}
          />

          <AppInput
            label="Learning Objectives & Methodology"
            value={form.objectives}
            onChangeText={v => setForm(f => ({ ...f, objectives: v }))}
            icon="align-left"
            placeholder="Key concepts, lab activities, or homework tasks..."
            multiline
          />

          <AppButton
            label="Save Lesson Plan"
            iconLeft="save"
            variant="primary"
            size="lg"
            onPress={handleCreate}
            loading={saving}
            fullWidth
            style={{ marginTop: spacing.md }}
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
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topicTitle: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    flex: 1,
    marginRight: spacing.sm,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  statusPillText: {
    fontSize: typography.size['2xs'],
    fontWeight: typography.weight.bold,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  metaText: {
    fontSize: typography.size.xs,
  },
  objectives: {
    fontSize: typography.size.xs,
    lineHeight: 18,
    marginTop: 2,
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
