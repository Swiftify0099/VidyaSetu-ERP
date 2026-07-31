/**
 * EduShakti One ERP — Premium Profile Screen
 */
import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/ThemeContext';
import PremiumCard from '../../components/ui/PremiumCard';
import Badge from '../../components/ui/Badge';
import { spacing, radius, typography, shadows } from '../../theme';

interface InfoRowProps { icon: string; label: string; value: string; }
function InfoRow({ icon, label, value }: InfoRowProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.infoRow, { borderBottomColor: colors.divider }]}>
      <View style={[styles.infoIcon, { backgroundColor: colors.primaryBg }]}>
        <Icon name={icon} size={13} color={colors.primary} solid />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
      </View>
    </View>
  );
}

interface SettingRowProps { icon: string; label: string; onPress: () => void; variant?: 'default' | 'danger'; }
function SettingRow({ icon, label, onPress, variant = 'default' }: SettingRowProps) {
  const { colors } = useTheme();
  const color = variant === 'danger' ? colors.danger : colors.text;
  const iconBg = variant === 'danger' ? colors.dangerBg : colors.surfaceAlt;
  const iconColor = variant === 'danger' ? colors.danger : colors.textSecondary;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={[styles.settingRow, { borderBottomColor: colors.divider }]}>
      <View style={[styles.settingIcon, { backgroundColor: iconBg }]}>
        <Icon name={icon} size={13} color={iconColor} solid />
      </View>
      <Text style={[styles.settingLabel, { color }]}>{label}</Text>
      <Icon name="chevron-right" size={12} color={colors.textTertiary} solid />
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const { colors, roleAccent, isDark, toggleTheme } = useTheme();

  const firstName = user?.full_name?.split(' ')[0] ?? 'User';
  const roleName = user?.roles?.[0]?.name ?? 'User';

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero Header ──────────────────────────────────────── */}
      <LinearGradient
        colors={roleAccent.gradient}
        style={[styles.hero, { paddingTop: Platform.OS === 'ios' ? 56 : 40 }]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      >
        <View style={[styles.heroCircle, { backgroundColor: 'rgba(255,255,255,0.07)' }]} />
        <View style={styles.heroContent}>
          {/* Large Avatar */}
          <View style={[styles.avatarLarge, { backgroundColor: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.5)' }]}>
            <Text style={styles.avatarText}>{(user?.full_name ?? 'U')[0]}</Text>
          </View>
          <Text style={styles.heroName}>{user?.full_name ?? 'User'}</Text>
          <View style={[styles.rolePill, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
            <Icon name="shield-alt" size={10} color="rgba(255,255,255,0.9)" solid />
            <Text style={styles.rolePillText}>{roleName}</Text>
          </View>
          {user?.employee_id && (
            <Text style={styles.heroSub}>ID: {user.employee_id}</Text>
          )}
        </View>
      </LinearGradient>

      {/* ── Stats Strip ──────────────────────────────────────── */}
      <View style={[styles.statsStrip, { backgroundColor: colors.surface, ...shadows.md }]}>
        {[
          { label: 'Year', value: '2025-26', icon: 'calendar' },
          { label: 'Role', value: roleName.slice(0, 10), icon: 'user-tag' },
          { label: 'Status', value: 'Active', icon: 'check-circle' },
        ].map((s, i) => (
          <View key={i} style={[styles.statItem, i < 2 && { borderRightWidth: 1, borderRightColor: colors.divider }]}>
            <Icon name={s.icon} size={14} color={colors.primary} solid />
            <Text style={[styles.statValue, { color: colors.text }]}>{s.value}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* ── Personal Info ─────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Personal Information</Text>
        <PremiumCard variant="default" padding={0}>
          <InfoRow icon="user"    label="Full Name" value={user?.full_name ?? '—'} />
          <InfoRow icon="at"      label="Username"  value={user?.username  ?? '—'} />
          <InfoRow icon="phone"   label="Mobile"    value={user?.mobile    ?? '—'} />
          <InfoRow icon="id-card" label="Employee ID" value={user?.employee_id ?? '—'} />
        </PremiumCard>
      </View>

      {/* ── Settings ─────────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Settings</Text>
        <PremiumCard variant="default" padding={0}>
          <SettingRow icon={isDark ? 'sun' : 'moon'} label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'} onPress={toggleTheme} />
          <SettingRow icon="bell"          label="Notifications"  onPress={() => {}} />
          <SettingRow icon="language"      label="Language"       onPress={() => {}} />
          <SettingRow icon="lock"          label="Change Password" onPress={() => {}} />
          <SettingRow icon="shield-alt"    label="Privacy"        onPress={() => {}} />
        </PremiumCard>
      </View>

      {/* ── Help & About ──────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Help & Support</Text>
        <PremiumCard variant="default" padding={0}>
          <SettingRow icon="question-circle" label="Help Center"  onPress={() => {}} />
          <SettingRow icon="info-circle"     label="About EduShakti" onPress={() => {}} />
        </PremiumCard>
      </View>

      {/* ── Logout ───────────────────────────────────────────── */}
      <View style={styles.section}>
        <PremiumCard variant="default" padding={0}>
          <SettingRow icon="sign-out-alt" label="Sign Out" onPress={handleLogout} variant="danger" />
        </PremiumCard>
      </View>

      {/* Footer */}
      <Text style={[styles.footer, { color: colors.textTertiary }]}>
        EduShakti One ERP v1.0 · Enterprise Platform
      </Text>

      <View style={{ height: spacing['3xl'] }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: { paddingHorizontal: spacing.base, paddingBottom: spacing['3xl'], overflow: 'hidden' },
  heroCircle: { position: 'absolute', width: 250, height: 250, borderRadius: 125, top: -100, right: -80 },
  heroContent: { alignItems: 'center', marginTop: spacing.base, gap: 8 },
  avatarLarge: {
    width: 84, height: 84, borderRadius: 42,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3,
    marginBottom: 4,
  },
  avatarText: { color: '#fff', fontSize: typography.size['3xl'], fontWeight: typography.weight.black },
  heroName: { color: '#fff', fontSize: typography.size.xl, fontWeight: typography.weight.extrabold, letterSpacing: -0.3 },
  rolePill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.full },
  rolePillText: { color: 'rgba(255,255,255,0.95)', fontSize: typography.size.xs, fontWeight: typography.weight.semibold },
  heroSub: { color: 'rgba(255,255,255,0.7)', fontSize: typography.size.sm },
  statsStrip: {
    flexDirection: 'row',
    marginHorizontal: spacing.base,
    borderRadius: radius.xl,
    marginTop: -spacing.xl,
    overflow: 'hidden',
  },
  statItem: {
    flex: 1, alignItems: 'center', paddingVertical: spacing.md, gap: 3,
  },
  statValue: { fontSize: typography.size.base, fontWeight: typography.weight.bold },
  statLabel: { fontSize: typography.size.xs },
  section: { paddingHorizontal: spacing.base, marginTop: spacing.lg },
  sectionTitle: { fontSize: typography.size.sm, fontWeight: typography.weight.bold, marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.8 },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.base, paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  infoIcon: { width: 34, height: 34, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  infoLabel: { fontSize: typography.size.xs, fontWeight: typography.weight.medium, marginBottom: 2 },
  infoValue: { fontSize: typography.size.base, fontWeight: typography.weight.semibold },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.base, paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  settingIcon: { width: 34, height: 34, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  settingLabel: { flex: 1, fontSize: typography.size.base, fontWeight: typography.weight.medium },
  footer: { textAlign: 'center', fontSize: typography.size.xs, marginTop: spacing.xl },
});
