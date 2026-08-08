/**
 * VidyaSetu Mobile — Profile Screen
 * View & edit profile, change password, logout.
 * All roles.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal,
  TextInput, Alert, ActivityIndicator, Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from '../../theme/ThemeContext';
import { useAuthStore } from '../../store/authStore';
import { profileAPI } from '../../services/api';
import { spacing, radius, typography, shadows } from '../../theme';
import { getErrorMessage } from '../../utils/formatters';
import PremiumCard from '../../components/ui/PremiumCard';
import SectionHeader from '../../components/ui/SectionHeader';
import Toast from 'react-native-toast-message';

export default function ProfileScreen({ navigation }: { navigation: any }) {
  const { colors, roleAccent, isDark } = useTheme();
  const { user, logout } = useAuthStore();
  const [profile, setProfile] = useState<any>(user);
  const [loading, setLoading] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: '', mobile: '', email: '' });
  const [pwForm, setPwForm] = useState({ old: '', new: '', confirm: '' });
  const [showOldPw, setShowOldPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await profileAPI.getMyProfile();
      const data = res.data?.data ?? res.data;
      setProfile(data);
    } catch { /* use stored user data */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const openEdit = () => {
    setEditForm({
      full_name: profile?.full_name ?? '',
      mobile:    profile?.mobile ?? '',
      email:     profile?.email ?? '',
    });
    setShowEdit(true);
  };

  const saveProfile = async () => {
    if (!editForm.full_name.trim()) {
      Toast.show({ type: 'error', text1: 'Name is required' });
      return;
    }
    setSaving(true);
    try {
      await profileAPI.updateProfile(editForm);
      Toast.show({ type: 'success', text1: 'Profile updated successfully' });
      setShowEdit(false);
      fetchProfile();
    } catch (e) {
      Toast.show({ type: 'error', text1: getErrorMessage(e) });
    } finally { setSaving(false); }
  };

  const changePassword = async () => {
    if (!pwForm.old.trim())     { Toast.show({ type: 'error', text1: 'Current password is required' }); return; }
    if (!pwForm.new.trim())     { Toast.show({ type: 'error', text1: 'New password is required' }); return; }
    if (pwForm.new.length < 6)  { Toast.show({ type: 'error', text1: 'Password must be at least 6 characters' }); return; }
    if (pwForm.new !== pwForm.confirm) { Toast.show({ type: 'error', text1: 'Passwords do not match' }); return; }

    setSaving(true);
    try {
      await profileAPI.changePassword(pwForm.old, pwForm.new);
      Toast.show({ type: 'success', text1: 'Password changed successfully!' });
      setShowPassword(false);
      setPwForm({ old: '', new: '', confirm: '' });
    } catch (e) {
      Toast.show({ type: 'error', text1: getErrorMessage(e) });
    } finally { setSaving(false); }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const firstName  = profile?.full_name?.split(' ')[0] ?? 'User';
  const roleName   = profile?.roles?.[0]?.name ?? 'User';
  const roleCode   = profile?.roles?.[0]?.code ?? 'admin';
  const initials   = profile?.full_name
    ?.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2) ?? 'U';

  const INFO_ITEMS = [
    { icon: 'user',       label: 'Full Name',   value: profile?.full_name },
    { icon: 'id-card',    label: 'Username',     value: profile?.username },
    { icon: 'envelope',   label: 'Email',        value: profile?.email },
    { icon: 'phone',      label: 'Mobile',       value: profile?.mobile },
    { icon: 'id-badge',   label: 'Employee ID',  value: profile?.employee_id },
    { icon: 'language',   label: 'Language',     value: profile?.preferred_language },
  ].filter(item => item.value);

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <LinearGradient
          colors={roleAccent.gradient}
          style={[s.hero, { paddingTop: 56 }]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          <View style={[s.heroCircle, { backgroundColor: 'rgba(255,255,255,0.07)' }]} />
          <View style={s.avatarSection}>
            <View style={[s.avatarWrap, { borderColor: 'rgba(255,255,255,0.5)' }]}>
              {profile?.photo_path ? (
                <Image source={{ uri: profile.photo_path }} style={s.avatarImg} />
              ) : (
                <Text style={s.avatarInitials}>{initials}</Text>
              )}
            </View>
            <TouchableOpacity style={s.editAvatarBtn} onPress={openEdit}>
              <Icon name="camera" size={12} color="#fff" solid />
            </TouchableOpacity>
          </View>
          <Text style={s.heroName}>{profile?.full_name ?? '—'}</Text>
          <View style={[s.rolePill, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
            <Icon name="shield-alt" size={10} color="rgba(255,255,255,0.9)" solid />
            <Text style={s.rolePillText}>{roleName}</Text>
          </View>
        </LinearGradient>

        {/* Info Section */}
        <View style={[s.section, { marginTop: spacing.xl }]}>
          <SectionHeader title="Personal Information" icon="user-circle" />
          <PremiumCard variant="bordered" padding={0}>
            {INFO_ITEMS.map((item, i) => (
              <View key={i} style={[
                s.infoRow,
                { borderBottomColor: colors.divider },
                i < INFO_ITEMS.length - 1 && { borderBottomWidth: 1 },
              ]}>
                <View style={[s.infoIcon, { backgroundColor: colors.primaryBg }]}>
                  <Icon name={item.icon} size={14} color={colors.primary} solid />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.infoLabel, { color: colors.textTertiary }]}>{item.label}</Text>
                  <Text style={[s.infoValue, { color: colors.text }]}>{item.value}</Text>
                </View>
              </View>
            ))}
          </PremiumCard>
        </View>

        {/* Actions */}
        <View style={[s.section, { marginTop: spacing.xl }]}>
          <SectionHeader title="Account" icon="cog" />
          <PremiumCard variant="bordered" padding={0}>
            <TouchableOpacity style={[s.menuRow, { borderBottomColor: colors.divider, borderBottomWidth: 1 }]} onPress={openEdit}>
              <View style={[s.menuIcon, { backgroundColor: colors.primaryBg }]}>
                <Icon name="edit" size={14} color={colors.primary} solid />
              </View>
              <Text style={[s.menuText, { color: colors.text }]}>Edit Profile</Text>
              <Icon name="chevron-right" size={12} color={colors.textTertiary} solid />
            </TouchableOpacity>
            <TouchableOpacity style={[s.menuRow, { borderBottomColor: colors.divider, borderBottomWidth: 1 }]} onPress={() => setShowPassword(true)}>
              <View style={[s.menuIcon, { backgroundColor: colors.warningBg }]}>
                <Icon name="key" size={14} color={colors.warning} solid />
              </View>
              <Text style={[s.menuText, { color: colors.text }]}>Change Password</Text>
              <Icon name="chevron-right" size={12} color={colors.textTertiary} solid />
            </TouchableOpacity>
            <TouchableOpacity style={s.menuRow} onPress={handleLogout}>
              <View style={[s.menuIcon, { backgroundColor: colors.dangerBg }]}>
                <Icon name="sign-out-alt" size={14} color={colors.danger} solid />
              </View>
              <Text style={[s.menuText, { color: colors.danger }]}>Logout</Text>
              <Icon name="chevron-right" size={12} color={colors.textTertiary} solid />
            </TouchableOpacity>
          </PremiumCard>
        </View>

        <View style={{ height: spacing['3xl'] }} />
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={showEdit} animationType="slide" presentationStyle="pageSheet">
        <View style={[s.modal, { backgroundColor: colors.background }]}>
          <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowEdit(false)}>
              <Icon name="times" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={[s.modalTitle, { color: colors.text }]}>Edit Profile</Text>
            <TouchableOpacity onPress={saveProfile} disabled={saving}>
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
                value={editForm.full_name}
                onChangeText={v => setEditForm(f => ({ ...f, full_name: v }))}
                placeholder="Your full name..."
                placeholderTextColor={colors.placeholder}
              />
            </View>
            <View>
              <Text style={[s.label, { color: colors.textSecondary }]}>Mobile</Text>
              <TextInput
                style={[s.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                value={editForm.mobile}
                onChangeText={v => setEditForm(f => ({ ...f, mobile: v }))}
                placeholder="10-digit mobile number..."
                placeholderTextColor={colors.placeholder}
                keyboardType="phone-pad"
              />
            </View>
            <View>
              <Text style={[s.label, { color: colors.textSecondary }]}>Email</Text>
              <TextInput
                style={[s.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                value={editForm.email}
                onChangeText={v => setEditForm(f => ({ ...f, email: v }))}
                placeholder="your@email.com"
                placeholderTextColor={colors.placeholder}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal visible={showPassword} animationType="slide" presentationStyle="pageSheet">
        <View style={[s.modal, { backgroundColor: colors.background }]}>
          <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowPassword(false)}>
              <Icon name="times" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={[s.modalTitle, { color: colors.text }]}>Change Password</Text>
            <TouchableOpacity onPress={changePassword} disabled={saving}>
              {saving
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Text style={[s.saveText, { color: colors.primary }]}>Update</Text>}
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: spacing.base, gap: 14 }}>
            <View>
              <Text style={[s.label, { color: colors.textSecondary }]}>Current Password *</Text>
              <View style={s.pwRow}>
                <TextInput
                  style={[s.input, s.pwInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                  value={pwForm.old}
                  onChangeText={v => setPwForm(f => ({ ...f, old: v }))}
                  placeholder="Current password..."
                  placeholderTextColor={colors.placeholder}
                  secureTextEntry={!showOldPw}
                  autoCapitalize="none"
                />
                <TouchableOpacity style={s.eyeBtn} onPress={() => setShowOldPw(!showOldPw)}>
                  <Icon name={showOldPw ? 'eye-slash' : 'eye'} size={16} color={colors.textSecondary} solid />
                </TouchableOpacity>
              </View>
            </View>
            <View>
              <Text style={[s.label, { color: colors.textSecondary }]}>New Password *</Text>
              <View style={s.pwRow}>
                <TextInput
                  style={[s.input, s.pwInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                  value={pwForm.new}
                  onChangeText={v => setPwForm(f => ({ ...f, new: v }))}
                  placeholder="New password (min. 6 chars)..."
                  placeholderTextColor={colors.placeholder}
                  secureTextEntry={!showNewPw}
                  autoCapitalize="none"
                />
                <TouchableOpacity style={s.eyeBtn} onPress={() => setShowNewPw(!showNewPw)}>
                  <Icon name={showNewPw ? 'eye-slash' : 'eye'} size={16} color={colors.textSecondary} solid />
                </TouchableOpacity>
              </View>
            </View>
            <View>
              <Text style={[s.label, { color: colors.textSecondary }]}>Confirm New Password *</Text>
              <TextInput
                style={[s.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                value={pwForm.confirm}
                onChangeText={v => setPwForm(f => ({ ...f, confirm: v }))}
                placeholder="Confirm new password..."
                placeholderTextColor={colors.placeholder}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>
            {pwForm.new && pwForm.confirm && pwForm.new !== pwForm.confirm && (
              <Text style={[s.errorText, { color: colors.danger }]}>⚠ Passwords do not match</Text>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  hero: {
    padding: spacing.base,
    paddingBottom: spacing['2xl'],
    alignItems: 'center',
    overflow: 'hidden',
  },
  heroCircle: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    top: -60, right: -60,
  },
  avatarSection: { position: 'relative', marginBottom: spacing.md },
  avatarWrap: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3,
  },
  avatarImg: { width: 84, height: 84, borderRadius: 42 },
  avatarInitials: { color: '#fff', fontSize: 32, fontWeight: '900' },
  editAvatarBtn: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroName: { color: '#fff', fontSize: typography.size['2xl'], fontWeight: typography.weight.extrabold, marginBottom: 6 },
  rolePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 5, borderRadius: radius.full,
  },
  rolePillText: { color: 'rgba(255,255,255,0.95)', fontSize: typography.size.sm, fontWeight: typography.weight.semibold },
  section: { paddingHorizontal: spacing.base },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.md,
  },
  infoIcon: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  infoLabel: { fontSize: typography.size.xs, fontWeight: typography.weight.medium, marginBottom: 2 },
  infoValue: { fontSize: typography.size.base, fontWeight: typography.weight.semibold },
  menuRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.md,
  },
  menuIcon: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  menuText: { flex: 1, fontSize: typography.size.base, fontWeight: typography.weight.semibold },
  modal: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.base, borderBottomWidth: 1 },
  modalTitle: { fontSize: typography.size.lg, fontWeight: typography.weight.bold },
  saveText: { fontSize: typography.size.base, fontWeight: typography.weight.bold },
  label: { fontSize: typography.size.xs, fontWeight: typography.weight.semibold, textTransform: 'uppercase', marginBottom: 6 },
  input: { height: 48, borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: spacing.md, fontSize: typography.size.base },
  pwRow: { flexDirection: 'row', alignItems: 'center', gap: 0 },
  pwInput: { flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRightWidth: 0 },
  eyeBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderLeftWidth: 0, borderRadius: radius.md, borderTopLeftRadius: 0, borderBottomLeftRadius: 0, backgroundColor: '#f9fafb', borderColor: '#e5e7eb' },
  errorText: { fontSize: typography.size.sm, fontWeight: typography.weight.medium },
});
