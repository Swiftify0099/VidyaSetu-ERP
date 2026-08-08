/**
 * VidyaSetu Mobile — Office Dashboard Screen (Clerk/Receptionist/Office Staff)
 * Uses real API endpoints for stats and notices.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native';
import { api, officeAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

const QUICK_ACTIONS = [
  { icon: '➕', label: 'New Admission',    screen: 'Admission',   color: '#4f46e5' },
  { icon: '🎓', label: 'Student List',     screen: 'Students',    color: '#059669' },
  { icon: '📢', label: 'Announcements',    screen: 'Announcements', color: '#0891b2' },
  { icon: '📅', label: 'Attendance',       screen: 'Attendance',  color: '#7c3aed' },
  { icon: '💰', label: 'Fee Collection',   screen: 'FeeCollection', color: '#d97706' },
  { icon: '📊', label: 'Reports',          screen: 'Reports',     color: '#dc2626' },
];

export default function OfficeDashboardScreen({ navigation }: { navigation: any }) {
  const [totalStudents, setTotalStudents] = useState(0);
  const [newAdmissions, setNewAdmissions] = useState(0);
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuthStore();

  const load = useCallback(async () => {
    try {
      const [studRes, admRes, noticeRes] = await Promise.allSettled([
        api.get('/students', { params: { per_page: 1, academic_year: '2025-2026' } }),
        api.get('/admission/applications', { params: { status: 'approved', per_page: 1 } }),
        officeAPI.getNotices({ limit: 5 }),
      ]);
      if (studRes.status  === 'fulfilled') setTotalStudents(studRes.value.data?.data?.total ?? 0);
      if (admRes.status   === 'fulfilled') setNewAdmissions(admRes.value.data?.data?.total ?? 0);
      if (noticeRes.status === 'fulfilled') {
        const n = noticeRes.value.data?.data;
        setNotices(Array.isArray(n) ? n : Array.isArray(n?.items) ? n.items : []);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const role = user?.roles?.[0];

  if (loading) return <View style={s.center}><ActivityIndicator color="#0891b2" size="large" /></View>;

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
          { icon: '🎓', label: 'Total Students', value: totalStudents, color: '#4f46e5' },
          { icon: '➕', label: 'New Admissions', value: newAdmissions, color: '#059669' },
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
          <TouchableOpacity
            key={i}
            style={[s.actionBtn, { backgroundColor: a.color + '15' }]}
            onPress={() => a.screen && navigation?.navigate(a.screen)}
          >
            <Text style={s.actionIcon}>{a.icon}</Text>
            <Text style={[s.actionLabel, { color: a.color }]}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Recent Notices */}
      {notices.length > 0 && (
        <>
          <Text style={s.sectionTitle}>Recent Notices</Text>
          {notices.map((n: any, i: number) => (
            <View key={i} style={s.noticeCard}>
              <Text style={s.noticeTitle}>{n.title ?? n.subject ?? 'Notice'}</Text>
              <Text style={s.noticeSub} numberOfLines={2}>{n.content ?? n.body ?? ''}</Text>
            </View>
          ))}
        </>
      )}
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
  noticeCard: { margin: 14, marginBottom: 0, backgroundColor: '#fff', borderRadius: 14, padding: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  noticeTitle: { fontSize: 13, fontWeight: '800', color: '#1e293b', marginBottom: 4 },
  noticeSub: { fontSize: 12, color: '#6b7280', lineHeight: 18 },
});
