/**
 * VidyaSetu Mobile — Admission Management Screen
 * Admission applications, GR management, bulk promotion.
 * clerk, receptionist, admin
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal,
  TextInput, Alert, ActivityIndicator, ScrollView, RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from '../../theme/ThemeContext';
import { admissionAPI } from '../../services/api';
import { spacing, radius, typography } from '../../theme';
import { formatDateLong, formatStatus, getErrorMessage } from '../../utils/formatters';
import Badge from '../../components/ui/Badge';
import PremiumCard from '../../components/ui/PremiumCard';
import SectionHeader from '../../components/ui/SectionHeader';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import Toast from 'react-native-toast-message';
import { BLOOD_GROUPS, GENDER_OPTIONS } from '../../config/constants';

interface Admission {
  id: number;
  applicant_name: string;
  father_name?: string;
  mother_name?: string;
  date_of_birth?: string;
  gender?: string;
  mobile?: string;
  address?: string;
  standard_applied: string;
  status: string;
  applied_on: string;
  gr_number?: string;
  remarks?: string;
}

const EMPTY_FORM = {
  applicant_name: '',
  father_name: '',
  mother_name: '',
  date_of_birth: '',
  gender: 'male',
  mobile: '',
  address: '',
  standard_applied: '1',
  blood_group: '',
};

const CLASSES = ['1','2','3','4','5','6','7','8','9','10','11','12'];

export default function AdmissionManagementScreen({ navigation }: { navigation: any }) {
  const { colors } = useTheme();
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await admissionAPI.list({
        status: statusFilter ?? undefined,
        search: search || undefined,
      });
      setAdmissions(res.data?.data?.items ?? res.data?.data ?? []);
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  }, [statusFilter, search]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  const createAdmission = async () => {
    if (!form.applicant_name.trim()) { Toast.show({ type: 'error', text1: 'Applicant name is required' }); return; }
    setSaving(true);
    try {
      await admissionAPI.create(form);
      Toast.show({ type: 'success', text1: 'Admission application submitted!' });
      setShowForm(false);
      setForm({ ...EMPTY_FORM });
      load();
    } catch (e) {
      Toast.show({ type: 'error', text1: getErrorMessage(e) });
    } finally { setSaving(false); }
  };

  const approveAdmission = async (id: number) => {
    Alert.alert('Approve Admission', 'Approve this admission application? A GR number will be assigned.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          try {
            await admissionAPI.approve(id);
            Toast.show({ type: 'success', text1: 'Admission approved! GR number assigned.' });
            load();
          } catch (e) { Toast.show({ type: 'error', text1: getErrorMessage(e) }); }
        },
      },
    ]);
  };

  const rejectAdmission = async (id: number) => {
    Alert.alert('Reject Admission', 'Reject this admission application?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject', style: 'destructive',
        onPress: async () => {
          try {
            await admissionAPI.reject(id, 'Rejected by administrator');
            Toast.show({ type: 'success', text1: 'Admission rejected' });
            load();
          } catch (e) { Toast.show({ type: 'error', text1: getErrorMessage(e) }); }
        },
      },
    ]);
  };

  function badgeVariant(status: string): any {
    if (status === 'approved') return 'success';
    if (status === 'pending')  return 'warning';
    if (status === 'rejected') return 'danger';
    return 'default';
  }

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      {/* Search */}
      <View style={[s.topBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[s.searchBox, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
          <Icon name="search" size={14} color={colors.textTertiary} />
          <TextInput
            style={[s.searchInput, { color: colors.text }]}
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name..."
            placeholderTextColor={colors.placeholder}
          />
        </View>
        <View style={s.filterBtns}>
          {[null, 'pending', 'approved', 'rejected'].map((f, i) => (
            <TouchableOpacity
              key={i}
              style={[s.filterBtn, statusFilter === f && { backgroundColor: colors.primary }]}
              onPress={() => setStatusFilter(f)}
            >
              <Text style={[s.filterBtnText, statusFilter === f && { color: '#fff' }]}>
                {f === null ? 'All' : formatStatus(f)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={{ padding: spacing.base }}>
          <SkeletonLoader variant="list" count={5} />
        </View>
      ) : (
        <FlatList
          data={admissions}
          keyExtractor={a => String(a.id)}
          contentContainerStyle={{ padding: spacing.base, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => (
            <PremiumCard variant="bordered" padding={12}>
              <View style={s.admRow}>
                <View style={[s.admAvatar, { backgroundColor: colors.primaryBg }]}>
                  <Text style={[s.admAvatarText, { color: colors.primary }]}>
                    {item.applicant_name[0]?.toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.admTitleRow}>
                    <Text style={[s.admName, { color: colors.text }]}>{item.applicant_name}</Text>
                    <Badge label={formatStatus(item.status)} variant={badgeVariant(item.status)} size="sm" rounded />
                  </View>
                  {(item.father_name || item.mother_name) && (
                    <Text style={[s.admParents, { color: colors.textSecondary }]}>
                      {[item.father_name, item.mother_name].filter(Boolean).join(' / ')}
                    </Text>
                  )}
                  <Text style={[s.admMeta, { color: colors.textTertiary }]}>
                    📚 Std {item.standard_applied}
                    {item.mobile ? ` • 📞 ${item.mobile}` : ''}
                    {item.gr_number ? ` • GR: ${item.gr_number}` : ''}
                  </Text>
                  <Text style={[s.admDate, { color: colors.textTertiary }]}>
                    Applied: {formatDateLong(item.applied_on)}
                  </Text>
                  {item.status === 'pending' && (
                    <View style={s.admActions}>
                      <TouchableOpacity
                        style={[s.admBtn, { backgroundColor: colors.successBg }]}
                        onPress={() => approveAdmission(item.id)}
                      >
                        <Icon name="check" size={12} color={colors.success} solid />
                        <Text style={[s.admBtnText, { color: colors.success }]}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.admBtn, { backgroundColor: colors.dangerBg }]}
                        onPress={() => rejectAdmission(item.id)}
                      >
                        <Icon name="times" size={12} color={colors.danger} solid />
                        <Text style={[s.admBtnText, { color: colors.danger }]}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            </PremiumCard>
          )}
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <Text style={s.emptyIcon}>📋</Text>
              <Text style={[s.emptyText, { color: colors.textSecondary }]}>No admission applications found</Text>
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

      {/* New Admission Modal */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <View style={[s.modal, { backgroundColor: colors.background }]}>
          <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <Icon name="times" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={[s.modalTitle, { color: colors.text }]}>New Admission</Text>
            <TouchableOpacity onPress={createAdmission} disabled={saving}>
              {saving
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Text style={[s.saveText, { color: colors.primary }]}>Submit</Text>}
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: spacing.base, gap: 14 }}>
            <View>
              <Text style={[s.label, { color: colors.textSecondary }]}>Applicant Name *</Text>
              <TextInput style={[s.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                value={form.applicant_name} onChangeText={v => setForm(f => ({ ...f, applicant_name: v }))}
                placeholder="Student full name..." placeholderTextColor={colors.placeholder} />
            </View>
            <View>
              <Text style={[s.label, { color: colors.textSecondary }]}>Father's Name</Text>
              <TextInput style={[s.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                value={form.father_name} onChangeText={v => setForm(f => ({ ...f, father_name: v }))}
                placeholder="Father's name..." placeholderTextColor={colors.placeholder} />
            </View>
            <View>
              <Text style={[s.label, { color: colors.textSecondary }]}>Mother's Name</Text>
              <TextInput style={[s.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                value={form.mother_name} onChangeText={v => setForm(f => ({ ...f, mother_name: v }))}
                placeholder="Mother's name..." placeholderTextColor={colors.placeholder} />
            </View>
            <View>
              <Text style={[s.label, { color: colors.textSecondary }]}>Date of Birth</Text>
              <TextInput style={[s.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                value={form.date_of_birth} onChangeText={v => setForm(f => ({ ...f, date_of_birth: v }))}
                placeholder="YYYY-MM-DD" placeholderTextColor={colors.placeholder} />
            </View>
            <View>
              <Text style={[s.label, { color: colors.textSecondary }]}>Gender</Text>
              <View style={s.chips}>
                {GENDER_OPTIONS.map(g => (
                  <TouchableOpacity key={g.value}
                    style={[s.chip, form.gender === g.value && { backgroundColor: colors.primary }]}
                    onPress={() => setForm(f => ({ ...f, gender: g.value }))}>
                    <Text style={[s.chipText, form.gender === g.value && { color: '#fff' }]}>{g.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View>
              <Text style={[s.label, { color: colors.textSecondary }]}>Mobile</Text>
              <TextInput style={[s.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                value={form.mobile} onChangeText={v => setForm(f => ({ ...f, mobile: v }))}
                placeholder="10-digit mobile..." placeholderTextColor={colors.placeholder} keyboardType="phone-pad" />
            </View>
            <View>
              <Text style={[s.label, { color: colors.textSecondary }]}>Applying for Standard</Text>
              <View style={s.chips}>
                {CLASSES.map(c => (
                  <TouchableOpacity key={c}
                    style={[s.chip, form.standard_applied === c && { backgroundColor: colors.primary }]}
                    onPress={() => setForm(f => ({ ...f, standard_applied: c }))}>
                    <Text style={[s.chipText, form.standard_applied === c && { color: '#fff' }]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View>
              <Text style={[s.label, { color: colors.textSecondary }]}>Address</Text>
              <TextInput style={[s.input, s.textarea, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                value={form.address} onChangeText={v => setForm(f => ({ ...f, address: v }))}
                placeholder="Residential address..." placeholderTextColor={colors.placeholder}
                multiline numberOfLines={3} />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  topBar: { padding: spacing.sm, gap: 8, borderBottomWidth: 1 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: 12, height: 40 },
  searchInput: { flex: 1, fontSize: typography.size.base },
  filterBtns: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.full, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  filterBtnText: { fontSize: typography.size.xs, fontWeight: typography.weight.bold, color: '#6b7280' },
  admRow: { flexDirection: 'row', gap: 12 },
  admAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  admAvatarText: { fontSize: typography.size.xl, fontWeight: typography.weight.bold },
  admTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  admName: { fontSize: typography.size.base, fontWeight: typography.weight.bold, flex: 1, marginRight: 6 },
  admParents: { fontSize: typography.size.sm, marginBottom: 2 },
  admMeta: { fontSize: typography.size.xs, marginBottom: 2 },
  admDate: { fontSize: typography.size.xs, marginBottom: 6 },
  admActions: { flexDirection: 'row', gap: 8 },
  admBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full },
  admBtnText: { fontSize: typography.size.xs, fontWeight: typography.weight.bold },
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
  textarea: { height: 90, textAlignVertical: 'top', paddingTop: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, backgroundColor: '#f3f4f6', borderWidth: 1.5, borderColor: '#e5e7eb' },
  chipText: { fontSize: typography.size.sm, fontWeight: typography.weight.semibold, color: '#6b7280' },
});
