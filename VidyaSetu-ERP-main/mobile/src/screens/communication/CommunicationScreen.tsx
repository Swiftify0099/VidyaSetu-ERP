/**
 * VidyaSetu Mobile — Communication Screen
 * Announcements + Messages.
 * All roles.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal,
  TextInput, ActivityIndicator, ScrollView, RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from '../../theme/ThemeContext';
import { communicationAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { spacing, radius, typography, shadows } from '../../theme';
import { formatDateLong, timeAgo, getErrorMessage } from '../../utils/formatters';
import Badge from '../../components/ui/Badge';
import PremiumCard from '../../components/ui/PremiumCard';
import SectionHeader from '../../components/ui/SectionHeader';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
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

const PRIORITY_COLOR: Record<string, string> = {
  urgent: '#dc2626',
  high:   '#ea580c',
  normal: '#6366f1',
  low:    '#6b7280',
};

const PRIORITY_VARIANT: Record<string, any> = {
  urgent: 'danger',
  high:   'warning',
  normal: 'primary',
  low:    'default',
};

const AUDIENCE_OPTIONS = ['all', 'teachers', 'students', 'parents', 'staff'];

const EMPTY_FORM = {
  title: '',
  content: '',
  priority: 'normal',
  target_audience: 'all',
};

export default function CommunicationScreen({ navigation }: { navigation: any }) {
  const { colors } = useTheme();
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
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  }, [priorityFilter]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  const markRead = async (id: number) => {
    try {
      await communicationAPI.markRead(id);
      setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a));
    } catch { /* ignore */ }
  };

  const createAnnouncement = async () => {
    if (!form.title.trim()) { Toast.show({ type: 'error', text1: 'Title is required' }); return; }
    if (!form.content.trim()) { Toast.show({ type: 'error', text1: 'Content is required' }); return; }
    setSaving(true);
    try {
      await communicationAPI.createAnnouncement(form);
      Toast.show({ type: 'success', text1: 'Announcement published!' });
      setShowCreate(false);
      setForm({ ...EMPTY_FORM });
      load();
    } catch (e) {
      Toast.show({ type: 'error', text1: getErrorMessage(e) });
    } finally { setSaving(false); }
  };

  const unreadCount = announcements.filter(a => !a.is_read).length;

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      {/* Tabs */}
      <View style={[s.tabs, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[s.tab, tab === 'announcements' && { borderBottomColor: colors.primary, borderBottomWidth: 2.5 }]}
          onPress={() => setTab('announcements')}
        >
          <View style={s.tabInner}>
            <Text style={[s.tabText, { color: tab === 'announcements' ? colors.primary : colors.textSecondary }]}>
              Announcements
            </Text>
            {unreadCount > 0 && (
              <View style={[s.unreadBadge, { backgroundColor: colors.danger }]}>
                <Text style={s.unreadCount}>{unreadCount}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tab, tab === 'messages' && { borderBottomColor: colors.primary, borderBottomWidth: 2.5 }]}
          onPress={() => setTab('messages')}
        >
          <Text style={[s.tabText, { color: tab === 'messages' ? colors.primary : colors.textSecondary }]}>
            Messages
          </Text>
        </TouchableOpacity>
      </View>

      {tab === 'announcements' ? (
        <>
          {/* Priority Filter */}
          <View style={[s.filterRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <TouchableOpacity
              style={[s.filterChip, !priorityFilter && { backgroundColor: colors.primary }]}
              onPress={() => setPriorityFilter(null)}
            >
              <Text style={[s.filterChipText, !priorityFilter && { color: '#fff' }]}>All</Text>
            </TouchableOpacity>
            {Object.keys(PRIORITY_COLOR).map(p => (
              <TouchableOpacity
                key={p}
                style={[s.filterChip, priorityFilter === p && { backgroundColor: PRIORITY_COLOR[p] }]}
                onPress={() => setPriorityFilter(priorityFilter === p ? null : p)}
              >
                <Text style={[s.filterChipText, priorityFilter === p && { color: '#fff' }]}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
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
              data={announcements}
              keyExtractor={a => String(a.id)}
              contentContainerStyle={{ padding: spacing.base, paddingBottom: 100 }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              renderItem={({ item }) => (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => { if (!item.is_read) markRead(item.id); }}
                >
                  <PremiumCard
                    variant={item.is_read ? 'flat' : 'bordered'}
                    padding={12}
                    style={[
                      s.annCard,
                      !item.is_read && { borderLeftWidth: 4, borderLeftColor: PRIORITY_COLOR[item.priority] ?? colors.primary },
                    ]}
                  >
                    <View style={s.annRow}>
                      <View style={[s.annIcon, { backgroundColor: `${PRIORITY_COLOR[item.priority] ?? colors.primary}18` }]}>
                        <Icon
                          name={item.priority === 'urgent' ? 'exclamation-triangle' : 'bullhorn'}
                          size={16}
                          color={PRIORITY_COLOR[item.priority] ?? colors.primary}
                          solid
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={s.annTitleRow}>
                          <Text style={[s.annTitle, { color: colors.text }, !item.is_read && s.annTitleUnread]} numberOfLines={1}>
                            {item.title}
                          </Text>
                          <Badge
                            label={item.priority}
                            variant={PRIORITY_VARIANT[item.priority]}
                            size="sm" rounded
                          />
                        </View>
                        <Text style={[s.annContent, { color: colors.textSecondary }]} numberOfLines={3}>
                          {item.content}
                        </Text>
                        <View style={s.annMeta}>
                          {item.author_name && (
                            <Text style={[s.annAuthor, { color: colors.textTertiary }]}>
                              👤 {item.author_name}
                            </Text>
                          )}
                          <Text style={[s.annDate, { color: colors.textTertiary }]}>
                            🕐 {timeAgo(item.created_at)}
                          </Text>
                          {!item.is_read && (
                            <View style={[s.unreadDot, { backgroundColor: colors.primary }]} />
                          )}
                        </View>
                      </View>
                    </View>
                  </PremiumCard>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={s.emptyWrap}>
                  <Text style={s.emptyIcon}>📢</Text>
                  <Text style={[s.emptyText, { color: colors.textSecondary }]}>No announcements</Text>
                </View>
              }
            />
          )}
        </>
      ) : (
        <View style={s.messagesPlaceholder}>
          <Icon name="comments" size={48} color={colors.textTertiary} />
          <Text style={[s.messagesTitle, { color: colors.text }]}>Messages</Text>
          <Text style={[s.messagesSubtitle, { color: colors.textSecondary }]}>
            Direct messaging between staff members
          </Text>
          <TouchableOpacity
            style={[s.composeBtn, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('ComposeMessage')}
          >
            <Icon name="pen" size={14} color="#fff" solid />
            <Text style={s.composeBtnText}>Compose Message</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* FAB */}
      {canCreate && tab === 'announcements' && (
        <TouchableOpacity
          style={[s.fab, { backgroundColor: colors.primary }]}
          onPress={() => { setForm({ ...EMPTY_FORM }); setShowCreate(true); }}
        >
          <Icon name="plus" size={20} color="#fff" solid />
        </TouchableOpacity>
      )}

      {/* Create Announcement Modal */}
      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet">
        <View style={[s.modal, { backgroundColor: colors.background }]}>
          <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowCreate(false)}>
              <Icon name="times" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={[s.modalTitle, { color: colors.text }]}>Create Announcement</Text>
            <TouchableOpacity onPress={createAnnouncement} disabled={saving}>
              {saving
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Text style={[s.saveText, { color: colors.primary }]}>Publish</Text>}
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: spacing.base, gap: 14 }}>
            <View>
              <Text style={[s.label, { color: colors.textSecondary }]}>Title *</Text>
              <TextInput
                style={[s.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                value={form.title}
                onChangeText={v => setForm(f => ({ ...f, title: v }))}
                placeholder="Announcement title..."
                placeholderTextColor={colors.placeholder}
              />
            </View>
            <View>
              <Text style={[s.label, { color: colors.textSecondary }]}>Content *</Text>
              <TextInput
                style={[s.input, s.textarea, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                value={form.content}
                onChangeText={v => setForm(f => ({ ...f, content: v }))}
                placeholder="Announcement details..."
                placeholderTextColor={colors.placeholder}
                multiline
                numberOfLines={5}
              />
            </View>
            <View>
              <Text style={[s.label, { color: colors.textSecondary }]}>Priority</Text>
              <View style={s.chips}>
                {Object.keys(PRIORITY_COLOR).map(p => (
                  <TouchableOpacity
                    key={p}
                    style={[s.chip, form.priority === p && { backgroundColor: PRIORITY_COLOR[p] }]}
                    onPress={() => setForm(f => ({ ...f, priority: p }))}
                  >
                    <Text style={[s.chipText, form.priority === p && { color: '#fff' }]}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View>
              <Text style={[s.label, { color: colors.textSecondary }]}>Target Audience</Text>
              <View style={s.chips}>
                {AUDIENCE_OPTIONS.map(a => (
                  <TouchableOpacity
                    key={a}
                    style={[s.chip, form.target_audience === a && { backgroundColor: colors.primary }]}
                    onPress={() => setForm(f => ({ ...f, target_audience: a }))}
                  >
                    <Text style={[s.chipText, form.target_audience === a && { color: '#fff' }]}>
                      {a.charAt(0).toUpperCase() + a.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
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
  tabInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tabText: { fontSize: typography.size.sm, fontWeight: typography.weight.semibold },
  unreadBadge: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  unreadCount: { color: '#fff', fontSize: 9, fontWeight: '900' },
  filterRow: {
    flexDirection: 'row', paddingHorizontal: spacing.sm, paddingVertical: 8,
    gap: 6, borderBottomWidth: 1,
  },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.full,
    backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb',
  },
  filterChipText: { fontSize: typography.size.xs, fontWeight: typography.weight.bold, color: '#6b7280' },
  annCard: { borderRadius: radius.xl },
  annRow: { flexDirection: 'row', gap: spacing.sm },
  annIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  annTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
  annTitle: { fontSize: typography.size.base, fontWeight: typography.weight.semibold, flex: 1, marginRight: 6 },
  annTitleUnread: { fontWeight: typography.weight.bold },
  annContent: { fontSize: typography.size.sm, lineHeight: 18, marginBottom: 6 },
  annMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  annAuthor: { fontSize: typography.size.xs },
  annDate: { fontSize: typography.size.xs },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 'auto' },
  messagesPlaceholder: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: spacing.xl, gap: spacing.md,
  },
  messagesTitle: { fontSize: typography.size.xl, fontWeight: typography.weight.bold },
  messagesSubtitle: { fontSize: typography.size.base, textAlign: 'center' },
  composeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: radius.full, marginTop: 8,
  },
  composeBtnText: { color: '#fff', fontWeight: typography.weight.bold },
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
  textarea: { height: 120, textAlignVertical: 'top', paddingTop: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full,
    backgroundColor: '#f3f4f6', borderWidth: 1.5, borderColor: '#e5e7eb',
  },
  chipText: { fontSize: typography.size.sm, fontWeight: typography.weight.semibold, color: '#6b7280' },
});
