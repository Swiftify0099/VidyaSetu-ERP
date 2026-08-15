/**
 * VidyaSetu Mobile — Admission Management Screen (Premium Redesign)
 * =================================================================
 * Admission applications list, approval workflows, status filters,
 * and structured new admission form.
 */
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from '../../theme/ThemeContext';
import { admissionAPI } from '../../services/api';
import { spacing, radius, typography, shadows } from '../../theme';
import { formatDateLong, formatStatus, getErrorMessage } from '../../utils/formatters';
import {
  AppCard,
  AppButton,
  AppBadge,
  AppChip,
  AppAvatar,
  AppSearchBar,
  AppInput,
  AppSelect,
  AppBottomSheet,
  AppEmptyState,
  AppSkeleton,
  AppConfirmDialog,
} from '../../components/ui';
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

const CLASS_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  label: `Standard ${i + 1}`,
  value: String(i + 1),
}));

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

  // Confirmation dialogs
  const [selectedAdmission, setSelectedAdmission] = useState<Admission | null>(null);
  const [confirmAction, setConfirmAction] = useState<'approve' | 'reject' | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await admissionAPI.list({
        status: statusFilter ?? undefined,
        search: search || undefined,
      });
      setAdmissions(res.data?.data?.items ?? res.data?.data ?? []);
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Failed to load admissions', text2: getErrorMessage(e) });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const createAdmission = async () => {
    if (!form.applicant_name.trim()) {
      Toast.show({ type: 'error', text1: 'Applicant name is required' });
      return;
    }
    setSaving(true);
    try {
      await admissionAPI.create(form);
      Toast.show({ type: 'success', text1: 'Admission application submitted!' });
      setShowForm(false);
      setForm({ ...EMPTY_FORM });
      load();
    } catch (e) {
      Toast.show({ type: 'error', text1: getErrorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!selectedAdmission || !confirmAction) return;
    setConfirmLoading(true);
    try {
      if (confirmAction === 'approve') {
        await admissionAPI.approve(selectedAdmission.id);
        Toast.show({ type: 'success', text1: 'Admission Approved', text2: 'GR Number has been automatically assigned.' });
      } else {
        await admissionAPI.reject(selectedAdmission.id, 'Rejected by administrator');
        Toast.show({ type: 'info', text1: 'Admission Application Rejected' });
      }
      load();
    } catch (e) {
      Toast.show({ type: 'error', text1: getErrorMessage(e) });
    } finally {
      setConfirmLoading(false);
      setConfirmAction(null);
      setSelectedAdmission(null);
    }
  };

  function badgeVariant(status: string): any {
    if (status === 'approved') return 'success';
    if (status === 'pending')  return 'warning';
    if (status === 'rejected') return 'danger';
    return 'neutral';
  }

  const filteredAdmissions = useMemo(() => {
    if (!search.trim()) return admissions;
    const q = search.toLowerCase();
    return admissions.filter(a =>
      a.applicant_name.toLowerCase().includes(q) ||
      (a.gr_number && a.gr_number.includes(q)) ||
      (a.mobile && a.mobile.includes(q))
    );
  }, [admissions, search]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Search & Filter Header */}
      <View style={[styles.topBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <AppSearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search by applicant name, mobile, GR..."
          style={{ marginVertical: 0 }}
        />

        {/* Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.sm, paddingTop: spacing.xs }}
        >
          {[null, 'pending', 'approved', 'rejected'].map((f, i) => (
            <AppChip
              key={i}
              label={f === null ? 'All' : formatStatus(f)}
              selected={statusFilter === f}
              onPress={() => setStatusFilter(f)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Main List */}
      {loading ? (
        <View style={{ padding: spacing.base }}>
          <AppSkeleton variant="list" count={6} />
        </View>
      ) : (
        <FlatList
          data={filteredAdmissions}
          keyExtractor={a => String(a.id)}
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
          renderItem={({ item }) => (
            <AppCard variant="bordered" padding={14}>
              <View style={styles.admRow}>
                <AppAvatar name={item.applicant_name} size="md" />

                <View style={{ flex: 1 }}>
                  <View style={styles.admTitleRow}>
                    <Text style={[styles.admName, { color: colors.text }]}>
                      {item.applicant_name}
                    </Text>
                    <AppBadge
                      label={formatStatus(item.status)}
                      variant={badgeVariant(item.status)}
                      size="sm"
                      rounded
                    />
                  </View>

                  {(item.father_name || item.mother_name) && (
                    <Text style={[styles.admParents, { color: colors.textSecondary }]}>
                      {[item.father_name, item.mother_name].filter(Boolean).join(' / ')}
                    </Text>
                  )}

                  <View style={styles.metaRow}>
                    <Icon name="graduation-cap" size={11} color={colors.textTertiary} solid />
                    <Text style={[styles.admMeta, { color: colors.textTertiary }]}>
                      Std {item.standard_applied}
                    </Text>
                    {item.mobile && (
                      <>
                        <Text style={{ color: colors.textTertiary }}>•</Text>
                        <Icon name="phone" size={10} color={colors.textTertiary} solid />
                        <Text style={[styles.admMeta, { color: colors.textTertiary }]}>
                          {item.mobile}
                        </Text>
                      </>
                    )}
                    {item.gr_number && (
                      <Text style={[styles.admMeta, { color: colors.primary, fontWeight: 'bold' }]}>
                        • GR: {item.gr_number}
                      </Text>
                    )}
                  </View>

                  <Text style={[styles.admDate, { color: colors.textTertiary }]}>
                    Applied: {formatDateLong(item.applied_on)}
                  </Text>

                  {/* Actions for Pending Applications */}
                  {item.status === 'pending' && (
                    <View style={styles.admActions}>
                      <AppButton
                        label="Approve"
                        iconLeft="check"
                        variant="success"
                        size="sm"
                        onPress={() => {
                          setSelectedAdmission(item);
                          setConfirmAction('approve');
                        }}
                      />
                      <AppButton
                        label="Reject"
                        iconLeft="times"
                        variant="danger"
                        size="sm"
                        onPress={() => {
                          setSelectedAdmission(item);
                          setConfirmAction('reject');
                        }}
                      />
                    </View>
                  )}
                </View>
              </View>
            </AppCard>
          )}
          ListEmptyComponent={
            <AppEmptyState
              icon="user-plus"
              title="No Applications Found"
              description="No admission applications matching your current search or filter criteria."
              actionLabel="New Admission"
              onAction={() => {
                setForm({ ...EMPTY_FORM });
                setShowForm(true);
              }}
              style={{ flex: 1 }}
            />
          }
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, ...shadows.lg }]}
        onPress={() => {
          setForm({ ...EMPTY_FORM });
          setShowForm(true);
        }}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="New Admission"
      >
        <Icon name="plus" size={20} color="#fff" solid />
      </TouchableOpacity>

      {/* New Admission Bottom Sheet Form */}
      <AppBottomSheet
        visible={showForm}
        onClose={() => setShowForm(false)}
        title="New Admission Application"
        subtitle="Enter prospective student information"
      >
        <View style={{ gap: spacing.xs }}>
          <AppInput
            label="Applicant Full Name *"
            value={form.applicant_name}
            onChangeText={v => setForm(f => ({ ...f, applicant_name: v }))}
            icon="user"
            placeholder="e.g. Aarav Sharma"
          />

          <AppSelect
            label="Applying for Standard *"
            value={form.standard_applied}
            options={CLASS_OPTIONS}
            onSelect={v => setForm(f => ({ ...f, standard_applied: String(v) }))}
            icon="graduation-cap"
          />

          <AppInput
            label="Father's Name"
            value={form.father_name}
            onChangeText={v => setForm(f => ({ ...f, father_name: v }))}
            icon="user-friends"
          />

          <AppInput
            label="Mother's Name"
            value={form.mother_name}
            onChangeText={v => setForm(f => ({ ...f, mother_name: v }))}
            icon="user-friends"
          />

          <AppInput
            label="Mobile Number"
            value={form.mobile}
            onChangeText={v => setForm(f => ({ ...f, mobile: v }))}
            icon="phone"
            keyboardType="phone-pad"
            maxLength={10}
          />

          <AppInput
            label="Residential Address"
            value={form.address}
            onChangeText={v => setForm(f => ({ ...f, address: v }))}
            icon="map-marker-alt"
            multiline
          />

          <AppButton
            label="Submit Admission"
            iconLeft="paper-plane"
            variant="primary"
            size="lg"
            onPress={createAdmission}
            loading={saving}
            fullWidth
            style={{ marginTop: spacing.md }}
          />
        </View>
      </AppBottomSheet>

      {/* Confirmation Dialog */}
      <AppConfirmDialog
        visible={!!confirmAction}
        onClose={() => {
          setConfirmAction(null);
          setSelectedAdmission(null);
        }}
        onConfirm={handleConfirmAction}
        title={confirmAction === 'approve' ? 'Approve Admission' : 'Reject Admission'}
        message={
          confirmAction === 'approve'
            ? `Approve application for ${selectedAdmission?.applicant_name}? A permanent GR number will be assigned.`
            : `Are you sure you want to reject ${selectedAdmission?.applicant_name}'s admission application?`
        }
        confirmLabel={confirmAction === 'approve' ? 'Approve Application' : 'Reject Application'}
        variant={confirmAction === 'approve' ? 'success' : 'danger'}
        loading={confirmLoading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topBar: {
    padding: spacing.base,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  admRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  admTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  admName: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    flex: 1,
    marginRight: spacing.sm,
  },
  admParents: {
    fontSize: typography.size.xs,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
    flexWrap: 'wrap',
  },
  admMeta: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
  },
  admDate: {
    fontSize: typography.size['2xs'],
    marginTop: 4,
  },
  admActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
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
