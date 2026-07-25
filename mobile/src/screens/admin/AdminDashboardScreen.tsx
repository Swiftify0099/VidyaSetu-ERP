/**
 * VidyaSetu Mobile — Admin Dashboard Screen
 * ===========================================
 * For: Super Admin, Admin, Principal, Vice Principal
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, ActivityIndicator, Dimensions,
} from 'react-native';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

const { width } = Dimensions.get('window');

interface Stats {
  total_students: number;
  total_teachers: number;
  attendance_today: number;
  fee_collected_today: number;
  pending_fees: number;
  pending_leaves: number;
  total_books: number;
  new_admissions: number;
}

const KPI_CARDS = [
  { key: 'total_students',       label: 'Students',      icon: '🎓', color: '#4f46e5', bg: '#eef2ff' },
  { key: 'total_teachers',       label: 'Teachers',      icon: '👨‍🏫', color: '#0891b2', bg: '#ecfeff' },
  { key: 'attendance_today',     label: 'Present Today', icon: '📅', color: '#059669', bg: '#d1fae5' },
  { key: 'fee_collected_today',  label: 'Fee Today ₹',   icon: '💰', color: '#d97706', bg: '#fef3c7' },
  { key: 'pending_fees',         label: 'Pending Fees',  icon: '⚠️', color: '#dc2626', bg: '#fee2e2' },
  { key: 'pending_leaves',       label: 'Pending Leave', icon: '🏖️', color: '#7c3aed', bg: '#ede9fe' },
];

export default function AdminDashboardScreen() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuthStore();

  const loadStats = useCallback(async () => {
    try {
      const res = await api.get('/analytics/dashboard');
      setStats(res.data?.data);
    } catch { /* offline or no data */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  const onRefresh = () => { setRefreshing(true); loadStats(); };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color="#4f46e5" size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={s.page}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4f46e5" />}
    >
      {/* Greeting */}
      <View style={s.greeting}>
        <Text style={s.greetingRole}>{user?.roles?.[0]?.name ?? 'Admin'}</Text>
        <Text style={s.greetingName}>👋 Welcome, {user?.full_name?.split(' ')[0] ?? 'User'}</Text>
        <Text style={s.greetingDate}>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
      </View>

      {/* KPI Grid */}
      <View style={s.kpiGrid}>
        {KPI_CARDS.map(card => {
          const val = stats ? (stats as unknown as Record<string, number>)[card.key] ?? 0 : '—';
          return (
            <View key={card.key} style={[s.kpiCard, { borderTopColor: card.color }]}>
              <Text style={s.kpiIcon}>{card.icon}</Text>
              <Text style={[s.kpiValue, { color: card.color }]}>
                {card.key.includes('fee') ? `₹${Number(val).toLocaleString('en-IN')}` : val}
              </Text>
              <Text style={s.kpiLabel}>{card.label}</Text>
            </View>
          );
        })}
      </View>

      {/* Quick Actions */}
      <Text style={s.sectionTitle}>Quick Actions</Text>
      <View style={s.actionsGrid}>
        {[
          { icon: '➕', label: 'Add Student',    color: '#4f46e5' },
          { icon: '📅', label: 'Mark Attendance', color: '#059669' },
          { icon: '💰', label: 'Collect Fee',     color: '#d97706' },
          { icon: '📢', label: 'Send Notice',     color: '#0891b2' },
          { icon: '📝', label: 'Enter Marks',     color: '#7c3aed' },
          { icon: '📊', label: 'View Reports',    color: '#dc2626' },
        ].map((a, i) => (
          <TouchableOpacity key={i} style={[s.actionBtn, { backgroundColor: a.color + '15' }]}>
            <Text style={s.actionIcon}>{a.icon}</Text>
            <Text style={[s.actionLabel, { color: a.color }]}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* School Info */}
      <View style={s.infoCard}>
        <Text style={s.infoTitle}>🏫 Hindkesri Maruti Mane Vidyalay</Text>
        <Text style={s.infoSub}>Academic Year: 2025–2026</Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f8fafc' },
  content: { paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  greeting: { backgroundColor: '#4f46e5', padding: 20, paddingBottom: 28 },
  greetingRole: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  greetingName: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 4 },
  greetingDate: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 4 },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 10, marginTop: -10 },
  kpiCard: {
    width: (width - 44) / 2,
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    borderTopWidth: 3, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  kpiIcon: { fontSize: 22 },
  kpiValue: { fontSize: 22, fontWeight: '900', marginTop: 6 },
  kpiLabel: { fontSize: 11, color: '#6b7280', fontWeight: '600', marginTop: 3 },

  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1e293b', marginHorizontal: 16, marginBottom: 10 },

  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 10 },
  actionBtn: { width: (width - 44) / 3, borderRadius: 14, padding: 14, alignItems: 'center', gap: 6 },
  actionIcon: { fontSize: 26 },
  actionLabel: { fontSize: 10, fontWeight: '700', textAlign: 'center' },

  infoCard: { margin: 16, backgroundColor: '#fff', borderRadius: 14, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  infoTitle: { fontSize: 14, fontWeight: '800', color: '#1e293b' },
  infoSub: { fontSize: 12, color: '#6b7280', marginTop: 4 },
});
