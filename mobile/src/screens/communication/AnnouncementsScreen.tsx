/**
 * VidyaSetu Mobile — Announcements Screen (Premium Redesign)
 * ============================================================
 * School-wide circulars, event alerts, academic notices, and exam updates
 * with category filters and authoring bottom sheet.
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
import { formatDateLong, timeAgo } from '../../utils/formatters';
import {
  AppCard,
  AppBadge,
  AppChip,
  AppButton,
  AppInput,
  AppSelect,
  AppBottomSheet,
  AppEmptyState,
  AppSkeleton,
} from '../../components/ui';
import Toast from 'react-native-toast-message';
import { getErrorMessage } from '../../utils/formatters';

interface Announcement {
  id: number;
  title: string;
  content: string;
  type?: string;
  priority?: string;
  is_pinned?: boolean;
  created_at: string;
  publisher_name?: string;
}

const TYPE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  general:   { label: 'General Notice', icon: 'bullhorn',             color: '#6366f1' },
  academic:  { label: 'Academic',       icon: 'book',                 color: '#3b82f6' },
  event:     { label: 'Event / Sports', icon: 'glass-cheers',         color: '#10b981' },
  exam:      { label: 'Exam Update',    icon: 'file-alt',             color: '#f59e0b' },
  fee:       { label: 'Fee Reminder',   icon: 'rupee-sign',           color: '#ef4444' },
  urgent:    { label: 'Urgent Alert',   icon: 'exclamation-triangle', color: '#dc2626' },
  holiday:   { label: 'Holiday',        icon: 'calendar-check',       color: '#059669' },
  emergency: { label: 'Emergency',      icon: 'exclamation-circle',   color: '#dc2626' },
};

const TYPE_OPTIONS = Object.entries(TYPE_CONFIG).map(([k, v]) => ({
  label: v.label,
  value: k,
}));

export default function AnnouncementsScreen() {
  const { colors, roleAccent } = useTheme();
  const { user } = useAuthStore();
  const role = user?.roles?.[0]?.code ?? '';
  const canPublish = ['admin', 'super_admin', 'principal', 'teacher'].includes(role);

  const [items, setItems] = useState<Announcement[]>([]);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', type: 'general' });

  const loadData = useCallback(async () => {
    try {
      const res = await communicationAPI.getAnnouncements({ limit: 40 });
      const list = res.data?.data?.items ?? res.data?.data ?? [];
      setItems(Array.isArray(list) ? list : []);
    } catch {
      setItems([]);
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
    if (!form.title.trim() || !form.content.trim()) {
      Toast.show({ type: 'error', text1: 'Title and content are required' });
      return;
    }
    setSaving(true);
    try {
      await communicationAPI.createAnnouncement({
        title: form.title,
        content: form.content,
        type: form.type,
      });
      Toast.show({ type: 'success', text1: 'Notice Published Successfully' });
      setShowModal(false);
      setForm({ title: '', content: '', type: 'general' });
      loadData();
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Failed to publish notice', text2: getErrorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    return items.filter(item => !selectedType || item.type === selectedType);
  }, [items, selectedType]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Category filter bar */}
      <View style={[styles.filterBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.xs }}
        >
          <AppChip
            label="All Notices"
            selected={selectedType === null}
            onPress={() => setSelectedType(null)}
          />
          {Object.keys(TYPE_CONFIG).map(t => (
            <AppChip
              key={t}
              label={TYPE_CONFIG[t].label}
              icon={TYPE_CONFIG[t].icon}
              selected={selectedType === t}
              onPress={() => setSelectedType(selectedType === t ? null : t)}
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
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <AppEmptyState
              icon="bullhorn"
              title="No Notices in this Category"
              description="No announcements or circulars found matching the selected filter."
              actionLabel={canPublish ? 'Publish Notice' : undefined}
              onAction={canPublish ? () => setShowModal(true) : undefined}
              style={{ flex: 1 }}
            />
          }
          renderItem={({ item }) => {
            const cfg = TYPE_CONFIG[item.type ?? 'general'] ?? TYPE_CONFIG.general;
            return (
              <AppCard
                variant="bordered"
                padding={14}
                style={{ borderLeftWidth: 3.5, borderLeftColor: cfg.color }}
              >
                <View style={{ gap: 6 }}>
                  <View style={styles.cardHeader}>
                    <View style={styles.typeRow}>
                      <Icon name={cfg.icon} size={11} color={cfg.color} solid />
                      <Text style={[styles.typeLabel, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                    {item.is_pinned && (
                      <AppBadge label="Pinned" variant="warning" size="sm" rounded />
                    )}
                  </View>

                  <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
                  <Text style={[styles.body, { color: colors.textSecondary }]} numberOfLines={3}>
                    {item.content}
                  </Text>

                  <View style={styles.footer}>
                    <View style={styles.dateRow}>
                      <Icon name="clock" size={10} color={colors.textTertiary} />
                      <Text style={[styles.dateText, { color: colors.textTertiary }]}>
                        {timeAgo(item.created_at)} • {formatDateLong(item.created_at)}
                      </Text>
                    </View>
                    {item.publisher_name && (
                      <Text style={[styles.publisher, { color: colors.textTertiary }]}>
                        By {item.publisher_name}
                      </Text>
                    )}
                  </View>
                </View>
              </AppCard>
            );
          }}
        />
      )}

      {/* Floating Create Button */}
      {canPublish && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary, ...shadows.lg }]}
          onPress={() => setShowModal(true)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Publish Notice"
        >
          <Icon name="plus" size={20} color="#fff" solid />
        </TouchableOpacity>
      )}

      {/* Publish Notice Bottom Sheet */}
      <AppBottomSheet
        visible={showModal}
        onClose={() => setShowModal(false)}
        title="Publish School Announcement"
        subtitle="Broadcast notice to staff, students and parents"
      >
        <View style={{ gap: spacing.xs }}>
          <AppInput
            label="Notice Title *"
            value={form.title}
            onChangeText={v => setForm(f => ({ ...f, title: v }))}
            icon="heading"
            placeholder="e.g. Annual Sports Day 2026 Schedule"
          />

          <AppSelect
            label="Notice Category *"
            value={form.type}
            options={TYPE_OPTIONS}
            onSelect={v => setForm(f => ({ ...f, type: String(v) }))}
          />

          <AppInput
            label="Notice Content *"
            value={form.content}
            onChangeText={v => setForm(f => ({ ...f, content: v }))}
            icon="align-left"
            placeholder="Write full circular or announcement text..."
            multiline
          />

          <AppButton
            label="Publish Broadcast"
            iconLeft="paper-plane"
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
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeLabel: {
    fontSize: typography.size['2xs'],
    fontWeight: typography.weight.bold,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
  },
  body: {
    fontSize: typography.size.xs,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: typography.size['2xs'],
  },
  publisher: {
    fontSize: typography.size['2xs'],
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
