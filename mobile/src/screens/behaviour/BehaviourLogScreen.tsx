/**
 * VidyaSetu Mobile — Behaviour & Discipline Log Screen (Premium Redesign)
 * =======================================================================
 * Positive praise recognition and negative incident documentation with
 * student lookup, categories, and resolution logs.
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
import { behaviourAPI } from '../../services/api';
import { spacing, radius, typography, shadows } from '../../theme';
import { formatDateLong, today, getErrorMessage } from '../../utils/formatters';
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
  AppStatCard,
} from '../../components/ui';
import Toast from 'react-native-toast-message';

interface BehaviourLog {
  id: number;
  student_name: string;
  gr_number: string;
  standard: string;
  division: string;
  type: 'positive' | 'negative';
  category: string;
  description: string;
  date: string;
  recorded_by_name?: string;
  action_taken?: string;
}

interface Category {
  id: number;
  name: string;
  type: string;
}

const EMPTY_FORM = {
  student_id: '',
  type: 'positive' as 'positive' | 'negative',
  category_id: '',
  description: '',
  date: today(),
  action_taken: '',
};

export default function BehaviourLogScreen({ navigation }: { navigation: any }) {
  const { colors } = useTheme();
  const [logs, setLogs] = useState<BehaviourLog[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [typeFilter, setTypeFilter] = useState<'all' | 'positive' | 'negative'>('all');

  // Deletion state
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [logsRes, catsRes] = await Promise.allSettled([
        behaviourAPI.list({ limit: 50 }),
        behaviourAPI.getCategories(),
      ]);
      if (logsRes.status === 'fulfilled') {
        setLogs(logsRes.value.data?.data?.items ?? logsRes.value.data?.data ?? []);
      }
      if (catsRes.status === 'fulfilled') {
        setCategories(catsRes.value.data?.data ?? []);
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

  const saveBehaviour = async () => {
    if (!form.student_id.trim()) {
      Toast.show({ type: 'error', text1: 'Student ID is required' });
      return;
    }
    if (!form.description.trim()) {
      Toast.show({ type: 'error', text1: 'Description is required' });
      return;
    }
    setSaving(true);
    try {
      await behaviourAPI.create({
        student_id: Number(form.student_id),
        type: form.type,
        category_id: form.category_id ? Number(form.category_id) : undefined,
        description: form.description,
        date: form.date,
        action_taken: form.action_taken || undefined,
      });
      Toast.show({ type: 'success', text1: 'Behaviour Logged Successfully' });
      setShowForm(false);
      setForm({ ...EMPTY_FORM });
      load();
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
      await behaviourAPI.delete(deleteTargetId);
      Toast.show({ type: 'success', text1: 'Behaviour record deleted' });
      setDeleteTargetId(null);
      load();
    } catch (e) {
      Toast.show({ type: 'error', text1: getErrorMessage(e) });
    } finally {
      setDeleting(false);
    }
  };

  const positiveCount = logs.filter(l => l.type === 'positive').length;
  const negativeCount = logs.filter(l => l.type === 'negative').length;

  const filtered = useMemo(() => {
    if (typeFilter === 'all') return logs;
    return logs.filter(l => l.type === typeFilter);
  }, [logs, typeFilter]);

  const categoryOptions = categories
    .filter(c => c.type === form.type)
    .map(c => ({ label: c.name, value: String(c.id) }));

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Top Metric Stats Summary */}
      <View style={[styles.statsRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <AppStatCard
          label="Praise / Positive"
          value={positiveCount}
          subtitle="Commendations"
          icon="star"
          color={colors.success}
          style={{ flex: 1 }}
        />
        <AppStatCard
          label="Incidents / Concerns"
          value={negativeCount}
          subtitle="Documented Cases"
          icon="exclamation-triangle"
          color={colors.danger}
          style={{ flex: 1 }}
        />
      </View>

      {/* Filter Tabs */}
      <View style={[styles.tabsWrap, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <AppTabs
          tabs={[
            { key: 'all', label: 'All Records', count: logs.length },
            { key: 'positive', label: 'Praise & Merits', count: positiveCount },
            { key: 'negative', label: 'Incidents & Flags', count: negativeCount },
          ]}
          activeTab={typeFilter}
          onChangeTab={k => setTypeFilter(k as any)}
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
              icon="clipboard-list"
              title="No Behaviour Logs"
              description="No recognition or discipline entries logged for this category."
              actionLabel="Log New Event"
              onAction={() => {
                setForm({ ...EMPTY_FORM });
                setShowForm(true);
              }}
              style={{ flex: 1 }}
            />
          }
          renderItem={({ item }) => {
            const isPositive = item.type === 'positive';
            return (
              <AppCard
                variant="bordered"
                padding={14}
                style={{
                  borderLeftWidth: 3.5,
                  borderLeftColor: isPositive ? colors.success : colors.danger,
                }}
              >
                <View style={{ gap: 6 }}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.studentName, { color: colors.text }]}>
                        {item.student_name}
                      </Text>
                      <Text style={[styles.studentMeta, { color: colors.textSecondary }]}>
                        GR: {item.gr_number} • Std {item.standard}-{item.division}
                      </Text>
                    </View>

                    <AppBadge
                      label={isPositive ? 'Praise' : 'Incident'}
                      variant={isPositive ? 'success' : 'danger'}
                      size="sm"
                      rounded
                    />
                  </View>

                  {item.category ? (
                    <Text style={[styles.categoryTag, { color: colors.primary, fontWeight: '600' }]}>
                      Category: {item.category}
                    </Text>
                  ) : null}

                  <Text style={[styles.desc, { color: colors.textSecondary }]}>
                    {item.description}
                  </Text>

                  {item.action_taken ? (
                    <View style={[styles.actionBox, { backgroundColor: colors.surfaceAlt }]}>
                      <Text style={[styles.actionLabel, { color: colors.textTertiary }]}>Action / Resolution:</Text>
                      <Text style={[styles.actionText, { color: colors.text }]}>{item.action_taken}</Text>
                    </View>
                  ) : null}

                  <View style={styles.footerRow}>
                    <Text style={[styles.dateText, { color: colors.textTertiary }]}>
                      {formatDateLong(item.date)}
                    </Text>

                    <TouchableOpacity
                      style={[styles.deleteBtn, { backgroundColor: colors.dangerBg }]}
                      onPress={() => setDeleteTargetId(item.id)}
                      activeOpacity={0.75}
                    >
                      <Icon name="trash-alt" size={11} color={colors.danger} />
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
          setShowForm(true);
        }}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Log Behaviour"
      >
        <Icon name="plus" size={20} color="#fff" solid />
      </TouchableOpacity>

      {/* Log Behaviour Bottom Sheet */}
      <AppBottomSheet
        visible={showForm}
        onClose={() => setShowForm(false)}
        title="Log Student Behaviour"
        subtitle="Document recognition praise or disciplinary incident"
      >
        <View style={{ gap: spacing.xs }}>
          <View style={styles.typeSwitcher}>
            <TouchableOpacity
              style={[
                styles.typeOption,
                form.type === 'positive'
                  ? { backgroundColor: colors.success, borderColor: colors.success }
                  : { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
              ]}
              onPress={() => setForm(f => ({ ...f, type: 'positive', category_id: '' }))}
            >
              <Icon name="star" size={13} color={form.type === 'positive' ? '#fff' : colors.success} solid />
              <Text
                style={[
                  styles.typeOptionText,
                  { color: form.type === 'positive' ? '#fff' : colors.text },
                ]}
              >
                Positive Recognition
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.typeOption,
                form.type === 'negative'
                  ? { backgroundColor: colors.danger, borderColor: colors.danger }
                  : { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
              ]}
              onPress={() => setForm(f => ({ ...f, type: 'negative', category_id: '' }))}
            >
              <Icon name="exclamation-triangle" size={13} color={form.type === 'negative' ? '#fff' : colors.danger} solid />
              <Text
                style={[
                  styles.typeOptionText,
                  { color: form.type === 'negative' ? '#fff' : colors.text },
                ]}
              >
                Incident Flag
              </Text>
            </TouchableOpacity>
          </View>

          <AppInput
            label="Student ID / GR Number *"
            value={form.student_id}
            onChangeText={v => setForm(f => ({ ...f, student_id: v }))}
            icon="id-card"
            placeholder="Enter Student ID number"
            keyboardType="number-pad"
          />

          {categoryOptions.length > 0 && (
            <AppSelect
              label="Behaviour Category"
              value={form.category_id}
              options={categoryOptions}
              onSelect={v => setForm(f => ({ ...f, category_id: String(v) }))}
            />
          )}

          <AppDatePicker
            label="Incident / Award Date *"
            value={form.date}
            onChangeDate={d => setForm(f => ({ ...f, date: d }))}
          />

          <AppInput
            label="Detailed Description *"
            value={form.description}
            onChangeText={v => setForm(f => ({ ...f, description: v }))}
            icon="align-left"
            placeholder="Describe what occurred or accomplishments..."
            multiline
          />

          <AppInput
            label="Action Taken / Resolution Notes"
            value={form.action_taken}
            onChangeText={v => setForm(f => ({ ...f, action_taken: v }))}
            icon="clipboard-check"
            placeholder="Counseling, parent meeting, or award badge..."
            multiline
          />

          <AppButton
            label="Record Behaviour Log"
            iconLeft="save"
            variant="primary"
            size="lg"
            onPress={saveBehaviour}
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
        title="Delete Behaviour Entry"
        message="Are you sure you want to remove this student behaviour record from official logs?"
        confirmLabel="Delete Record"
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
  statsRow: {
    flexDirection: 'row',
    padding: spacing.base,
    gap: spacing.md,
    borderBottomWidth: 1,
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
  studentName: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
  },
  studentMeta: {
    fontSize: typography.size.xs,
    marginTop: 2,
  },
  categoryTag: {
    fontSize: typography.size.xs,
  },
  desc: {
    fontSize: typography.size.xs,
    lineHeight: 18,
  },
  actionBox: {
    padding: spacing.sm,
    borderRadius: radius.md,
    marginTop: 2,
  },
  actionLabel: {
    fontSize: typography.size['2xs'],
    fontWeight: typography.weight.bold,
    textTransform: 'uppercase',
  },
  actionText: {
    fontSize: typography.size.xs,
    marginTop: 1,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  dateText: {
    fontSize: typography.size['2xs'],
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeSwitcher: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  typeOptionText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
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
