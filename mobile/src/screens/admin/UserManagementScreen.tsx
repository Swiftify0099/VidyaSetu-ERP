/**
 * VidyaSetu Mobile — User Management Screen (Premium Redesign)
 * =============================================================
 * Enterprise user account administration: role assignments, status toggling,
 * credential management, and user creation bottom sheet.
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
import { usersAPI } from '../../services/api';
import { spacing, radius, typography, shadows } from '../../theme';
import { formatDateLong, getErrorMessage } from '../../utils/formatters';
import {
  AppCard,
  AppBadge,
  AppAvatar,
  AppButton,
  AppChip,
  AppSearchBar,
  AppInput,
  AppBottomSheet,
  AppConfirmDialog,
  AppEmptyState,
  AppSkeleton,
} from '../../components/ui';
import Toast from 'react-native-toast-message';

interface UserRecord {
  id: number;
  username: string;
  full_name: string;
  email?: string;
  mobile?: string;
  is_active: boolean;
  roles: { code: string; name: string }[];
  last_login?: string;
  created_at: string;
}

interface Role {
  id: number;
  name: string;
  code: string;
}

const EMPTY_FORM = {
  username: '',
  full_name: '',
  email: '',
  mobile: '',
  password: '',
  role_ids: [] as number[],
};

export default function UserManagementScreen({ navigation }: { navigation: any }) {
  const { colors, roleAccent } = useTheme();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [filterActive, setFilterActive] = useState<boolean | null>(null);

  // Status Toggle Dialog
  const [targetUser, setTargetUser] = useState<UserRecord | null>(null);
  const [toggleLoading, setToggleLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const [usersRes, rolesRes] = await Promise.allSettled([
        usersAPI.list({ search: search || undefined, is_active: filterActive ?? undefined }),
        usersAPI.getRoles(),
      ]);
      if (usersRes.status === 'fulfilled') {
        setUsers(usersRes.value.data?.data?.items ?? usersRes.value.data?.data ?? []);
      }
      if (rolesRes.status === 'fulfilled') {
        setRoles(rolesRes.value.data?.data ?? []);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, filterActive]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const openCreate = () => {
    setForm({ ...EMPTY_FORM });
    setEditId(null);
    setShowForm(true);
  };

  const openEdit = (user: UserRecord) => {
    setForm({
      username: user.username,
      full_name: user.full_name,
      email: user.email ?? '',
      mobile: user.mobile ?? '',
      password: '',
      role_ids: user.roles
        .map(r => {
          const found = roles.find(ro => ro.code === r.code);
          return found?.id ?? 0;
        })
        .filter(Boolean),
    });
    setEditId(user.id);
    setShowForm(true);
  };

  const saveUser = async () => {
    if (!form.username.trim()) {
      Toast.show({ type: 'error', text1: 'Username required' });
      return;
    }
    if (!form.full_name.trim()) {
      Toast.show({ type: 'error', text1: 'Full name required' });
      return;
    }
    if (!editId && !form.password.trim()) {
      Toast.show({ type: 'error', text1: 'Password required for new users' });
      return;
    }

    setSaving(true);
    try {
      const payload: any = { ...form };
      if (editId && !payload.password) delete payload.password;
      if (editId) {
        await usersAPI.update(editId, payload);
        Toast.show({ type: 'success', text1: 'User Updated Successfully' });
      } else {
        await usersAPI.create(payload);
        Toast.show({ type: 'success', text1: 'User Created Successfully' });
      }
      setShowForm(false);
      load();
    } catch (e) {
      Toast.show({ type: 'error', text1: getErrorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  const confirmToggleActive = async () => {
    if (!targetUser) return;
    setToggleLoading(true);
    try {
      if (targetUser.is_active) {
        await usersAPI.deactivate(targetUser.id);
      } else {
        await usersAPI.activate(targetUser.id);
      }
      Toast.show({
        type: 'success',
        text1: `User ${targetUser.is_active ? 'Deactivated' : 'Activated'}`,
      });
      setTargetUser(null);
      load();
    } catch (e) {
      Toast.show({ type: 'error', text1: getErrorMessage(e) });
    } finally {
      setToggleLoading(false);
    }
  };

  const toggleRoleSelect = (roleId: number) => {
    setForm(f => ({
      ...f,
      role_ids: f.role_ids.includes(roleId)
        ? f.role_ids.filter(id => id !== roleId)
        : [...f.role_ids, roleId],
    }));
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Top Search & Filter */}
      <View style={[styles.topBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <AppSearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, username or email..."
          style={{ marginVertical: 0 }}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.xs, paddingTop: spacing.xs }}
        >
          <AppChip
            label="All Users"
            selected={filterActive === null}
            onPress={() => setFilterActive(null)}
          />
          <AppChip
            label="Active Only"
            selected={filterActive === true}
            onPress={() => setFilterActive(filterActive === true ? null : true)}
          />
          <AppChip
            label="Inactive"
            selected={filterActive === false}
            onPress={() => setFilterActive(filterActive === false ? null : false)}
          />
        </ScrollView>
      </View>

      {loading ? (
        <View style={{ padding: spacing.base }}>
          <AppSkeleton variant="list" count={6} />
        </View>
      ) : (
        <FlatList
          data={users}
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
              icon="users-cog"
              title="No Users Found"
              description="No user accounts match your search query or status filter."
              actionLabel="Create User"
              onAction={openCreate}
              style={{ flex: 1 }}
            />
          }
          renderItem={({ item }) => (
            <AppCard variant="bordered" padding={14}>
              <View style={styles.userRow}>
                <AppAvatar name={item.full_name} size="md" />

                <View style={{ flex: 1 }}>
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

                  <Text style={[styles.username, { color: colors.textSecondary }]}>
                    @{item.username} {item.mobile ? `• ${item.mobile}` : ''}
                  </Text>

                  {/* Role Tags */}
                  <View style={styles.roleChips}>
                    {item.roles.map((r, i) => (
                      <AppBadge
                        key={i}
                        label={r.name}
                        variant="primary"
                        size="sm"
                      />
                    ))}
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.actionCol}>
                  <TouchableOpacity
                    style={[styles.iconBtn, { backgroundColor: colors.surfaceAlt }]}
                    onPress={() => openEdit(item)}
                    activeOpacity={0.75}
                  >
                    <Icon name="pen" size={11} color={colors.primary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.iconBtn,
                      { backgroundColor: item.is_active ? colors.dangerBg : colors.successBg },
                    ]}
                    onPress={() => setTargetUser(item)}
                    activeOpacity={0.75}
                  >
                    <Icon
                      name={item.is_active ? 'user-slash' : 'user-check'}
                      size={11}
                      color={item.is_active ? colors.danger : colors.success}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </AppCard>
          )}
        />
      )}

      {/* Floating Create Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, ...shadows.lg }]}
        onPress={openCreate}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Create User"
      >
        <Icon name="user-plus" size={20} color="#fff" solid />
      </TouchableOpacity>

      {/* Create / Edit User Bottom Sheet */}
      <AppBottomSheet
        visible={showForm}
        onClose={() => setShowForm(false)}
        title={editId ? 'Edit User Account' : 'Create User Account'}
        subtitle="Configure profile information and security roles"
      >
        <View style={{ gap: spacing.xs }}>
          <AppInput
            label="Full Name *"
            value={form.full_name}
            onChangeText={v => setForm(f => ({ ...f, full_name: v }))}
            icon="user"
            placeholder="e.g. Anand Joshi"
          />

          <AppInput
            label="Username *"
            value={form.username}
            onChangeText={v => setForm(f => ({ ...f, username: v }))}
            icon="at"
            placeholder="e.g. anand.joshi"
            autoCapitalize="none"
          />

          <AppInput
            label={editId ? 'New Password (Leave blank to keep current)' : 'Password *'}
            value={form.password}
            onChangeText={v => setForm(f => ({ ...f, password: v }))}
            icon="lock"
            secureEntry
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
            label="Email Address"
            value={form.email}
            onChangeText={v => setForm(f => ({ ...f, email: v }))}
            icon="envelope"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          {/* Role Checkboxes */}
          <Text style={[styles.roleLabel, { color: colors.textSecondary }]}>Assign System Roles</Text>
          <View style={styles.roleGrid}>
            {roles.map(r => {
              const isSelected = form.role_ids.includes(r.id);
              return (
                <AppChip
                  key={r.id}
                  label={r.name}
                  selected={isSelected}
                  onPress={() => toggleRoleSelect(r.id)}
                />
              );
            })}
          </View>

          <AppButton
            label={editId ? 'Save Account Changes' : 'Create User Account'}
            iconLeft="user-check"
            variant="primary"
            size="lg"
            onPress={saveUser}
            loading={saving}
            fullWidth
            style={{ marginTop: spacing.md }}
          />
        </View>
      </AppBottomSheet>

      {/* Activation / Deactivation Confirmation Dialog */}
      <AppConfirmDialog
        visible={!!targetUser}
        onClose={() => setTargetUser(null)}
        onConfirm={confirmToggleActive}
        title={targetUser?.is_active ? 'Deactivate User Account' : 'Activate User Account'}
        message={
          targetUser?.is_active
            ? `Are you sure you want to deactivate ${targetUser?.full_name}? They will lose portal access immediately.`
            : `Are you sure you want to activate ${targetUser?.full_name}?`
        }
        confirmLabel={targetUser?.is_active ? 'Deactivate Account' : 'Activate Account'}
        variant={targetUser?.is_active ? 'danger' : 'success'}
        loading={toggleLoading}
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
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    flex: 1,
    marginRight: spacing.sm,
  },
  username: {
    fontSize: typography.size.xs,
    marginTop: 1,
  },
  roleChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
  },
  actionCol: {
    gap: 6,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    textTransform: 'uppercase',
    marginTop: spacing.xs,
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
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
