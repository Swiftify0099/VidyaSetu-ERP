/**
 * VidyaSetu Mobile — Parent Dashboard Screen
 * ============================================
 * Parent ONLY sees their child's data
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator,
} from 'react-native';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

interface ChildData {
  full_name: string;
  gr_number: string;
  standard: string;
  division: string;
  attendance_percentage: number;
  pending_fees: number;
  next_exam?: string;
  latest_result?: { subject: string; marks: number; max: number };
}

export default function ParentDashboardScreen() {
  const [data, setData] = useState<ChildData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuthStore();

  const load = useCallback(async () => {
    try {
      const res = await api.get('/parent-portal/dashboard');
      setData(res.data?.data);
    } catch { /* offline */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <View style={s.center}><ActivityIndicator color="#f59e0b" size="large" /></View>;

  return (
    <ScrollView
      style={s.page}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#f59e0b" />}
    >
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerGreeting}>👨‍👩‍👧 Parent Portal</Text>
        <Text style={s.parentName}>Welcome, {user?.full_name}</Text>
      </View>

      {/* Child Card */}
      {data ? (
        <View style={s.childCard}>
          <View style={s.childAvatar}>
            <Text style={s.childAvatarText}>{data.full_name.charAt(0)}</Text>
          </View>
          <View style={s.childInfo}>
            <Text style={s.childName}>{data.full_name}</Text>
            <Text style={s.childMeta}>GR: {data.gr_number}  |  Std {data.standard}-{data.division}</Text>
          </View>
        </View>
      ) : (
        <View style={s.noChildCard}>
          <Text style={s.noChildText}>No child linked to this account</Text>
        </View>
      )}

      {/* Stats */}
      {data && (
        <View style={s.statsRow}>
          {[
            { icon: '📅', label: 'Attendance', value: `${data.attendance_percentage}%`, color: data.attendance_percentage >= 75 ? '#059669' : '#dc2626' },
            { icon: '💰', label: 'Pending Fees', value: `₹${data.pending_fees.toLocaleString('en-IN')}`, color: data.pending_fees > 0 ? '#dc2626' : '#059669' },
          ].map((item, i) => (
            <View key={i} style={[s.statCard, { borderTopColor: item.color }]}>
              <Text style={s.statIcon}>{item.icon}</Text>
              <Text style={[s.statValue, { color: item.color }]}>{item.value}</Text>
              <Text style={s.statLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Fee Alert */}
      {data && data.pending_fees > 0 && (
        <View style={s.feeAlert}>
          <Text style={s.feeAlertIcon}>💰</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.feeAlertTitle}>Fee Payment Due</Text>
            <Text style={s.feeAlertAmt}>₹{data.pending_fees.toLocaleString('en-IN')} pending</Text>
          </View>
        </View>
      )}

      {/* Low Attendance Alert */}
      {data && data.attendance_percentage < 75 && (
        <View style={s.attAlert}>
          <Text style={s.alertIcon}>⚠️</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.alertTitle}>Low Attendance Warning</Text>
            <Text style={s.alertSub}>Current: {data.attendance_percentage}% (Min: 75% required)</Text>
          </View>
        </View>
      )}

      {/* Latest Result */}
      {data?.latest_result && (
        <View style={s.resultCard}>
          <Text style={s.resultTitle}>📝 Latest Result</Text>
          <Text style={s.resultSubject}>{data.latest_result.subject}</Text>
          <Text style={s.resultMarks}>{data.latest_result.marks} / {data.latest_result.max}</Text>
        </View>
      )}

      {/* School Info */}
      <View style={s.schoolCard}>
        <Text style={s.schoolName}>🏫 Hindkesri Maruti Mane Vidyalay</Text>
        <Text style={s.schoolYear}>Academic Year: 2025–2026</Text>
        <Text style={s.helpLine}>📞 Help: +91 99999 00000</Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { backgroundColor: '#f59e0b', padding: 20 },
  headerGreeting: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '700' },
  parentName: { color: '#fff', fontSize: 20, fontWeight: '900', marginTop: 4 },
  childCard: { margin: 14, backgroundColor: '#fff', borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  childAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center' },
  childAvatarText: { color: '#fff', fontSize: 22, fontWeight: '900' },
  childInfo: { flex: 1 },
  childName: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
  childMeta: { fontSize: 12, color: '#6b7280', marginTop: 3 },
  noChildCard: { margin: 14, backgroundColor: '#fff', borderRadius: 14, padding: 20, alignItems: 'center' },
  noChildText: { color: '#6b7280', fontSize: 14 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 14, gap: 10, marginBottom: 10 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, borderTopWidth: 3, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  statIcon: { fontSize: 22 },
  statValue: { fontSize: 20, fontWeight: '900', marginTop: 6 },
  statLabel: { fontSize: 11, color: '#6b7280', fontWeight: '600', marginTop: 3 },
  feeAlert: { margin: 14, backgroundColor: '#fef3c7', borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderColor: '#fcd34d' },
  feeAlertIcon: { fontSize: 28 },
  feeAlertTitle: { fontSize: 14, fontWeight: '800', color: '#92400e' },
  feeAlertAmt: { fontSize: 12, color: '#78350f', marginTop: 2 },
  attAlert: { margin: 14, marginTop: 0, backgroundColor: '#fee2e2', borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderColor: '#fca5a5' },
  alertIcon: { fontSize: 28 },
  alertTitle: { fontSize: 14, fontWeight: '800', color: '#991b1b' },
  alertSub: { fontSize: 11, color: '#7f1d1d', marginTop: 2 },
  resultCard: { margin: 14, marginTop: 0, backgroundColor: '#fff', borderRadius: 14, padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  resultTitle: { fontSize: 13, fontWeight: '700', color: '#6b7280', marginBottom: 6 },
  resultSubject: { fontSize: 15, fontWeight: '800', color: '#1e293b' },
  resultMarks: { fontSize: 20, fontWeight: '900', color: '#4f46e5', marginTop: 4 },
  schoolCard: { margin: 14, backgroundColor: '#1e293b', borderRadius: 14, padding: 16 },
  schoolName: { fontSize: 14, fontWeight: '800', color: '#fff' },
  schoolYear: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  helpLine: { fontSize: 12, color: '#60a5fa', marginTop: 6 },
});
