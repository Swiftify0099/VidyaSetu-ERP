/**
 * VidyaSetu Mobile — Fee Status Screen (Parent)
 */
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { api } from '../../services/api';

interface FeeRecord { fee_head: string; amount_due: number; amount_paid: number; status: string; due_date: string; }

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  paid: { bg: '#d1fae5', color: '#059669' },
  partial: { bg: '#fef3c7', color: '#d97706' },
  pending: { bg: '#fee2e2', color: '#dc2626' },
};

export default function FeeStatusScreen() {
  const [records, setRecords] = useState<FeeRecord[]>([]);
  const [totals, setTotals] = useState({ due: 0, paid: 0, balance: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/parent-portal/fees', { params: { academic_year: '2025-2026' } });
      const d = res.data?.data;
      setRecords(d?.records ?? []);
      setTotals({ due: d?.total_due ?? 0, paid: d?.total_paid ?? 0, balance: d?.balance ?? 0 });
    } catch { setRecords([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <View style={s.center}><ActivityIndicator color="#dc2626" size="large" /></View>;

  return (
    <View style={s.page}>
      <View style={s.banner}>
        <Text style={s.title}>💰 Fee Status</Text>
        <Text style={s.sub}>Academic Year 2025–2026</Text>
        <View style={s.totalsRow}>
          <View style={s.total}><Text style={[s.tv, { color: '#fcd34d' }]}>₹{totals.due.toLocaleString('en-IN')}</Text><Text style={s.tl}>Total Due</Text></View>
          <View style={s.total}><Text style={[s.tv, { color: '#6ee7b7' }]}>₹{totals.paid.toLocaleString('en-IN')}</Text><Text style={s.tl}>Paid</Text></View>
          <View style={s.total}><Text style={[s.tv, { color: totals.balance > 0 ? '#fca5a5' : '#6ee7b7' }]}>₹{totals.balance.toLocaleString('en-IN')}</Text><Text style={s.tl}>Balance</Text></View>
        </View>
      </View>
      <FlatList
        data={records}
        keyExtractor={(_, i) => String(i)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => {
          const st = STATUS_STYLE[item.status] ?? STATUS_STYLE.pending;
          return (
            <View style={s.card}>
              <View style={s.cardTop}>
                <Text style={s.feeHead}>{item.fee_head}</Text>
                <View style={[s.badge, { backgroundColor: st.bg }]}><Text style={[s.badgeText, { color: st.color }]}>{item.status}</Text></View>
              </View>
              <View style={s.cardBottom}>
                <Text style={s.amount}>Due: ₹{item.amount_due.toLocaleString('en-IN')}</Text>
                <Text style={s.paid}>Paid: ₹{item.amount_paid.toLocaleString('en-IN')}</Text>
                <Text style={[s.balance, { color: (item.amount_due - item.amount_paid) > 0 ? '#dc2626' : '#059669' }]}>
                  Bal: ₹{(item.amount_due - item.amount_paid).toLocaleString('en-IN')}
                </Text>
              </View>
              <Text style={s.due}>Due: {item.due_date}</Text>
            </View>
          );
        }}
        ListEmptyComponent={<View style={s.center}><Text style={{ color: '#6b7280', fontSize: 13 }}>No fee records found</Text></View>}
      />
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
  banner: { backgroundColor: '#dc2626', padding: 20 },
  title: { color: '#fff', fontSize: 18, fontWeight: '900' },
  sub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2, marginBottom: 14 },
  totalsRow: { flexDirection: 'row', gap: 20 },
  total: { alignItems: 'center' },
  tv: { fontSize: 16, fontWeight: '900' },
  tl: { fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  feeHead: { fontSize: 14, fontWeight: '800', color: '#1e293b', flex: 1 },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  cardBottom: { flexDirection: 'row', gap: 12 },
  amount: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
  paid: { fontSize: 12, color: '#059669', fontWeight: '600' },
  balance: { fontSize: 12, fontWeight: '800' },
  due: { fontSize: 11, color: '#6b7280', marginTop: 6 },
});
