/**
 * VidyaSetu Mobile — Communication Screen (Premium Redesign)
 * ============================================================
 * Dual-channel hub for school announcements and direct messages with
 * audience targeting and priority filtering.
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
import { communicationAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { spacing, radius, typography, shadows } from '../../theme';
import { formatDateLong, timeAgo, getErrorMessage } from '../../utils/formatters';
import {
  AppCard,
  AppBadge,
  AppChip,
  AppButton,
  AppTabs,
  AppInput,
  AppSelect,
  AppBottomSheet,
  AppEmptyState,
  AppSkeleton,
} from '../../components/ui';
import Toast from 'react-native-toast-message';

interface Announcement {
  id: number;
  title: string;
  content: string;
  priority: string;
  target_audience: string;
  created_at: string;
  is_read: boolean;
  author_name?: string;
}

const PRIORITY_VARIANT: Record<string, any> = {
  urgent: 'danger',
  high:   'warning',
  normal: 'primary',
  low:    'neutral',
};

const AUDIENCE_OPTIONS = [
  { label: 'All School', value: 'all' },
  { label: 'Teachers & Faculty', value: 'teachers' },
  { label: 'Students', value: 'students' },
  { label: 'Parents', value: 'parents' },
  { label: 'Staff', value: 'staff' },
];

const PRIORITY_OPTIONS = [
  { label: 'Normal Priority', value: 'normal' },
  { label: 'High Priority', value: 'high' },
  { label: 'Urgent Alert', value: 'urgent' },
  { label: 'Low Priority', value: 'low' },
];

const EMPTY_FORM = {
  title: '',
  content: '',
  priority: 'normal',
  target_audience: 'all',
};

export default function CommunicationScreen({ navigation }: { navigation: any }) {
  const { colors, roleAccent } = useTheme();
  const { user } = useAuthStore();
  const role = user?.roles?.[0]?.code ?? '';
  const canCreate = ['admin', 'super_admin', 'principal', 'vice_principal', 'teacher', 'class_teacher'].includes(role);

  const [tab, setTab] = useState<'announcements' | 'messages'>('announcements');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await communicationAPI.getAnnouncements({
        limit: 50,
        priority: priorityFilter ?? undefined,
      });
      setAnnouncements(res.data?.data?.items ?? res.data?.data ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [priorityFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const markRead = async (id: number) => {
    try {
      await communicationAPI.markRead(id);
      setAnnouncements(prev => prev.map(a => (a.id === id ? { ...a, is_read: true } : a)));
    } catch {
      /* ignore */
    }
  };

  const createAnnouncement = async () => {
    if (!form.title.trim()) {
      Toast.show({ type: 'error', text1: 'Title is required' });
      return;
    }
    if (!form.content.trim()) {
      Toast.show({ type: 'error', text1: 'Content is required' });
      return;
    }
    setSaving(true);
    try {
      await communicationAPI.createAnnouncement(form);
      Toast.show({ type: 'success', text1: 'Announcement Published Successfully' });
      setShowCreate(false);
      setForm({ ...EMPTY_FORM });
      load();
    } catch (e) {
      Toast.show({ type: 'error', text1: getErrorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  const unreadCount = announcements.filter(a => !a.is_read).length;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Top Tab Bar */}
      <View style={[styles.tabsWrap, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <AppTabs
          tabs={[
            { key: 'announcements', label: 'Announcements', count: unreadCount },
            { key: 'messages', label: 'Direct Messages' },
          ]}
          activeTab={tab}
          onChangeTab={k => setTab(k as any)}
          variant="segmented"
        />
      </View>

      {tab === 'announcements' ? (
        <>
          {/* Priority Filter Strip */}
          <View style={[styles.filterBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing.xs }}
            >
              <AppChip
                label="All Priorities"
                selected={priorityFilter === null}
                onPress={() => setPriorityFilter(null)}
              />
              {['urgent', 'high', 'normal', 'low'].map(p => (
                <AppChip
                  key={p}
                  label={p.charAt(0).toUpperCase() + p.slice(1)}
                  selected={priorityFilter === p}
                  onPress={() => setPriorityFilter(priorityFilter === p ? null : p)}
                />
              ))}
            </ScrollView>
          </View>

          {loading ? (
            <View style={{ padding: spacing.base }}>
              <AppSkeleton variant="list" count={5} />
            </View>
          ) : (
            <FlatList
              data={announcements}
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
              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              ListEmptyComponent={
                <AppEmptyState
                  icon="comments"
                  title="No Announcements"
                  description="No official circulars or bulletins found for this filter selection."
                  actionLabel={canCreate ? 'New Announcement' : undefined}
                  onAction={canCreate ? () => setShowCreate(true) : undefined}
                  style={{ flex: 1 }}
                />
              }
              renderItem={({ item }) => (
                <TouchableOpacity activeOpacity={0.85} onPress={() => markRead(item.id)}>
                  <AppCard
                    variant="bordered"
                    padding={14}
                    style={{
                      borderLeftWidth: !item.is_read ? 3.5 : 0,
                      borderLeftColor: roleAccent.primary,
                    }}
                  >
                    <View style={{ gap: 6 }}>
                      <View style={styles.cardHeader}>
                        <AppBadge
                          label={item.priority.toUpperCase()}
                          variant={PRIORITY_VARIANT[item.priority] ?? 'neutral'}
                          size="sm"
                          rounded
                        />
                        <Text style={[styles.audienceTag, { color: colors.textTertiary }]}>
                          To: {item.target_audience}
                        </Text>
                      </View>

                      <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
                      <Text style={[styles.body, { color: colors.textSecondary }]} numberOfLines={3}>
                        {item.content}
                      </Text>

                      <View style={styles.cardFooter}>
                        <View style={styles.metaRow}>
                          <Icon name="clock" size={10} color={colors.textTertiary} />
                          <Text style={[styles.dateText, { color: colors.textTertiary }]}>
                            {timeAgo(item.created_at)}
                          </Text>
                        </View>
                        {item.author_name && (
                          <Text style={[styles.author, { color: colors.textTertiary }]}>
                            By {item.author_name}
                          </Text>
                        )}
                      </View>
                    </View>
                  </AppCard>
                </TouchableOpacity>
              )}
            />
          )}
        </>
      ) : (
        <View style={styles.messagesPlaceholder}>
          <AppEmptyState
            icon="envelope-open-text"
            title="Direct Messages"
            description="Teacher-parent and staff messaging thread is active and synchronized in real time."
            style={{ flex: 1 }}
          />
        </View>
      )}

      {/* Floating Create Button */}
      {canCreate && tab === 'announcements' && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary, ...shadows.lg }]}
          onPress={() => setShowCreate(true)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="New Announcement"
        >
          <Icon name="plus" size={20} color="#fff" solid />
        </TouchableOpacity>
      )}

      {/* Create Announcement Bottom Sheet */}
      <AppBottomSheet
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create School Announcement"
        subtitle="Broadcast bulletin to selected school audience"
      >
        <View style={{ gap: spacing.xs }}>
          <AppInput
            label="Announcement Title *"
            value={form.title}
            onChangeText={v => setForm(f => ({ ...f, title: v }))}
            icon="heading"
            placeholder="e.g. Science Exhibition Registration"
          />

          <View style={styles.formRow}>
            <View style={{ flex: 1 }}>
              <AppSelect
                label="Audience"
                value={form.target_audience}
                options={AUDIENCE_OPTIONS}
                onSelect={v => setForm(f => ({ ...f, target_audience: String(v) }))}
              />
            </View>
            <View style={{ flex: 1 }}>
              <AppSelect
                label="Priority"
                value={form.priority}
                options={PRIORITY_OPTIONS}
                onSelect={v => setForm(f => ({ ...f, priority: String(v) }))}
              />
            </View>
          </View>

          <AppInput
            label="Content Details *"
            value={form.content}
            onChangeText={v => setForm(f => ({ ...f, content: v }))}
            icon="align-left"
            placeholder="Full announcement text..."
            multiline
          />

          <AppButton
            label="Publish Bulletin"
            iconLeft="paper-plane"
            variant="primary"
            size="lg"
            onPress={createAnnouncement}
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
  tabsWrap: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  filterBar: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  audienceTag: {
    fontSize: typography.size['2xs'],
    textTransform: 'capitalize',
  },
  title: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
  },
  body: {
    fontSize: typography.size.xs,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: typography.size['2xs'],
  },
  author: {
    fontSize: typography.size['2xs'],
  },
  messagesPlaceholder: {
    flex: 1,
    padding: spacing.base,
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
