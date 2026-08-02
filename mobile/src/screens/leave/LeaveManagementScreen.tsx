/**
 * VidyaSetu Mobile — Leave Management Screen
 * Shows leave balance, allows apply, and admin can approve/reject.
 * All staff roles + student/parent.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from '../../theme/ThemeContext';
import { leaveAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { spacing, radius, typography, shadows } from '../../theme';
import { formatDateLong, formatStatus, statusColor, today, getErrorMessage } from '../../utils/formatters';
import { CURRENT_ACADEMIC_YEAR } from '../../config/constants';
import Badge from '../../components/ui/Badge';
import PremiumCard from '../../components/ui/PremiumCard';
import SectionHeader from '../../components/ui/SectionHeader';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import Toast from 'react-native-toast-message';

interface LeaveApplication {
  id: number;
  leave_type_name: string;
  from_date: string;
  to_date: string;
  no_of_days: number;
  reason: string;
  status: string;
  applied_on: string;
  applicant_name?: string;
  approved_by_name?: string;
  remarks?: string;
}

interface LeaveBalance {
  leave_type_id: number;
  leave_type_name: string;
  total_days: number;
  used_days: number;
  remaining_days: number;
}

interface LeaveType { id: number; name: string; }

const EMPTY_FORM = {
  leave_type_id: '',
  from_date: today(),
  to_date: today(),
  reason: '',
};

export default function LeaveManagementScreen({ navigation }: { navigation: any }) {
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const role = user?.roles?.[0]?.code ?? '';
  const isAdmin = ['admin', 'super_admin', 'principal', 'vice_principal'].includes(role);

  const [tab, setTab] = useState<'mine' | 'pending'>('mine');
  const [myApplications, setMyApplications] = useState<LeaveApplication[]>([]);
  const [pendingApplications, setPendingApplications] = useState<LeaveApplication[]>([]);
  const [balance, setBalance] = useState<LeaveBalance[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showApply, setShowApply] = useState(false);
  const [showRemarks, setShowRemarks] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<LeaveApplication | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [remarks, setRemarks] = useState('');
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const calls: Promise<any>[] = [
        leaveAPI.getMyApplications({ academic_year: CURRENT_ACADEMIC_YEAR }),
        leaveAPI.getBalance(CURRENT_ACADEMIC_YEAR),
        leaveAPI.getLeaveTypes(),
      ];
      if (isAdmin) calls.push(leaveAPI.getPending());

      const results = await Promise.allSettled(calls);
      if (results[0].status === 'fulfilled')
        setMyApplications(results[0].value.data?.data?.items ?? results[0].value.data?.data ?? []);
      if (results[1].status === 'fulfilled')
        setBalance(results[1].value.data?.data ?? []);
      if (results[2].status === 'fulfilled')
        setLeaveTypes(results[2].value.data?.data ?? []);
      if (isAdmin && results[3]?.status === 'fulfilled')
        setPendingApplications(results[3].value.data?.data?.items ?? results[3].value.data?.data ?? []);
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  }, [isAdmin]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  const applyLeave = async () => {
    if (!form.leave_type_id) { Toast.show({ type: 'error', text1: 'Please select leave type' }); return; }
    if (!form.reason.trim()) { Toast.show({ type: 'error', text1: 'Reason is required' }); return; }
    if (form.from_date > form.to_date) { Toast.show({ type: 'error', text1: 'To date must be after from date' }); return; }

    setSaving(true);
    try {
      await leaveAPI.apply({
        ...form,
        leave_type_id: Number(form.leave_type_id),
        academic_year: CURRENT_ACADEMIC_YEAR,
      });
      Toast.show({ type: 'success', text1: 'Leave application submitted!' });
      setShowApply(false);
      setForm({ ...EMPTY_FORM });
      load();
    } catch (e) {
      Toast.show({ type: 'error', text1: getErrorMessage(e) });
    } finally { setSaving(false); }
  };

  const handleAction = (leave: LeaveApplication, action: 'approve' | 'reject') => {
    setSelectedLeave(leave);
    setActionType(action);
    setRemarks('');
    setShowRemarks(true);
  };

  const confirmAction = async () => {
    if (!selectedLeave) return;
    if (actionType === 'reject' && !remarks.trim()) {
      Toast.show({ type: 'error', text1: 'Remarks required for rejection' });
      return;
    }
    setSaving(true);
    try {
      if (actionType === 'approve') {
        await leaveAPI.approve(selectedLeave.id, remarks);
        Toast.show({ type: 'success', text1: 'Leave approved' });
      } else {
        await leaveAPI.reject(selectedLeave.id, remarks);
        Toast.show({ type: 'success', text1: 'Leave rejected' });
      }
      setShowRemarks(false);
      load();
    } catch (e) {
      Toast.show({ type: 'error', text1: getErrorMessage(e) });
    } finally { setSaving(false); }
  };

  const cancelLeave = (id: number) => {
    Alert.alert('Cancel Leave', 'Are you sure you want to cancel this leave application?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel', style: 'destructive',
        onPress: async () => {
          try {
            await leaveAPI.cancel(id);
            Toast.show({ type: 'success', text1: 'Leave cancelled' });
            load();
          } catch (e) {
            Toast.show({ type: 'error', text1: getErrorMessage(e) });
          }
        },
      },
    ]);
  };

  function badgeVariant(status: string): any {
    if (status === 'approved')  return 'success';
    if (status === 'pending')   return 'warning';
    if (status === 'rejected')  return 'danger';
    return 'default';
  }

  const LeaveCard = ({ item, showActions }: { item: LeaveApplication; showActions?: boolean }) => (
    <PremiumCard variant="bordered" style={{ marginBottom: spacing.sm }} padding={12}>
      <View style={s.leaveRow}>
        <View style={[s.leaveIcon, { backgroundColor: colors.primaryBg }]}>
          <Icon name="calendar-minus" size={16} color={colors.primary} solid />
        </View>
        <View style={{ flex: 1 }}>
          <View style={s.leaveTitleRow}>
            <Text style={[s.leaveType, { color: colors.text }]}>{item.leave_type_name}</Text>
            <Badge label={formatStatus(item.status)} variant={badgeVariant(item.status)} size="sm" rounded />
          </View>
          {showActions && item.applicant_name && (
            <Text style={[s.applicant, { color: colors.primary }]}>👤 {item.applicant_name}</Text>
          )}
          <Text style={[s.leaveDates, { color: colors.textSecondary }]}>
            {formatDateLong(item.from_date)} → {formatDateLong(item.to_date)}
            {' '}({item.no_of_days} day{item.no_of_days !== 1 ? 's' : ''})
          </Text>
          <Text style={[s.leaveReason, { color: colors.textSecondary }]} numberOfLines={2}>
            {item.reason}
          </Text>
          {item.remarks && (
            <Text style={[s.leaveRemarks, { color: colors.textTertiary }]}>
              💬 {item.remarks}
            </Text>
          )}
          {showActions && item.status === 'pending' && (
            <View style={s.actionRow}>
              <TouchableOpacity
                style={[s.approveBtn, { backgroundColor: colors.successBg }]}
                onPress={() => handleAction(item, 'approve')}
              >
                <Icon name="check" size={12} color={colors.success} solid />
                <Text style={[s.actionBtnText, { color: colors.success }]}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.rejectBtn, { backgroundColor: colors.dangerBg }]}
                onPress={() => handleAction(item, 'reject')}
              >
                <Icon name="times" size={12} color={colors.danger} solid />
                <Text style={[s.actionBtnText, { color: colors.danger }]}>Reject</Text>
              </TouchableOpacity>
            </View>
          )}
          {!showActions && item.status === 'pending' && (
            <TouchableOpacity
              style={s.cancelBtn}
              onPress={() => cancelLeave(item.id)}
            >
              <Text style={s.cancelBtnText}>Cancel Application</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </PremiumCard>
  );

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {/* Leave Balance */}
        {balance.length > 0 && (
          <View style={{ paddingHorizontal: spacing.base, marginTop: spacing.lg }}>
            <SectionHeader title="Leave Balance" icon="chart-pie" />
            <View style={s.balanceGrid}>
              {balance.map((b) => (
                <PremiumCard key={b.leave_type_id} variant="flat" style={s.balanceCard} padding={12}>
                  <Text style={[s.balanceType, { color: colors.textSecondary }]}>{b.leave_type_name}</Text>
                  <View style={s.balanceRow}>
                    <View style={s.balanceStat}>
                      <Text style={[s.balanceNum, { color: colors.success }]}>{b.remaining_days}</Text>
                      <Text style={s.balanceLbl}>Remaining</Text>
                    </View>
                    <View style={s.balanceStat}>
                      <Text style={[s.balanceNum, { color: colors.warning }]}>{b.used_days}</Text>
                      <Text style={s.balanceLbl}>Used</Text>
                    </View>
                    <View style={s.balanceStat}>
                      <Text style={[s.balanceNum, { color: colors.text }]}>{b.total_days}</Text>
                      <Text style={s.balanceLbl}>Total</Text>
                    </View>
                  </View>
                  <View style={[s.progressBar, { backgroundColor: colors.border }]}>
                    <View style={[
                      s.progressFill,
                      {
                        backgroundColor: colors.success,
                        width: `${b.total_days > 0 ? (b.remaining_days / b.total_days) * 100 : 0}%`,
                      },
                    ]} />
                  </View>
                </PremiumCard>
              ))}
            </View>
          </View>
        )}

        {/* Tabs */}
        {isAdmin && (
          <View style={[s.tabs, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            {(['mine', 'pending'] as const).map(t => (
              <TouchableOpacity
                key={t}
                style={[s.tabBtn, tab === t && { borderBottomColor: colors.primary, borderBottomWidth: 2.5 }]}
                onPress={() => setTab(t)}
              >
                <Text style={[s.tabText, { color: tab === t ? colors.primary : colors.textSecondary }]}>
                  {t === 'mine' ? 'My Applications' : `Pending Approvals (${pendingApplications.length})`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Content */}
        <View style={{ paddingHorizontal: spacing.base, marginTop: spacing.lg }}>
          {loading ? (
            <SkeletonLoader variant="list" count={4} />
          ) : tab === 'mine' ? (
            <>
              <SectionHeader title="My Applications" icon="file-alt" onViewAll={undefined} />
              {myApplications.length === 0 ? (
                <PremiumCard variant="flat" style={s.emptyCard}>
                  <Text style={s.emptyIcon}>📋</Text>
                  <Text style={[s.emptyText, { color: colors.textSecondary }]}>No leave applications</Text>
                </PremiumCard>
              ) : (
                myApplications.map(item => <LeaveCard key={item.id} item={item} />)
              )}
            </>
          ) : (
            <>
              <SectionHeader title="Pending Approvals" icon="clock" />
              {pendingApplications.length === 0 ? (
                <PremiumCard variant="flat" style={s.emptyCard}>
                  <Text style={s.emptyIcon}>✅</Text>
                  <Text style={[s.emptyText, { color: colors.textSecondary }]}>No pending applications</Text>
                </PremiumCard>
              ) : (
                pendingApplications.map(item => <LeaveCard key={item.id} item={item} showActions />)
              )}
            </>
          )}
        </View>

        <View style={{ height: spacing['4xl'] }} />
      </ScrollView>

      {/* FAB — Apply Leave */}
      <TouchableOpacity
        style={[s.fab, { backgroundColor: colors.primary }]}
        onPress={() => { setForm({ ...EMPTY_FORM }); setShowApply(true); }}
      >
        <Icon name="plus" size={20} color="#fff" solid />
      </TouchableOpacity>

      {/* Apply Leave Modal */}
      <Modal visible={showApply} animationType="slide" presentationStyle="pageSheet">
        <View style={[s.modal, { backgroundColor: colors.background }]}>
          <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowApply(false)}>
              <Icon name="times" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={[s.modalTitle, { color: colors.text }]}>Apply for Leave</Text>
            <TouchableOpacity onPress={applyLeave} disabled={saving}>
              {saving
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Text style={[s.saveText, { color: colors.primary }]}>Submit</Text>}
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: spacing.base, gap: 14 }}>
            <View>
              <Text style={[s.formLabel, { color: colors.textSecondary }]}>Leave Type *</Text>
              <View style={s.typeChips}>
                {leaveTypes.map(lt => (
                  <TouchableOpacity
                    key={lt.id}
                    style={[s.typeChip, form.leave_type_id === String(lt.id) && { backgroundColor: colors.primary }]}
                    onPress={() => setForm(f => ({ ...f, leave_type_id: String(lt.id) }))}
                  >
                    <Text style={[s.typeChipText, form.leave_type_id === String(lt.id) && { color: '#fff' }]}>
                      {lt.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View>
              <Text style={[s.formLabel, { color: colors.textSecondary }]}>From Date *</Text>
              <TextInput
                style={[s.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                value={form.from_date}
                onChangeText={v => setForm(f => ({ ...f, from_date: v }))}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.placeholder}
              />
            </View>
            <View>
              <Text style={[s.formLabel, { color: colors.textSecondary }]}>To Date *</Text>
              <TextInput
                style={[s.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                value={form.to_date}
                onChangeText={v => setForm(f => ({ ...f, to_date: v }))}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.placeholder}
              />
            </View>
            <View>
              <Text style={[s.formLabel, { color: colors.textSecondary }]}>Reason *</Text>
              <TextInput
                style={[s.input, s.textarea, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                value={form.reason}
                onChangeText={v => setForm(f => ({ ...f, reason: v }))}
                placeholder="Provide reason for leave..."
                placeholderTextColor={colors.placeholder}
                multiline
                numberOfLines={4}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Remarks Modal */}
      <Modal visible={showRemarks} animationType="fade" transparent>
        <View style={s.remarksBg}>
          <View style={[s.remarksBox, { backgroundColor: colors.surface }]}>
            <Text style={[s.remarksTitle, { color: colors.text }]}>
              {actionType === 'approve' ? '✅ Approve Leave' : '❌ Reject Leave'}
            </Text>
            <Text style={[s.remarksLabel, { color: colors.textSecondary }]}>
              Remarks {actionType === 'reject' ? '(required)' : '(optional)'}
            </Text>
            <TextInput
              style={[s.input, s.textarea, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
              value={remarks}
              onChangeText={setRemarks}
              placeholder="Add remarks..."
              placeholderTextColor={colors.placeholder}
              multiline
              numberOfLines={3}
            />
            <View style={s.remarksActions}>
              <TouchableOpacity
                style={[s.remarksCancelBtn, { borderColor: colors.border }]}
                onPress={() => setShowRemarks(false)}
              >
                <Text style={[s.remarksCancelText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.remarksConfirmBtn, { backgroundColor: actionType === 'approve' ? colors.success : colors.danger }]}
                onPress={confirmAction}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={s.remarksConfirmText}>{actionType === 'approve' ? 'Approve' : 'Reject'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, marginTop: spacing.md },
  tabBtn: { flex: 1, padding: 12, alignItems: 'center' },
  tabText: { fontSize: typography.size.sm, fontWeight: typography.weight.semibold },
  balanceGrid: { gap: spacing.sm },
  balanceCard: { borderRadius: radius.xl },
  balanceType: { fontSize: typography.size.sm, fontWeight: typography.weight.semibold, marginBottom: 8 },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
  balanceStat: { alignItems: 'center' },
  balanceNum: { fontSize: typography.size.xl, fontWeight: typography.weight.extrabold },
  balanceLbl: { fontSize: typography.size.xs, color: '#9ca3af', marginTop: 2 },
  progressBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  leaveRow: { flexDirection: 'row', gap: spacing.sm },
  leaveIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  leaveTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
  leaveType: { fontSize: typography.size.base, fontWeight: typography.weight.bold, flex: 1, marginRight: 6 },
  applicant: { fontSize: typography.size.sm, fontWeight: typography.weight.semibold, marginBottom: 2 },
  leaveDates: { fontSize: typography.size.sm, marginBottom: 3 },
  leaveReason: { fontSize: typography.size.sm },
  leaveRemarks: { fontSize: typography.size.xs, marginTop: 4, fontStyle: 'italic' },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  approveBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full },
  rejectBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full },
  actionBtnText: { fontSize: typography.size.xs, fontWeight: typography.weight.bold },
  cancelBtn: { marginTop: 8, alignSelf: 'flex-start' },
  cancelBtnText: { fontSize: typography.size.xs, color: '#dc2626', fontWeight: typography.weight.semibold },
  emptyCard: { alignItems: 'center', padding: spacing.xl },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
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
  formLabel: { fontSize: typography.size.xs, fontWeight: typography.weight.semibold, textTransform: 'uppercase', marginBottom: 6 },
  input: {
    height: 48, borderWidth: 1.5, borderRadius: radius.md,
    paddingHorizontal: spacing.md, fontSize: typography.size.base,
  },
  textarea: { height: 100, textAlignVertical: 'top', paddingTop: 12 },
  typeChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full,
    backgroundColor: '#f3f4f6', borderWidth: 1.5, borderColor: '#e5e7eb',
  },
  typeChipText: { fontSize: typography.size.sm, fontWeight: typography.weight.semibold, color: '#6b7280' },
  remarksBg: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center', padding: spacing.base,
  },
  remarksBox: {
    width: '100%', borderRadius: radius.xl, padding: spacing.base, gap: 12,
    elevation: 8,
  },
  remarksTitle: { fontSize: typography.size.lg, fontWeight: typography.weight.bold },
  remarksLabel: { fontSize: typography.size.sm },
  remarksActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  remarksCancelBtn: { flex: 1, borderWidth: 1.5, borderRadius: radius.md, padding: 12, alignItems: 'center' },
  remarksCancelText: { fontWeight: typography.weight.semibold },
  remarksConfirmBtn: { flex: 1, borderRadius: radius.md, padding: 12, alignItems: 'center' },
  remarksConfirmText: { color: '#fff', fontWeight: typography.weight.bold },
});
