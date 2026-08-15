/**
 * VidyaSetu Mobile — Leave Management Screen (Premium Redesign)
 * ==============================================================
 * Leave balance overview, self-application workflow, and administrator approvals.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from '../../theme/ThemeContext';
import { leaveAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { spacing, radius, typography, shadows } from '../../theme';
import { formatDateLong, formatStatus, today, getErrorMessage } from '../../utils/formatters';
import { CURRENT_ACADEMIC_YEAR } from '../../config/constants';
import {
  AppCard,
  AppButton,
  AppBadge,
  AppTabs,
  AppInput,
  AppSelect,
  AppDatePicker,
  AppBottomSheet,
  AppStatCard,
  AppEmptyState,
  AppSkeleton,
  AppConfirmDialog,
} from '../../components/ui';
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

interface LeaveType {
  id: number;
  name: string;
}

const EMPTY_FORM = {
  leave_type_id: '1',
  from_date: today(),
  to_date: today(),
  reason: '',
};

export default function LeaveManagementScreen({ navigation }: { navigation: any }) {
  const { colors, roleAccent } = useTheme();
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

  // Approval/Rejection Dialog
  const [selectedLeave, setSelectedLeave] = useState<LeaveApplication | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [remarks, setRemarks] = useState('');
  const [showRemarksModal, setShowRemarksModal] = useState(false);
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
      if (results[0].status === 'fulfilled') {
        setMyApplications(results[0].value.data?.data?.items ?? results[0].value.data?.data ?? []);
      }
      if (results[1].status === 'fulfilled') {
        setBalance(results[1].value.data?.data ?? []);
      }
      if (results[2].status === 'fulfilled') {
        setLeaveTypes(results[2].value.data?.data ?? []);
      }
      if (isAdmin && results[3]?.status === 'fulfilled') {
        setPendingApplications(results[3].value.data?.data?.items ?? results[3].value.data?.data ?? []);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const applyLeave = async () => {
    if (!form.leave_type_id) {
      Toast.show({ type: 'error', text1: 'Please select leave type' });
      return;
    }
    if (!form.reason.trim()) {
      Toast.show({ type: 'error', text1: 'Reason is required' });
      return;
    }
    if (form.from_date > form.to_date) {
      Toast.show({ type: 'error', text1: 'To date must be on or after from date' });
      return;
    }

    setSaving(true);
    try {
      await leaveAPI.apply({
        ...form,
        leave_type_id: Number(form.leave_type_id),
        academic_year: CURRENT_ACADEMIC_YEAR,
      });
      Toast.show({ type: 'success', text1: 'Leave Application Submitted!' });
      setShowApply(false);
      setForm({ ...EMPTY_FORM });
      load();
    } catch (e) {
      Toast.show({ type: 'error', text1: getErrorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  const handleAction = (leave: LeaveApplication, action: 'approve' | 'reject') => {
    setSelectedLeave(leave);
    setActionType(action);
    setRemarks('');
    setShowRemarksModal(true);
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
        Toast.show({ type: 'success', text1: 'Leave Application Approved' });
      } else {
        await leaveAPI.reject(selectedLeave.id, remarks);
        Toast.show({ type: 'info', text1: 'Leave Application Rejected' });
      }
      setShowRemarksModal(false);
      setSelectedLeave(null);
      load();
    } catch (e) {
      Toast.show({ type: 'error', text1: getErrorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  const displayedList = tab === 'mine' ? myApplications : pendingApplications;

  const leaveTypeOptions = leaveTypes.length > 0
    ? leaveTypes.map(lt => ({ label: lt.name, value: String(lt.id) }))
    : [
        { label: 'Casual Leave (CL)', value: '1' },
        { label: 'Medical Leave (ML)', value: '2' },
        { label: 'Earned Leave (EL)', value: '3' },
      ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Tab Switcher if Admin */}
      {isAdmin && (
        <View style={[styles.tabsWrap, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <AppTabs
            tabs={[
              { key: 'mine', label: 'My Applications', count: myApplications.length },
              { key: 'pending', label: 'Pending Approvals', count: pendingApplications.length },
            ]}
            activeTab={tab}
            onChangeTab={k => setTab(k as any)}
            variant="segmented"
          />
        </View>
      )}

      {loading ? (
        <View style={{ padding: spacing.base }}>
          <AppSkeleton variant="card" count={4} />
        </View>
      ) : (
        <FlatList
          data={displayedList}
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
          ListHeaderComponent={
            tab === 'mine' && balance.length > 0 ? (
              <View style={styles.balanceSection}>
                <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>
                  Annual Leave Balances
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
                  {balance.map(bal => (
                    <AppStatCard
                      key={bal.leave_type_id}
                      label={bal.leave_type_name}
                      value={`${bal.remaining_days} days`}
                      subtitle={`Used ${bal.used_days} of ${bal.total_days} total`}
                      icon="calendar-check"
                      color={bal.remaining_days > 2 ? colors.primary : colors.warning}
                    />
                  ))}
                </ScrollView>
                <Text style={[styles.sectionHeading, { color: colors.textSecondary, marginTop: spacing.md }]}>
                  Application History
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <AppEmptyState
              icon="calendar-day"
              title={tab === 'mine' ? 'No Leave Applications' : 'No Pending Approvals'}
              description={
                tab === 'mine'
                  ? 'You have not submitted any leave applications for this academic cycle.'
                  : 'All staff leave applications have been reviewed and resolved.'
              }
              actionLabel={tab === 'mine' ? 'Apply for Leave' : undefined}
              onAction={tab === 'mine' ? () => setShowApply(true) : undefined}
              style={{ flex: 1 }}
            />
          }
          renderItem={({ item }) => {
            const isPending = item.status === 'pending';
            const badgeVariant =
              item.status === 'approved' ? 'success' : item.status === 'rejected' ? 'danger' : 'warning';

            return (
              <AppCard variant="bordered" padding={14}>
                <View style={{ gap: 8 }}>
                  <View style={styles.cardHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.leaveType, { color: colors.text }]}>
                        {item.leave_type_name || 'General Leave'}
                      </Text>
                      {item.applicant_name && (
                        <Text style={[styles.applicant, { color: colors.primary, fontWeight: '600' }]}>
                          {item.applicant_name}
                        </Text>
                      )}
                    </View>
                    <AppBadge
                      label={formatStatus(item.status)}
                      variant={badgeVariant}
                      size="sm"
                      rounded
                    />
                  </View>

                  {/* Dates */}
                  <View style={styles.dateRow}>
                    <Icon name="calendar-alt" size={12} color={colors.textTertiary} />
                    <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                      {formatDateLong(item.from_date)} → {formatDateLong(item.to_date)}
                    </Text>
                    <Text style={[styles.daysTag, { color: colors.textTertiary }]}>
                      ({item.no_of_days || 1} {item.no_of_days === 1 ? 'day' : 'days'})
                    </Text>
                  </View>

                  {/* Reason */}
                  {item.reason ? (
                    <Text style={[styles.reason, { color: colors.textSecondary }]} numberOfLines={2}>
                      Reason: {item.reason}
                    </Text>
                  ) : null}

                  {/* Admin Actions for Pending Applications */}
                  {isAdmin && tab === 'pending' && isPending && (
                    <View style={styles.actionRow}>
                      <AppButton
                        label="Approve"
                        iconLeft="check"
                        variant="success"
                        size="sm"
                        onPress={() => handleAction(item, 'approve')}
                      />
                      <AppButton
                        label="Reject"
                        iconLeft="times"
                        variant="danger"
                        size="sm"
                        onPress={() => handleAction(item, 'reject')}
                      />
                    </View>
                  )}
                </View>
              </AppCard>
            );
          }}
        />
      )}

      {/* Floating Apply Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, ...shadows.lg }]}
        onPress={() => {
          setForm({ ...EMPTY_FORM });
          setShowApply(true);
        }}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Apply for Leave"
      >
        <Icon name="plus" size={20} color="#fff" solid />
      </TouchableOpacity>

      {/* Apply Leave Bottom Sheet */}
      <AppBottomSheet
        visible={showApply}
        onClose={() => setShowApply(false)}
        title="Apply for Leave"
        subtitle="Submit leave request for approval"
      >
        <View style={{ gap: spacing.xs }}>
          <AppSelect
            label="Leave Type *"
            value={form.leave_type_id}
            options={leaveTypeOptions}
            onSelect={v => setForm(f => ({ ...f, leave_type_id: String(v) }))}
          />

          <View style={styles.formRow}>
            <View style={{ flex: 1 }}>
              <AppDatePicker
                label="From Date *"
                value={form.from_date}
                onChangeDate={d => setForm(f => ({ ...f, from_date: d }))}
              />
            </View>
            <View style={{ flex: 1 }}>
              <AppDatePicker
                label="To Date *"
                value={form.to_date}
                onChangeDate={d => setForm(f => ({ ...f, to_date: d }))}
              />
            </View>
          </View>

          <AppInput
            label="Reason for Leave *"
            value={form.reason}
            onChangeText={v => setForm(f => ({ ...f, reason: v }))}
            icon="align-left"
            placeholder="Explain reason for leave..."
            multiline
          />

          <AppButton
            label="Submit Leave Application"
            iconLeft="paper-plane"
            variant="primary"
            size="lg"
            onPress={applyLeave}
            loading={saving}
            fullWidth
            style={{ marginTop: spacing.md }}
          />
        </View>
      </AppBottomSheet>

      {/* Approve/Reject Remarks Bottom Sheet */}
      <AppBottomSheet
        visible={showRemarksModal}
        onClose={() => setShowRemarksModal(false)}
        title={actionType === 'approve' ? 'Approve Leave Request' : 'Reject Leave Request'}
        subtitle={selectedLeave ? `Applicant: ${selectedLeave.applicant_name}` : ''}
      >
        <View style={{ gap: spacing.base }}>
          <AppInput
            label={actionType === 'reject' ? 'Rejection Remarks *' : 'Approval Notes (Optional)'}
            value={remarks}
            onChangeText={setRemarks}
            placeholder={
              actionType === 'reject'
                ? 'State the reason for rejecting this leave request...'
                : 'Any special instructions or notes...'
            }
            multiline
          />
          <AppButton
            label={actionType === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
            variant={actionType === 'approve' ? 'success' : 'danger'}
            size="lg"
            onPress={confirmAction}
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
  balanceSection: {
    marginBottom: spacing.base,
  },
  sectionHeading: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leaveType: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
  },
  applicant: {
    fontSize: typography.size.xs,
    marginTop: 2,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: typography.size.xs,
  },
  daysTag: {
    fontSize: typography.size['2xs'],
  },
  reason: {
    fontSize: typography.size.xs,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
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
