/**
 * VidyaSetu Mobile — Profile Screen (Premium Redesign)
 * ====================================================
 * Account profile management, theme appearance toggle, password update,
 * and secure session logout.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from '../../theme/ThemeContext';
import { useAuthStore } from '../../store/authStore';
import { profileAPI } from '../../services/api';
import { spacing, radius, typography, shadows } from '../../theme';
import { getErrorMessage } from '../../utils/formatters';
import {
  AppCard,
  AppButton,
  AppBadge,
  AppAvatar,
  AppSectionHeader,
  AppInput,
  AppBottomSheet,
  AppSwitch,
  AppConfirmDialog,
  AppDivider,
} from '../../components/ui';
import Toast from 'react-native-toast-message';

export default function ProfileScreen({ navigation }: { navigation: any }) {
  const { colors, roleAccent, isDark, toggleTheme } = useTheme();
  const { user, logout } = useAuthStore();
  const [profile, setProfile] = useState<any>(user);
  const [loading, setLoading] = useState(false);

  // Edit Profile Sheet
  const [showEdit, setShowEdit] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: '', mobile: '', email: '' });

  // Change Password Sheet
  const [showPassword, setShowPassword] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwForm, setPwForm] = useState({ old: '', new: '', confirm: '' });

  // Logout Dialog
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await profileAPI.getMyProfile();
      const data = res.data?.data ?? res.data;
      setProfile(data);
    } catch {
      /* use stored user data */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

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
    setEditSaving(true);
    try {
      await profileAPI.updateProfile(editForm);
      Toast.show({ type: 'success', text1: 'Profile Updated Successfully' });
      setShowEdit(false);
      fetchProfile();
    } catch (e) {
      Toast.show({ type: 'error', text1: getErrorMessage(e) });
    } finally {
      setEditSaving(false);
    }
  };

  const changePassword = async () => {
    if (!pwForm.old.trim()) {
      Toast.show({ type: 'error', text1: 'Current password is required' });
      return;
    }
    if (!pwForm.new.trim()) {
      Toast.show({ type: 'error', text1: 'New password is required' });
      return;
    }
    if (pwForm.new.length < 6) {
      Toast.show({ type: 'error', text1: 'Password must be at least 6 characters' });
      return;
    }
    if (pwForm.new !== pwForm.confirm) {
      Toast.show({ type: 'error', text1: 'Passwords do not match' });
      return;
    }

    setPwSaving(true);
    try {
      await profileAPI.changePassword(pwForm.old, pwForm.new);
      Toast.show({ type: 'success', text1: 'Password Changed Successfully!' });
      setShowPassword(false);
      setPwForm({ old: '', new: '', confirm: '' });
    } catch (e) {
      Toast.show({ type: 'error', text1: getErrorMessage(e) });
    } finally {
      setPwSaving(false);
    }
  };

  const firstName = profile?.full_name?.split(' ')[0] ?? 'User';
  const roleName  = profile?.roles?.[0]?.name ?? 'User';

  const INFO_ITEMS = [
    { icon: 'user',       label: 'Full Name',   value: profile?.full_name },
    { icon: 'id-card',    label: 'Username',     value: profile?.username },
    { icon: 'envelope',   label: 'Email',        value: profile?.email },
    { icon: 'phone',      label: 'Mobile',       value: profile?.mobile },
    { icon: 'id-badge',   label: 'Employee ID',  value: profile?.employee_id },
    { icon: 'language',   label: 'Language',     value: profile?.preferred_language || 'English (IN)' },
  ].filter(item => item.value);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* ── Hero Header ───────────────────────────────────────── */}
        <LinearGradient
          colors={roleAccent.gradient}
          style={[styles.hero, { paddingTop: Platform.OS === 'ios' ? 56 : 40 }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.avatarSection}>
            <AppAvatar
              name={profile?.full_name}
              size="xl"
              imageUrl={profile?.photo_path}
              roleColor="#ffffff"
            />
            <TouchableOpacity
              style={[styles.editAvatarBtn, { backgroundColor: colors.primary, ...shadows.md }]}
              onPress={openEdit}
              activeOpacity={0.8}
            >
              <Icon name="pen" size={11} color="#fff" solid />
            </TouchableOpacity>
          </View>

          <Text style={styles.heroName}>{profile?.full_name ?? '—'}</Text>
          <View style={[styles.rolePill, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
            <Icon name="shield-alt" size={10} color="rgba(255,255,255,0.9)" solid />
            <Text style={styles.rolePillText}>{roleName}</Text>
          </View>
        </LinearGradient>

        <View style={styles.body}>
          {/* ── Account Details Card ───────────────────────────── */}
          <AppCard variant="bordered" padding={16}>
            <View style={styles.cardHeaderRow}>
              <AppSectionHeader title="Account Details" icon="user" style={{ marginBottom: 0 }} />
              <TouchableOpacity
                style={[styles.editBtn, { backgroundColor: colors.primaryBg }]}
                onPress={openEdit}
                activeOpacity={0.75}
              >
                <Icon name="pen" size={11} color={colors.primary} />
                <Text style={[styles.editBtnText, { color: colors.primary }]}>Edit</Text>
              </TouchableOpacity>
            </View>

            <View style={{ marginTop: spacing.md, gap: spacing.xs }}>
              {INFO_ITEMS.map((item, idx) => (
                <View
                  key={idx}
                  style={[styles.infoRow, { borderBottomColor: colors.divider }]}
                >
                  <View style={styles.infoLabelWrap}>
                    <Icon name={item.icon} size={13} color={colors.textTertiary} style={{ width: 20 }} />
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{item.label}</Text>
                  </View>
                  <Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={1}>
                    {item.value}
                  </Text>
                </View>
              ))}
            </View>
          </AppCard>

          {/* ── App Preferences & Appearance Card ──────────────── */}
          <AppCard variant="bordered" padding={16}>
            <AppSectionHeader title="Preferences & Appearance" icon="sliders-h" />
            <AppSwitch
              value={isDark}
              onValueChange={toggleTheme}
              label="Dark Theme"
              subtitle="Use high-contrast dark palette for night viewing"
            />
          </AppCard>

          {/* ── Security & Account Actions Card ─────────────────── */}
          <AppCard variant="bordered" padding={16}>
            <AppSectionHeader title="Security" icon="lock" />

            <TouchableOpacity
              style={[styles.actionRow, { borderBottomColor: colors.divider }]}
              onPress={() => setShowPassword(true)}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconPill, { backgroundColor: colors.primaryBg }]}>
                <Icon name="key" size={14} color={colors.primary} solid />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.actionTitle, { color: colors.text }]}>Change Password</Text>
                <Text style={[styles.actionSub, { color: colors.textSecondary }]}>
                  Update your portal login credentials
                </Text>
              </View>
              <Icon name="chevron-right" size={12} color={colors.textTertiary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => setShowLogoutConfirm(true)}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconPill, { backgroundColor: colors.dangerBg }]}>
                <Icon name="sign-out-alt" size={14} color={colors.danger} solid />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.actionTitle, { color: colors.danger }]}>Log Out</Text>
                <Text style={[styles.actionSub, { color: colors.textSecondary }]}>
                  End current session on this device
                </Text>
              </View>
              <Icon name="chevron-right" size={12} color={colors.textTertiary} />
            </TouchableOpacity>
          </AppCard>
        </View>
      </ScrollView>

      {/* Edit Profile Bottom Sheet */}
      <AppBottomSheet
        visible={showEdit}
        onClose={() => setShowEdit(false)}
        title="Edit Profile Information"
        subtitle="Update your personal details"
      >
        <View style={{ gap: spacing.xs }}>
          <AppInput
            label="Full Name *"
            value={editForm.full_name}
            onChangeText={v => setEditForm(f => ({ ...f, full_name: v }))}
            icon="user"
          />
          <AppInput
            label="Mobile Number"
            value={editForm.mobile}
            onChangeText={v => setEditForm(f => ({ ...f, mobile: v }))}
            icon="phone"
            keyboardType="phone-pad"
            maxLength={10}
          />
          <AppInput
            label="Email Address"
            value={editForm.email}
            onChangeText={v => setEditForm(f => ({ ...f, email: v }))}
            icon="envelope"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <AppButton
            label="Save Changes"
            variant="primary"
            size="lg"
            onPress={saveProfile}
            loading={editSaving}
            fullWidth
            style={{ marginTop: spacing.md }}
          />
        </View>
      </AppBottomSheet>

      {/* Change Password Bottom Sheet */}
      <AppBottomSheet
        visible={showPassword}
        onClose={() => setShowPassword(false)}
        title="Change Account Password"
        subtitle="Ensure your new password has at least 6 characters"
      >
        <View style={{ gap: spacing.xs }}>
          <AppInput
            label="Current Password *"
            value={pwForm.old}
            onChangeText={v => setPwForm(f => ({ ...f, old: v }))}
            icon="lock"
            secureEntry
          />
          <AppInput
            label="New Password *"
            value={pwForm.new}
            onChangeText={v => setPwForm(f => ({ ...f, new: v }))}
            icon="key"
            secureEntry
          />
          <AppInput
            label="Confirm New Password *"
            value={pwForm.confirm}
            onChangeText={v => setPwForm(f => ({ ...f, confirm: v }))}
            icon="check"
            secureEntry
          />
          <AppButton
            label="Update Password"
            variant="primary"
            size="lg"
            onPress={changePassword}
            loading={pwSaving}
            fullWidth
            style={{ marginTop: spacing.md }}
          />
        </View>
      </AppBottomSheet>

      {/* Logout Confirmation Dialog */}
      <AppConfirmDialog
        visible={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={async () => {
          setShowLogoutConfirm(false);
          await logout();
        }}
        title="Sign Out"
        message="Are you sure you want to end your current session and sign out?"
        confirmLabel="Log Out"
        variant="danger"
        icon="sign-out-alt"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    paddingBottom: spacing['3xl'],
  },
  hero: {
    padding: spacing.xl,
    alignItems: 'center',
    borderBottomLeftRadius: radius['2xl'],
    borderBottomRightRadius: radius['2xl'],
    ...shadows.md,
  },
  avatarSection: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  heroName: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.extrabold,
    color: '#ffffff',
    textAlign: 'center',
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.full,
    marginTop: spacing.xs,
  },
  rolePillText: {
    color: '#ffffff',
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
  },
  body: {
    padding: spacing.base,
    gap: spacing.md,
    marginTop: -spacing.sm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  editBtnText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
  },
  infoLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
  },
  infoValue: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    maxWidth: '55%',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  actionIconPill: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
  },
  actionSub: {
    fontSize: typography.size.xs,
    marginTop: 2,
  },
});
