/**
 * VidyaSetu Mobile — Finance Dashboard Screen (Accountant)
 */
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { api } from '../../services/api';

export default function FinanceDashboardScreen() {
  const [stats, setStats] = useState<{
    total_fee_collected: number; pending_amount: number;
    total_expenses: number; net_balance: number;
    collection_this_month: number; defaulter_count: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/finance/stats', { params: { academic_year: '2025-2026' } });
      setStats(res.data?.data);
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <View style={s.center}><ActivityIndicator color="#059669" size="large" /></View>;

  const fmt = (v: number) => `₹${v?.toLocaleString('en-IN') ?? '0'}`;

  return (
    <ScrollView style={s.page} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#059669" />}>
      <View style={s.header}>
        <Text style={s.headerTitle}>💰 Finance Dashboard</Text>
        <Text style={s.headerSub}>Academic Year 2025–2026</Text>
      </View>

      <View style={s.grid}>
        {[
          { icon: '✅', label: 'Total Collected', value: fmt(stats?.total_fee_collected ?? 0), color: '#059669' },
          { icon: '⚠️', label: 'Pending Amount',  value: fmt(stats?.pending_amount ?? 0),       color: '#dc2626' },
          { icon: '📅', label: 'This Month',       value: fmt(stats?.collection_this_month ?? 0),color: '#2563eb' },
          { icon: '💸', label: 'Expenses',          value: fmt(stats?.total_expenses ?? 0),       color: '#d97706' },
          { icon: '💹', label: 'Net Balance',        value: fmt(stats?.net_balance ?? 0),          color: (stats?.net_balance ?? 0) >= 0 ? '#059669' : '#dc2626' },
          { icon: '🚨', label: 'Defaulters',         value: String(stats?.defaulter_count ?? 0),   color: '#dc2626' },
        ].map((item, i) => (
          <View key={i} style={[s.card, { borderTopColor: item.color }]}>
            <Text style={s.cardIcon}>{item.icon}</Text>
            <Text style={[s.cardValue, { color: item.color }]}>{item.value}</Text>
            <Text style={s.cardLabel}>{item.label}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { backgroundColor: '#059669', padding: 20 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '900' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 10 },
  card: { width: '47%', backgroundColor: '#fff', borderRadius: 14, padding: 14, borderTopWidth: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  cardIcon: { fontSize: 22 },
  cardValue: { fontSize: 18, fontWeight: '900', marginTop: 6 },
  cardLabel: { fontSize: 11, color: '#6b7280', fontWeight: '600', marginTop: 3 },
});
