/**
 * VidyaSetu Mobile — User Management Screen
 * Admin: create, edit, deactivate users.
 * super_admin, admin
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal,
  TextInput, Alert, ActivityIndicator, ScrollView, RefreshControl, Switch,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from '../../theme/ThemeContext';
import { usersAPI } from '../../services/api';
import { spacing, radius, typography, shadows } from '../../theme';
import { formatDateLong, getErrorMessage } from '../../utils/formatters';
import Badge from '../../components/ui/Badge';
import PremiumCard from '../../components/ui/PremiumCard';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
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

interface Role { id: number; name: string; code: string; }

const EMPTY_FORM = {
  username: '',
  full_name: '',
  email: '',
  mobile: '',
  password: '',
  role_ids: [] as number[],
};

export default function UserManagementScreen({ navigation }: { navigation: any }) {
  const { colors } = useTheme();
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

  const load = useCallback(async () => {
    try {
      const [usersRes, rolesRes] = await Promise.allSettled([
        usersAPI.list({ search: search || undefined, is_active: filterActive ?? undefined }),
        usersAPI.getRoles(),
      ]);
      if (usersRes.status  === 'fulfilled') setUsers(usersRes.value.data?.data?.items ?? usersRes.value.data?.data ?? []);
      if (rolesRes.status  === 'fulfilled') setRoles(rolesRes.value.data?.data ?? []);
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  }, [search, filterActive]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

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
      role_ids: user.roles.map(r => {
        const found = roles.find(ro => ro.code === r.code);
        return found?.id ?? 0;
      }).filter(Boolean),
    });
    setEditId(user.id);
    setShowForm(true);
  };

  const saveUser = async () => {
    if (!form.username.trim())  { Toast.show({ type: 'error', text1: 'Username required' }); return; }
    if (!form.full_name.trim()) { Toast.show({ type: 'error', text1: 'Full name required' }); return; }
    if (!editId && !form.password.trim()) { Toast.show({ type: 'error', text1: 'Password required for new users' }); return; }

    setSaving(true);
    try {
      const payload: any = { ...form };
      if (editId && !payload.password) delete payload.password;
      if (editId) {
        await usersAPI.update(editId, payload);
        Toast.show({ type: 'success', text1: 'User updated' });
      } else {
        await usersAPI.create(payload);
        Toast.show({ type: 'success', text1: 'User created' });
      }
      setShowForm(false);
      load();
    } catch (e) {
      Toast.show({ type: 'error', text1: getErrorMessage(e) });
    } finally { setSaving(false); }
  };

  const toggleActive = async (user: UserRecord) => {
    Alert.alert(
      user.is_active ? 'Deactivate User' : 'Activate User',
      `Are you sure you want to ${user.is_active ? 'deactivate' : 'activate'} ${user.full_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: user.is_active ? 'Deactivate' : 'Activate',
          style: user.is_active ? 'destructive' : 'default',
          onPress: async () => {
            try {
              if (user.is_active) {
                await usersAPI.deactivate(user.id);
              } else {
                await usersAPI.activate(user.id);
              }
              Toast.show({ type: 'success', text1: `User ${user.is_active ? 'deactivated' : 'activated'}` });
              load();
            } catch (e) {
              Toast.show({ type: 'error', text1: getErrorMessage(e) });
            }
          },
        },
      ]
    );
  };

  const resetPassword = (userId: number) => {
    Alert.prompt(
      'Reset Password',
      'Enter new password:',
      async (newPassword) => {
        if (!newPassword || newPassword.length < 6) {
          Toast.show({ type: 'error', text1: 'Password must be at least 6 characters' });
          return;
        }
        try {
          await usersAPI.resetPassword(userId, { new_password: newPassword });
          Toast.show({ type: 'success', text1: 'Password reset successfully' });
        } catch (e) {
          Toast.show({ type: 'error', text1: getErrorMessage(e) });
        }
      },
      'secure-text'
    );
  };

  const toggleRoleId = (roleId: number) => {
    setForm(f => ({
      ...f,
      role_ids: f.role_ids.includes(roleId)
        ? f.role_ids.filter(r => r !== roleId)
        : [...f.role_ids, roleId],
    }));
  };

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      {/* Search & Filter */}
      <View style={[s.topBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[s.searchBox, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
          <Icon name="search" size={14} color={colors.textTertiary} />
          <TextInput
            style={[s.searchInput, { color: colors.text }]}
            value={search}
            onChangeText={setSearch}
            placeholder="Search users..."
            placeholderTextColor={colors.placeholder}
          />
        </View>
        <View style={s.filterBtns}>
          {([null, true, false] as (boolean | null)[]).map((v, i) => (
            <TouchableOpacity
              key={i}
              style={[s.filterBtn, filterActive === v && { backgroundColor: colors.primary }]}
              onPress={() => setFilterActive(v)}
            >
              <Text style={[s.filterBtnText, filterActive === v && { color: '#fff' }]}>
                {v === null ? 'All' : v ? 'Active' : 'Inactive'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={{ padding: spacing.base }}>
          <SkeletonLoader variant="list" count={6} />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={u => String(u.id)}
          contentContainerStyle={{ padding: spacing.base, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => (
            <PremiumCard variant="bordered" padding={12}>
              <View style={s.userRow}>
                <View style={[s.avatar, { backgroundColor: item.is_active ? colors.primaryBg : colors.surfaceAlt }]}>
                  <Text style={[s.avatarText, { color: item.is_active ? colors.primary : colors.textTertiary }]}>
                    {item.full_name[0]?.toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.userTitleRow}>
                    <Text style={[s.userName, { color: colors.text }]}>{item.full_name}</Text>
                    <Badge
                      label={item.is_active ? 'Active' : 'Inactive'}
                      variant={item.is_active ? 'success' : 'neutral'}
                      size="sm" rounded
                    />
                  </View>
                  <Text style={[s.userSub, { color: colors.textSecondary }]}>@{item.username}</Text>
                  {item.email && <Text style={[s.userMeta, { color: colors.textTertiary }]}>✉️ {item.email}</Text>}
                  {item.mobile && <Text style={[s.userMeta, { color: colors.textTertiary }]}>📞 {item.mobile}</Text>}
                  <View style={s.roleRow}>
                    {item.roles.map((r, i2) => (
                      <Badge key={i2} label={r.name} variant="primary" size="sm" rounded />
                    ))}
                  </View>
                  <View style={s.actionRow}>
                    <TouchableOpacity
                      style={[s.actionBtn, { backgroundColor: colors.primaryBg }]}
                      onPress={() => openEdit(item)}
                    >
                      <Icon name="edit" size={11} color={colors.primary} solid />
                      <Text style={[s.actionBtnText, { color: colors.primary }]}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.actionBtn, { backgroundColor: item.is_active ? colors.dangerBg : colors.successBg }]}
                      onPress={() => toggleActive(item)}
                    >
                      <Icon name={item.is_active ? 'user-slash' : 'user-check'} size={11} color={item.is_active ? colors.danger : colors.success} solid />
                      <Text style={[s.actionBtnText, { color: item.is_active ? colors.danger : colors.success }]}>
                        {item.is_active ? 'Deactivate' : 'Activate'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.actionBtn, { backgroundColor: colors.warningBg }]}
                      onPress={() => resetPassword(item.id)}
                    >
                      <Icon name="key" size={11} color={colors.warning} solid />
                      <Text style={[s.actionBtnText, { color: colors.warning }]}>Reset</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </PremiumCard>
          )}
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <Text style={s.emptyIcon}>👥</Text>
              <Text style={[s.emptyText, { color: colors.textSecondary }]}>No users found</Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[s.fab, { backgroundColor: colors.primary }]}
        onPress={openCreate}
      >
        <Icon name="plus" size={20} color="#fff" solid />
      </TouchableOpacity>

      {/* User Form Modal */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <View style={[s.modal, { backgroundColor: colors.background }]}>
          <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <Icon name="times" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={[s.modalTitle, { color: colors.text }]}>
              {editId ? 'Edit User' : 'Create User'}
            </Text>
            <TouchableOpacity onPress={saveUser} disabled={saving}>
              {saving
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Text style={[s.saveText, { color: colors.primary }]}>Save</Text>}
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: spacing.base, gap: 14 }}>
            <View>
              <Text style={[s.label, { color: colors.textSecondary }]}>Full Name *</Text>
              <TextInput
                style={[s.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                value={form.full_name} onChangeText={v => setForm(f => ({ ...f, full_name: v }))}
                placeholder="Full name..." placeholderTextColor={colors.placeholder}
              />
            </View>
            <View>
              <Text style={[s.label, { color: colors.textSecondary }]}>Username *</Text>
              <TextInput
                style={[s.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                value={form.username} onChangeText={v => setForm(f => ({ ...f, username: v }))}
                placeholder="Username..." placeholderTextColor={colors.placeholder}
                autoCapitalize="none"
              />
            </View>
            <View>
              <Text style={[s.label, { color: colors.textSecondary }]}>Email</Text>
              <TextInput
                style={[s.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                value={form.email} onChangeText={v => setForm(f => ({ ...f, email: v }))}
                placeholder="email@example.com" placeholderTextColor={colors.placeholder}
                keyboardType="email-address" autoCapitalize="none"
              />
            </View>
            <View>
              <Text style={[s.label, { color: colors.textSecondary }]}>Mobile</Text>
              <TextInput
                style={[s.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                value={form.mobile} onChangeText={v => setForm(f => ({ ...f, mobile: v }))}
                placeholder="10-digit mobile..." placeholderTextColor={colors.placeholder}
                keyboardType="phone-pad"
              />
            </View>
            <View>
              <Text style={[s.label, { color: colors.textSecondary }]}>
                Password {editId ? '(leave blank to keep current)' : '*'}
              </Text>
              <TextInput
                style={[s.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                value={form.password} onChangeText={v => setForm(f => ({ ...f, password: v }))}
                placeholder="Password..." placeholderTextColor={colors.placeholder}
                secureTextEntry autoCapitalize="none"
              />
            </View>
            <View>
              <Text style={[s.label, { color: colors.textSecondary }]}>Assign Roles</Text>
              <View style={s.roleChips}>
                {roles.map(role => (
                  <TouchableOpacity
                    key={role.id}
                    style={[s.roleChip, form.role_ids.includes(role.id) && { backgroundColor: colors.primary }]}
                    onPress={() => toggleRoleId(role.id)}
                  >
                    <Text style={[s.roleChipText, form.role_ids.includes(role.id) && { color: '#fff' }]}>
                      {role.name}
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
  topBar: { padding: spacing.sm, gap: 8, borderBottomWidth: 1 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: 12, height: 40 },
  searchInput: { flex: 1, fontSize: typography.size.base },
  filterBtns: { flexDirection: 'row', gap: 6 },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.full, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  filterBtnText: { fontSize: typography.size.xs, fontWeight: typography.weight.bold, color: '#6b7280' },
  userRow: { flexDirection: 'row', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { fontSize: typography.size.lg, fontWeight: typography.weight.bold },
  userTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  userName: { fontSize: typography.size.base, fontWeight: typography.weight.bold, flex: 1, marginRight: 6 },
  userSub: { fontSize: typography.size.sm, marginBottom: 2 },
  userMeta: { fontSize: typography.size.xs, marginBottom: 1 },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  actionRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full },
  actionBtnText: { fontSize: typography.size.xs, fontWeight: typography.weight.semibold },
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
  roleChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full, backgroundColor: '#f3f4f6', borderWidth: 1.5, borderColor: '#e5e7eb' },
  roleChipText: { fontSize: typography.size.sm, fontWeight: typography.weight.semibold, color: '#6b7280' },
});
