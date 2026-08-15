/**
 * VidyaSetu Mobile — Student Directory Screen (Premium Redesign)
 * ===============================================================
 * Searchable directory, class filtering, student profile navigation,
 * and bottom sheet creation modal.
 */
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from '../../theme/ThemeContext';
import { studentsAPI } from '../../services/api';
import { spacing, radius, typography, shadows } from '../../theme';
import { CLASSES, CURRENT_ACADEMIC_YEAR } from '../../config/constants';
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
} from '../../components/ui';
import Toast from 'react-native-toast-message';
import { getErrorMessage } from '../../utils/formatters';

interface Student {
  id: number;
  full_name: string;
  gr_number: string;
  standard: string;
  division: string;
  roll_number: number;
  is_active: boolean;
  mobile?: string;
  guardian_name?: string;
}

const EMPTY_STUDENT_FORM = {
  full_name: '',
  gr_number: '',
  standard: '8',
  division: 'A',
  roll_number: '1',
  dob: '2012-01-01',
  gender: 'male',
  mobile: '',
  guardian_name: '',
  guardian_mobile: '',
};

const CLASS_OPTIONS = CLASSES.map(c => ({ label: `Standard ${c}`, value: c }));
const DIVISION_OPTIONS = ['A', 'B', 'C', 'D'].map(d => ({ label: `Division ${d}`, value: d }));

export default function StudentListScreen({ navigation }: { navigation: any }) {
  const { colors } = useTheme();
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [selectedStandard, setSelectedStandard] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);

  // Add Student Sheet
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_STUDENT_FORM });

  const loadStudents = useCallback(async () => {
    try {
      const res = await studentsAPI.list({
        search: search || undefined,
        standard: selectedStandard || undefined,
        page,
        per_page: 50,
        academic_year: CURRENT_ACADEMIC_YEAR,
      });
      const items = res.data?.data?.items ?? res.data?.data ?? [];
      setStudents(items);
    } catch (e) {
      setStudents([]);
      Toast.show({ type: 'error', text1: 'Failed to load students', text2: getErrorMessage(e) });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, selectedStandard, page]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const onRefresh = () => {
    setRefreshing(true);
    loadStudents();
  };

  const handleCreateStudent = async () => {
    if (!form.full_name.trim() || !form.gr_number.trim()) {
      Toast.show({ type: 'error', text1: 'Full Name and GR Number are required' });
      return;
    }
    setSaving(true);
    try {
      await studentsAPI.create({
        full_name: form.full_name,
        gr_number: form.gr_number,
        standard: form.standard,
        division: form.division,
        roll_number: Number(form.roll_number) || 1,
        gender: form.gender,
        dob: form.dob,
        mobile: form.mobile,
        guardian_name: form.guardian_name,
        guardian_mobile: form.guardian_mobile,
        academic_year: CURRENT_ACADEMIC_YEAR,
      });
      Toast.show({ type: 'success', text1: 'Student Added Successfully' });
      setShowAddModal(false);
      setForm({ ...EMPTY_STUDENT_FORM });
      loadStudents();
    } catch (e: any) {
      Toast.show({
        type: 'error',
        text1: 'Failed to add student',
        text2: getErrorMessage(e),
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = useMemo(() => {
    if (!search.trim()) return students;
    const q = search.toLowerCase();
    return students.filter(
      s =>
        s.full_name.toLowerCase().includes(q) ||
        s.gr_number.toLowerCase().includes(q) ||
        (s.guardian_name && s.guardian_name.toLowerCase().includes(q))
    );
  }, [students, search]);

  const renderItem = ({ item }: { item: Student }) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() =>
        navigation?.navigate('StudentDetail', {
          studentId: item.id,
          studentName: item.full_name,
        })
      }
    >
      <AppCard variant="bordered" padding={14}>
        <View style={styles.cardRow}>
          {/* Avatar with initial */}
          <AppAvatar name={item.full_name} size="md" />

          {/* Student Info */}
          <View style={styles.info}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                {item.full_name}
              </Text>
              <AppBadge
                label={item.is_active ? 'Active' : 'Inactive'}
                variant={item.is_active ? 'success' : 'danger'}
                size="sm"
                rounded
              />
            </View>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>
              GR: <Text style={{ fontWeight: '700', color: colors.text }}>{item.gr_number}</Text> • Std {item.standard}-{item.division} • Roll #{item.roll_number}
            </Text>
            {item.guardian_name ? (
              <Text style={[styles.subMeta, { color: colors.textTertiary }]} numberOfLines={1}>
                Guardian: {item.guardian_name}
              </Text>
            ) : null}
          </View>

          <Icon name="chevron-right" size={12} color={colors.textTertiary} />
        </View>
      </AppCard>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      {/* Search Header */}
      <View style={[styles.headerWrap, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <AppSearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, GR number, guardian..."
          style={{ marginVertical: 0 }}
        />

        {/* Standard Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.sm, paddingTop: spacing.xs }}
        >
          <AppChip
            label="All Classes"
            selected={selectedStandard === null}
            onPress={() => setSelectedStandard(null)}
          />
          {CLASSES.map(cls => (
            <AppChip
              key={cls}
              label={`Std ${cls}`}
              selected={selectedStandard === cls}
              onPress={() => setSelectedStandard(selectedStandard === cls ? null : cls)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Directory Content */}
      {loading ? (
        <View style={{ padding: spacing.base }}>
          <AppSkeleton variant="list" count={6} />
        </View>
      ) : (
        <FlatList
          data={filteredStudents}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <AppEmptyState
              icon="user-graduate"
              title="No Students Found"
              description={
                search || selectedStandard
                  ? 'No students matched your search filters. Try clearing or broadening your search.'
                  : 'No student records have been created yet.'
              }
              actionLabel={search || selectedStandard ? 'Clear Filters' : 'Add First Student'}
              onAction={() => {
                if (search || selectedStandard) {
                  setSearch('');
                  setSelectedStandard(null);
                } else {
                  setShowAddModal(true);
                }
              }}
              style={{ flex: 1 }}
            />
          }
        />
      )}

      {/* FAB to Add Student */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, ...shadows.lg }]}
        onPress={() => setShowAddModal(true)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Add New Student"
      >
        <Icon name="user-plus" size={20} color="#fff" solid />
      </TouchableOpacity>

      {/* Add Student Bottom Sheet */}
      <AppBottomSheet
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Student"
        subtitle="Create official student enrollment record"
      >
        <View style={{ gap: spacing.xs }}>
          <AppInput
            label="Full Name *"
            value={form.full_name}
            onChangeText={v => setForm(f => ({ ...f, full_name: v }))}
            icon="user"
            placeholder="e.g. Rahul Sharma"
          />

          <AppInput
            label="GR Number *"
            value={form.gr_number}
            onChangeText={v => setForm(f => ({ ...f, gr_number: v }))}
            icon="id-card"
            placeholder="e.g. GR-2025-001"
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

          <AppInput
            label="Roll Number"
            value={form.roll_number}
            onChangeText={v => setForm(f => ({ ...f, roll_number: v }))}
            icon="hashtag"
            keyboardType="number-pad"
          />

          <AppInput
            label="Guardian Name"
            value={form.guardian_name}
            onChangeText={v => setForm(f => ({ ...f, guardian_name: v }))}
            icon="user-friends"
            placeholder="Parent / Guardian full name"
          />

          <AppInput
            label="Contact Mobile"
            value={form.mobile}
            onChangeText={v => setForm(f => ({ ...f, mobile: v }))}
            icon="phone"
            keyboardType="phone-pad"
            maxLength={10}
          />

          <AppButton
            label="Enroll Student"
            iconLeft="user-check"
            variant="primary"
            size="lg"
            onPress={handleCreateStudent}
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
  page: {
    flex: 1,
  },
  headerWrap: {
    padding: spacing.base,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  list: {
    padding: spacing.base,
    paddingBottom: 100,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  name: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    flex: 1,
    marginRight: spacing.sm,
  },
  meta: {
    fontSize: typography.size.xs,
    marginTop: 2,
  },
  subMeta: {
    fontSize: typography.size['2xs'],
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
