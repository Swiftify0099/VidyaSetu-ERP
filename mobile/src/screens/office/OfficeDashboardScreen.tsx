/**
 * VidyaSetu Mobile — Office Dashboard Screen (Clerk/Receptionist/Office Staff)
 */
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

const QUICK_ACTIONS = [
  { icon: '➕', label: 'New Admission',    color: '#4f46e5' },
  { icon: '🎓', label: 'Student Search',   color: '#059669' },
  { icon: '📄', label: 'Issue Certificate', color: '#d97706' },
  { icon: '📢', label: 'Send Notice',       color: '#0891b2' },
  { icon: '📅', label: 'Attendance Report', color: '#7c3aed' },
  { icon: '🖨️', label: 'Print Register',   color: '#dc2626' },
];

export default function OfficeDashboardScreen() {
  const [stats, setStats] = useState({ total_students: 0, new_admissions: 0, pending_certs: 0, today_visitors: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuthStore();

  const load = useCallback(async () => {
    try {
      const res = await api.get('/office/stats');
      setStats(res.data?.data ?? stats);
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <View style={s.center}><ActivityIndicator color="#0891b2" size="large" /></View>;

  const role = user?.roles?.[0];

  return (
    <ScrollView
      style={s.page}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#0891b2" />}
    >
      {/* Header */}
      <View style={s.header}>
        <Text style={s.roleText}>{role?.name ?? 'Office'}</Text>
        <Text style={s.name}>👋 {user?.full_name?.split(' ').slice(0, 2).join(' ')}</Text>
        <Text style={s.date}>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
      </View>

      {/* Stats */}
      <View style={s.statsGrid}>
        {[
          { icon: '🎓', label: 'Total Students', value: stats.total_students, color: '#4f46e5' },
          { icon: '➕', label: 'New Admissions', value: stats.new_admissions, color: '#059669' },
          { icon: '📄', label: 'Pending Certs',  value: stats.pending_certs,  color: '#d97706' },
          { icon: '👥', label: 'Today Visitors', value: stats.today_visitors, color: '#0891b2' },
        ].map((item, i) => (
          <View key={i} style={[s.statCard, { borderTopColor: item.color }]}>
            <Text style={s.statIcon}>{item.icon}</Text>
            <Text style={[s.statValue, { color: item.color }]}>{item.value}</Text>
            <Text style={s.statLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* Quick Actions */}
      <Text style={s.sectionTitle}>Quick Actions</Text>
      <View style={s.actionsGrid}>
        {QUICK_ACTIONS.map((a, i) => (
          <TouchableOpacity key={i} style={[s.actionBtn, { backgroundColor: a.color + '15' }]}>
            <Text style={s.actionIcon}>{a.icon}</Text>
            <Text style={[s.actionLabel, { color: a.color }]}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Office Info */}
      <View style={s.infoCard}>
        <Text style={s.infoTitle}>🏫 Hindkesri Maruti Mane Vidyalay</Text>
        <Text style={s.infoRow}>📞 +91 99999 00000</Text>
        <Text style={s.infoRow}>📧 school@hmmv.edu.in</Text>
        <Text style={s.infoRow}>⏰ Office Hours: 9:00 AM – 5:00 PM</Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { backgroundColor: '#0891b2', padding: 20 },
  roleText: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  name: { color: '#fff', fontSize: 22, fontWeight: '900', marginTop: 4 },
  date: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 3 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 10, gap: 8 },
  statCard: { width: '47%', backgroundColor: '#fff', borderRadius: 14, padding: 14, borderTopWidth: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  statIcon: { fontSize: 22 },
  statValue: { fontSize: 22, fontWeight: '900', marginTop: 6 },
  statLabel: { fontSize: 11, color: '#6b7280', fontWeight: '600', marginTop: 3 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#1e293b', marginHorizontal: 14, marginBottom: 10 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10, gap: 8 },
  actionBtn: { width: '30%', borderRadius: 14, padding: 14, alignItems: 'center', gap: 6 },
  actionIcon: { fontSize: 26 },
  actionLabel: { fontSize: 10, fontWeight: '700', textAlign: 'center' },
  infoCard: { margin: 14, backgroundColor: '#1e293b', borderRadius: 14, padding: 16, gap: 6 },
  infoTitle: { fontSize: 14, fontWeight: '800', color: '#fff', marginBottom: 6 },
  infoRow: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
});
