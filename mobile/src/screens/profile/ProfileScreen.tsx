/**
 * VidyaSetu Mobile — Enhanced Profile Screen (All roles)
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch,
} from 'react-native';
import { useAuthStore } from '../../store/authStore';

const ROLE_COLORS: Record<string, string> = {
  super_admin: '#dc2626', admin: '#b91c1c', principal: '#7c3aed',
  vice_principal: '#6d28d9', teacher: '#2563eb', class_teacher: '#1d4ed8',
  clerk: '#0891b2', accountant: '#059669', librarian: '#d97706',
  receptionist: '#ec4899', office_staff: '#6b7280', student: '#10b981',
  parent: '#f59e0b',
};

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);

  const primaryRole = user?.roles?.[0];
  const roleColor = ROLE_COLORS[primaryRole?.code ?? ''] ?? '#4f46e5';

  const confirmLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]
    );
  };

  return (
    <ScrollView style={s.page} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Avatar + Name */}
      <View style={[s.header, { backgroundColor: roleColor }]}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{user?.full_name?.charAt(0) ?? 'U'}</Text>
        </View>
        <Text style={s.fullName}>{user?.full_name}</Text>
        <Text style={s.username}>@{user?.username}</Text>
        <View style={s.roleBadge}>
          <Text style={s.roleBadgeText}>{primaryRole?.name ?? 'User'}</Text>
        </View>
      </View>

      {/* Info Cards */}
      <View style={s.infoSection}>
        {[
          { icon: '📧', label: 'Username', value: user?.username },
          { icon: '📱', label: 'Mobile', value: user?.mobile ?? 'Not set' },
          { icon: '🆔', label: 'Employee ID', value: user?.employee_id ?? 'N/A' },
          { icon: '🔐', label: 'Role', value: user?.roles?.map(r => r.name).join(', ') ?? '—' },
        ].map((item, i) => (
          <View key={i} style={s.infoRow}>
            <Text style={s.infoIcon}>{item.icon}</Text>
            <View style={s.infoDetails}>
              <Text style={s.infoLabel}>{item.label}</Text>
              <Text style={s.infoValue}>{item.value}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Settings */}
      <View style={s.settingsSection}>
        <Text style={s.settingsTitle}>⚙️ Preferences</Text>

        <View style={s.settingRow}>
          <Text style={s.settingIcon}>🌙</Text>
          <Text style={s.settingLabel}>Dark Mode</Text>
          <Switch value={darkMode} onValueChange={setDarkMode} trackColor={{ true: roleColor }} />
        </View>

        <View style={s.settingRow}>
          <Text style={s.settingIcon}>🔔</Text>
          <Text style={s.settingLabel}>Push Notifications</Text>
          <Switch value={notifications} onValueChange={setNotifications} trackColor={{ true: roleColor }} />
        </View>
      </View>

      {/* App Info */}
      <View style={s.appInfo}>
        <Text style={s.appName}>🏫 VidyaSetu ERP</Text>
        <Text style={s.appVersion}>Version 1.0.0  •  Hindkesri Maruti Mane Vidyalay</Text>
      </View>

      {/* Logout */}
      <TouchableOpacity style={s.logoutBtn} onPress={confirmLogout}>
        <Text style={s.logoutText}>🚪 Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 28, alignItems: 'center', paddingBottom: 32 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { fontSize: 36, color: '#fff', fontWeight: '900' },
  fullName: { fontSize: 20, fontWeight: '900', color: '#fff' },
  username: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  roleBadge: { marginTop: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 5 },
  roleBadgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  infoSection: { margin: 14, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 12 },
  infoIcon: { fontSize: 20, width: 28, textAlign: 'center' },
  infoDetails: { flex: 1 },
  infoLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '600', textTransform: 'uppercase' },
  infoValue: { fontSize: 14, color: '#1e293b', fontWeight: '700', marginTop: 2 },
  settingsSection: { marginHorizontal: 14, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, marginBottom: 14 },
  settingsTitle: { fontSize: 13, fontWeight: '800', color: '#6b7280', padding: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  settingRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 12 },
  settingIcon: { fontSize: 20 },
  settingLabel: { flex: 1, fontSize: 14, fontWeight: '700', color: '#1e293b' },
  appInfo: { marginHorizontal: 14, marginBottom: 14, alignItems: 'center', gap: 4 },
  appName: { fontSize: 14, fontWeight: '800', color: '#1e293b' },
  appVersion: { fontSize: 11, color: '#9ca3af', textAlign: 'center' },
  logoutBtn: { marginHorizontal: 14, backgroundColor: '#fee2e2', borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1.5, borderColor: '#fca5a5' },
  logoutText: { color: '#dc2626', fontSize: 15, fontWeight: '900' },
});
