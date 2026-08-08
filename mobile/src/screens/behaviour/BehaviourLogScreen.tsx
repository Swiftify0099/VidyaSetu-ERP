/**
 * VidyaSetu Mobile — Behaviour Log Screen
 * Teacher logs positive/negative behaviour events for students.
 * admin, teacher, class_teacher, principal
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal,
  TextInput, Alert, ActivityIndicator, ScrollView, RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from '../../theme/ThemeContext';
import { behaviourAPI } from '../../services/api';
import { spacing, radius, typography, shadows } from '../../theme';
import { formatDateLong, getErrorMessage } from '../../utils/formatters';
import PremiumCard from '../../components/ui/PremiumCard';
import SectionHeader from '../../components/ui/SectionHeader';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import Badge from '../../components/ui/Badge';
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

interface Category { id: number; name: string; type: string; }

const EMPTY_FORM = {
  student_id: '',
  student_name_display: '',
  type: 'positive' as 'positive' | 'negative',
  category_id: '',
  description: '',
  date: new Date().toISOString().split('T')[0],
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

  const load = useCallback(async () => {
    try {
      const [logsRes, catsRes] = await Promise.allSettled([
        behaviourAPI.list({ limit: 50 }),
        behaviourAPI.getCategories(),
      ]);
      if (logsRes.status === 'fulfilled') setLogs(logsRes.value.data?.data?.items ?? logsRes.value.data?.data ?? []);
      if (catsRes.status === 'fulfilled') setCategories(catsRes.value.data?.data ?? []);
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  const saveBehaviour = async () => {
    if (!form.student_id.trim()) { Toast.show({ type: 'error', text1: 'Student ID is required' }); return; }
    if (!form.description.trim()) { Toast.show({ type: 'error', text1: 'Description is required' }); return; }
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
      Toast.show({ type: 'success', text1: 'Behaviour logged successfully' });
      setShowForm(false);
      setForm({ ...EMPTY_FORM });
      load();
    } catch (e) {
      Toast.show({ type: 'error', text1: getErrorMessage(e) });
    } finally { setSaving(false); }
  };

  const deleteLog = (id: number) => {
    Alert.alert('Delete Log', 'Are you sure you want to delete this record?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await behaviourAPI.delete(id);
            Toast.show({ type: 'success', text1: 'Log deleted' });
            load();
          } catch (e) { Toast.show({ type: 'error', text1: getErrorMessage(e) }); }
        },
      },
    ]);
  };

  const filtered = logs.filter(l =>
    typeFilter === 'all' ? true : l.type === typeFilter
  );

  const positiveCount = logs.filter(l => l.type === 'positive').length;
  const negativeCount = logs.filter(l => l.type === 'negative').length;

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      {/* Stats Bar */}
      <View style={[s.statsBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={s.statsWrap}>
          <View style={[s.statChip, { backgroundColor: colors.successBg }]}>
            <Text style={s.statEmoji}>🌟</Text>
            <Text style={[s.statNum, { color: colors.success }]}>{positiveCount}</Text>
            <Text style={[s.statLbl, { color: colors.success }]}>Positive</Text>
          </View>
          <View style={[s.statChip, { backgroundColor: colors.dangerBg }]}>
            <Text style={s.statEmoji}>⚠️</Text>
            <Text style={[s.statNum, { color: colors.danger }]}>{negativeCount}</Text>
            <Text style={[s.statLbl, { color: colors.danger }]}>Incidents</Text>
          </View>
        </View>
      </View>

      {/* Type Filter */}
      <View style={[s.filterRow, { borderBottomColor: colors.border }]}>
        {(['all', 'positive', 'negative'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[
              s.filterBtn,
              typeFilter === f && {
                backgroundColor: f === 'positive' ? colors.success : f === 'negative' ? colors.danger : colors.primary,
              },
            ]}
            onPress={() => setTypeFilter(f)}
          >
            <Text style={[s.filterBtnText, typeFilter === f && { color: '#fff' }]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
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
          keyExtractor={l => String(l.id)}
          contentContainerStyle={{ padding: spacing.base, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => (
            <PremiumCard
              variant="bordered"
              padding={12}
              style={{ borderLeftWidth: 4, borderLeftColor: item.type === 'positive' ? colors.success : colors.danger }}
            >
              <View style={s.logRow}>
                <View style={[
                  s.logIcon,
                  { backgroundColor: item.type === 'positive' ? colors.successBg : colors.dangerBg },
                ]}>
                  <Text style={{ fontSize: 22 }}>{item.type === 'positive' ? '🌟' : '⚠️'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.logTitleRow}>
                    <Text style={[s.studentName, { color: colors.text }]}>{item.student_name}</Text>
                    <Badge
                      label={item.type}
                      variant={item.type === 'positive' ? 'success' : 'danger'}
                      size="sm" rounded
                    />
                  </View>
                  <Text style={[s.logMeta, { color: colors.textSecondary }]}>
                    Std {item.standard}-{item.division} • {item.category}
                  </Text>
                  <Text style={[s.logDesc, { color: colors.text }]}>{item.description}</Text>
                  {item.action_taken && (
                    <Text style={[s.actionTaken, { color: colors.textTertiary }]}>
                      🔧 Action: {item.action_taken}
                    </Text>
                  )}
                  <Text style={[s.logDate, { color: colors.textTertiary }]}>
                    📅 {formatDateLong(item.date)}
                    {item.recorded_by_name ? ` • By: ${item.recorded_by_name}` : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[s.deleteBtn, { backgroundColor: colors.dangerBg }]}
                  onPress={() => deleteLog(item.id)}
                >
                  <Icon name="trash" size={13} color={colors.danger} solid />
                </TouchableOpacity>
              </View>
            </PremiumCard>
          )}
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <Text style={s.emptyIcon}>📝</Text>
              <Text style={[s.emptyText, { color: colors.textSecondary }]}>No behaviour records found</Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[s.fab, { backgroundColor: colors.primary }]}
        onPress={() => { setForm({ ...EMPTY_FORM }); setShowForm(true); }}
      >
        <Icon name="plus" size={20} color="#fff" solid />
      </TouchableOpacity>

      {/* Log Form Modal */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <View style={[s.modal, { backgroundColor: colors.background }]}>
          <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <Icon name="times" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={[s.modalTitle, { color: colors.text }]}>Log Behaviour</Text>
            <TouchableOpacity onPress={saveBehaviour} disabled={saving}>
              {saving
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Text style={[s.saveText, { color: colors.primary }]}>Save</Text>}
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: spacing.base, gap: 14 }}>
            <View>
              <Text style={[s.label, { color: colors.textSecondary }]}>Student ID *</Text>
              <TextInput
                style={[s.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                value={form.student_id}
                onChangeText={v => setForm(f => ({ ...f, student_id: v }))}
                placeholder="Student ID or GR Number..."
                placeholderTextColor={colors.placeholder}
                keyboardType="numeric"
              />
            </View>
            <View>
              <Text style={[s.label, { color: colors.textSecondary }]}>Type</Text>
              <View style={s.typeRow}>
                <TouchableOpacity
                  style={[s.typeBtn, form.type === 'positive' && { backgroundColor: colors.success }]}
                  onPress={() => setForm(f => ({ ...f, type: 'positive' }))}
                >
                  <Text style={[s.typeBtnText, form.type === 'positive' && { color: '#fff' }]}>🌟 Positive</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.typeBtn, form.type === 'negative' && { backgroundColor: colors.danger }]}
                  onPress={() => setForm(f => ({ ...f, type: 'negative' }))}
                >
                  <Text style={[s.typeBtnText, form.type === 'negative' && { color: '#fff' }]}>⚠️ Incident</Text>
                </TouchableOpacity>
              </View>
            </View>
            {categories.length > 0 && (
              <View>
                <Text style={[s.label, { color: colors.textSecondary }]}>Category</Text>
                <View style={s.catChips}>
                  {categories
                    .filter(c => !form.type || c.type === form.type || c.type === 'both')
                    .map(c => (
                      <TouchableOpacity
                        key={c.id}
                        style={[s.catChip, form.category_id === String(c.id) && { backgroundColor: colors.primary }]}
                        onPress={() => setForm(f => ({ ...f, category_id: String(c.id) }))}
                      >
                        <Text style={[s.catChipText, form.category_id === String(c.id) && { color: '#fff' }]}>
                          {c.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                </View>
              </View>
            )}
            <View>
              <Text style={[s.label, { color: colors.textSecondary }]}>Date</Text>
              <TextInput
                style={[s.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                value={form.date}
                onChangeText={v => setForm(f => ({ ...f, date: v }))}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.placeholder}
              />
            </View>
            <View>
              <Text style={[s.label, { color: colors.textSecondary }]}>Description *</Text>
              <TextInput
                style={[s.input, s.textarea, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                value={form.description}
                onChangeText={v => setForm(f => ({ ...f, description: v }))}
                placeholder="Describe the behaviour..."
                placeholderTextColor={colors.placeholder}
                multiline
                numberOfLines={4}
              />
            </View>
            <View>
              <Text style={[s.label, { color: colors.textSecondary }]}>Action Taken (optional)</Text>
              <TextInput
                style={[s.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                value={form.action_taken}
                onChangeText={v => setForm(f => ({ ...f, action_taken: v }))}
                placeholder="What action was taken..."
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
  statsBar: { borderBottomWidth: 1, padding: spacing.sm },
  statsWrap: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  statChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.full },
  statEmoji: { fontSize: 18 },
  statNum: { fontSize: typography.size.xl, fontWeight: typography.weight.extrabold },
  statLbl: { fontSize: typography.size.sm, fontWeight: typography.weight.semibold },
  filterRow: { flexDirection: 'row', padding: spacing.sm, gap: 8, borderBottomWidth: 1 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.full, backgroundColor: '#f3f4f6', borderWidth: 1.5, borderColor: '#e5e7eb' },
  filterBtnText: { fontSize: typography.size.sm, fontWeight: typography.weight.bold, color: '#6b7280' },
  logRow: { flexDirection: 'row', gap: 10 },
  logIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  logTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  studentName: { fontSize: typography.size.base, fontWeight: typography.weight.bold, flex: 1, marginRight: 6 },
  logMeta: { fontSize: typography.size.xs, marginBottom: 4 },
  logDesc: { fontSize: typography.size.sm, marginBottom: 3 },
  actionTaken: { fontSize: typography.size.xs, marginBottom: 2, fontStyle: 'italic' },
  logDate: { fontSize: typography.size.xs },
  deleteBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  emptyWrap: { alignItems: 'center', padding: spacing.xl },
  emptyIcon: { fontSize: 44, marginBottom: 12 },
  emptyText: { fontSize: typography.size.base },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
  },
  modal: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.base, borderBottomWidth: 1 },
  modalTitle: { fontSize: typography.size.lg, fontWeight: typography.weight.bold },
  saveText: { fontSize: typography.size.base, fontWeight: typography.weight.bold },
  label: { fontSize: typography.size.xs, fontWeight: typography.weight.semibold, textTransform: 'uppercase', marginBottom: 6 },
  input: { height: 48, borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: spacing.md, fontSize: typography.size.base },
  textarea: { height: 100, textAlignVertical: 'top', paddingTop: 12 },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeBtn: { flex: 1, paddingVertical: 10, borderRadius: radius.md, alignItems: 'center', backgroundColor: '#f3f4f6', borderWidth: 1.5, borderColor: '#e5e7eb' },
  typeBtnText: { fontWeight: typography.weight.bold, color: '#6b7280' },
  catChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, backgroundColor: '#f3f4f6', borderWidth: 1.5, borderColor: '#e5e7eb' },
  catChipText: { fontSize: typography.size.sm, fontWeight: typography.weight.semibold, color: '#6b7280' },
});
