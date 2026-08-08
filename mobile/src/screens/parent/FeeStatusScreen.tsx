/**
 * VidyaSetu Mobile — Fee Status Screen (Parent)
 * ===============================================
 * Parent sees their child(ren)'s fee status.
 * If multiple children, shows a child selector.
 * Uses: GET /parent-portal/children/{childId}/fees
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl,
  ActivityIndicator, TouchableOpacity, ScrollView,
} from 'react-native';
import { parentAPI } from '../../services/api';

interface Child { id: number; full_name: string; standard?: string; division?: string; }
interface FeeRecord {
  fee_head?: string;
  fee_type?: string;
  amount_due: number;
  amount_paid: number;
  balance?: number;
  status: string;
  due_date?: string;
}

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  paid:     { bg: '#d1fae5', color: '#059669' },
  partial:  { bg: '#fef3c7', color: '#d97706' },
  pending:  { bg: '#fee2e2', color: '#dc2626' },
  overdue:  { bg: '#fce7f3', color: '#be185d' },
};

export default function FeeStatusScreen() {
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const [records, setRecords] = useState<FeeRecord[]>([]);
  const [totals, setTotals] = useState({ due: 0, paid: 0, balance: 0 });
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Load children list
  useEffect(() => {
    (async () => {
      try {
        const res = await parentAPI.getMyChildren();
        const data = res.data?.data;
        const list: Child[] = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
        setChildren(list);
        if (list.length > 0) setSelectedChildId(list[0].id);
      } catch {
        setError('Could not load children list.');
      } finally {
        setLoadingChildren(false);
      }
    })();
  }, []);

  // Step 2: Load fees for selected child
  const loadFees = useCallback(async () => {
    if (!selectedChildId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await parentAPI.getChildFees(selectedChildId, { academic_year: '2025-2026' });
      const d = res.data?.data;
      // Response can be: { records: [...], total_due, total_paid, balance }
      // or a direct array of fee records
      let recs: FeeRecord[] = [];
      if (Array.isArray(d)) {
        recs = d;
      } else if (Array.isArray(d?.records)) {
        recs = d.records;
      } else if (Array.isArray(d?.fees)) {
        recs = d.fees;
      }
      setRecords(recs);
      const totalDue  = d?.total_due  ?? recs.reduce((s, r) => s + (r.amount_due ?? 0), 0);
      const totalPaid = d?.total_paid ?? recs.reduce((s, r) => s + (r.amount_paid ?? 0), 0);
      setTotals({ due: totalDue, paid: totalPaid, balance: d?.balance ?? (totalDue - totalPaid) });
    } catch {
      setError('Could not load fee information.');
      setRecords([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedChildId]);

  useEffect(() => {
    if (selectedChildId !== null) loadFees();
  }, [loadFees, selectedChildId]);

  const onRefresh = () => { setRefreshing(true); loadFees(); };

  if (loadingChildren) {
    return <View style={s.center}><ActivityIndicator color="#dc2626" size="large" /></View>;
  }

  if (children.length === 0) {
    return (
      <View style={s.center}>
        <Text style={{ fontSize: 36 }}>👶</Text>
        <Text style={s.emptyText}>No children linked to your account.</Text>
      </View>
    );
  }

  const selectedChild = children.find(c => c.id === selectedChildId);

  return (
    <View style={s.page}>
      {/* Header */}
      <View style={s.banner}>
        <Text style={s.title}>💰 Fee Status</Text>
        {selectedChild && (
          <Text style={s.sub}>
            {selectedChild.full_name}
            {selectedChild.standard ? ` · Std ${selectedChild.standard}${selectedChild.division ? `-${selectedChild.division}` : ''}` : ''}
          </Text>
        )}
        {!loading && (
          <View style={s.totalsRow}>
            <View style={s.total}>
              <Text style={[s.tv, { color: '#fcd34d' }]}>₹{totals.due.toLocaleString('en-IN')}</Text>
              <Text style={s.tl}>Total Due</Text>
            </View>
            <View style={s.total}>
              <Text style={[s.tv, { color: '#6ee7b7' }]}>₹{totals.paid.toLocaleString('en-IN')}</Text>
              <Text style={s.tl}>Paid</Text>
            </View>
            <View style={s.total}>
              <Text style={[s.tv, { color: totals.balance > 0 ? '#fca5a5' : '#6ee7b7' }]}>
                ₹{totals.balance.toLocaleString('en-IN')}
              </Text>
              <Text style={s.tl}>Balance</Text>
            </View>
          </View>
        )}
      </View>

      {/* Child selector */}
      {children.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.childBar} contentContainerStyle={s.childBarContent}>
          {children.map(child => (
            <TouchableOpacity
              key={child.id}
              style={[s.childChip, selectedChildId === child.id && s.childChipActive]}
              onPress={() => setSelectedChildId(child.id)}
            >
              <Text style={[s.childChipText, selectedChildId === child.id && s.childChipTextActive]}>
                {child.full_name.split(' ')[0]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {loading ? (
        <View style={s.center}><ActivityIndicator color="#dc2626" size="large" /></View>
      ) : error ? (
        <View style={s.center}>
          <Text style={{ fontSize: 30 }}>⚠️</Text>
          <Text style={s.emptyText}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={loadFees}>
            <Text style={s.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(_, i) => String(i)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#dc2626" />}
          contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
          ListEmptyComponent={
            <View style={s.center}>
              <Text style={{ fontSize: 36 }}>✅</Text>
              <Text style={s.emptyText}>No pending fees found.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const st = STATUS_STYLE[item.status] ?? STATUS_STYLE.pending;
            const heading = item.fee_head ?? item.fee_type ?? 'Fee';
            const balance = item.balance ?? (item.amount_due - item.amount_paid);
            return (
              <View style={s.card}>
                <View style={s.cardTop}>
                  <Text style={s.feeHead}>{heading}</Text>
                  <View style={[s.badge, { backgroundColor: st.bg }]}>
                    <Text style={[s.badgeText, { color: st.color }]}>{item.status}</Text>
                  </View>
                </View>
                <View style={s.cardBottom}>
                  <Text style={s.amount}>Due: ₹{(item.amount_due ?? 0).toLocaleString('en-IN')}</Text>
                  <Text style={s.paidText}>Paid: ₹{(item.amount_paid ?? 0).toLocaleString('en-IN')}</Text>
                  <Text style={[s.balanceText, { color: balance > 0 ? '#dc2626' : '#059669' }]}>
                    Bal: ₹{balance.toLocaleString('en-IN')}
                  </Text>
                </View>
                {item.due_date ? <Text style={s.due}>Due Date: {item.due_date}</Text> : null}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40, gap: 8 },
  emptyText: { fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 20, paddingHorizontal: 32 },
  banner: { backgroundColor: '#dc2626', padding: 20 },
  title: { color: '#fff', fontSize: 18, fontWeight: '900' },
  sub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2, marginBottom: 14 },
  totalsRow: { flexDirection: 'row', gap: 20 },
  total: { alignItems: 'center' },
  tv: { fontSize: 16, fontWeight: '900' },
  tl: { fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  childBar: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', flexGrow: 0 },
  childBarContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  childChip: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: '#f1f5f9' },
  childChipActive: { backgroundColor: '#dc2626' },
  childChipText: { fontSize: 12, fontWeight: '700', color: '#6b7280' },
  childChipTextActive: { color: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  feeHead: { fontSize: 14, fontWeight: '800', color: '#1e293b', flex: 1 },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  cardBottom: { flexDirection: 'row', gap: 12 },
  amount: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
  paidText: { fontSize: 12, color: '#059669', fontWeight: '600' },
  balanceText: { fontSize: 12, fontWeight: '800' },
  due: { fontSize: 11, color: '#6b7280', marginTop: 6 },
  retryBtn: { backgroundColor: '#dc2626', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10, marginTop: 8 },
  retryText: { color: '#fff', fontWeight: '700' },
});
