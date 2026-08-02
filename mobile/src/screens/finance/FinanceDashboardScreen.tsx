/**
 * VidyaSetu Mobile — Finance Dashboard Screen (Enhanced)
 * Summary, overdue alerts, recent receipts, quick actions.
 * Accountant, Admin, Principal
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from '../../theme/ThemeContext';
import { financeAPI } from '../../services/api';
import { spacing, radius, typography, shadows } from '../../theme';
import { formatCurrency, formatDateLong, today } from '../../utils/formatters';
import { CURRENT_ACADEMIC_YEAR } from '../../config/constants';
import SectionHeader from '../../components/ui/SectionHeader';
import PremiumCard from '../../components/ui/PremiumCard';
import StatCard from '../../components/ui/StatCard';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import Badge from '../../components/ui/Badge';

interface Receipt {
  id: number;
  student_name: string;
  gr_number: string;
  amount: number;
  payment_mode: string;
  created_at: string;
  receipt_number?: string;
}

interface OverdueStudent {
  student_id: number;
  full_name: string;
  gr_number: string;
  standard: string;
  division: string;
  overdue_amount: number;
  due_since: string;
}

interface Summary {
  total_collected: number;
  today_collected: number;
  total_due: number;
  overdue_count: number;
  collection_rate: number;
}

const PAYMENT_MODE_ICONS: Record<string, string> = {
  cash: '💵',
  upi: '📱',
  cheque: '🏦',
  bank_transfer: '🔄',
  dd: '📄',
};

export default function FinanceDashboardScreen({ navigation }: { navigation: any }) {
  const { colors } = useTheme();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [overdue, setOverdue] = useState<OverdueStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'receipts' | 'overdue'>('receipts');

  const load = useCallback(async () => {
    try {
      const [summaryRes, receiptsRes, overdueRes] = await Promise.allSettled([
        financeAPI.getSummary({ academic_year: CURRENT_ACADEMIC_YEAR }),
        financeAPI.getRecentReceipts({ limit: 20, academic_year: CURRENT_ACADEMIC_YEAR }),
        financeAPI.getOverdueFees({ academic_year: CURRENT_ACADEMIC_YEAR }),
      ]);
      if (summaryRes.status   === 'fulfilled') setSummary(summaryRes.value.data?.data);
      if (receiptsRes.status  === 'fulfilled') setReceipts(receiptsRes.value.data?.data?.items ?? receiptsRes.value.data?.data ?? []);
      if (overdueRes.status   === 'fulfilled') setOverdue(overdueRes.value.data?.data?.items ?? overdueRes.value.data?.data ?? []);
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  const QUICK_ACTIONS = [
    { icon: 'hand-holding-usd', label: 'Collect Fee',   color: '#059669', action: () => navigation.navigate('FeeCollection') },
    { icon: 'file-invoice',     label: 'Fee Structure', color: '#6366f1', action: () => {} },
    { icon: 'chart-line',       label: 'Reports',       color: '#f59e0b', action: () => navigation.navigate('Reports') },
    { icon: 'exclamation-circle', label: 'Overdue',     color: '#dc2626', action: () => setTab('overdue') },
  ];

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {/* Summary Stats */}
        {loading ? (
          <View style={{ padding: spacing.base }}>
            <SkeletonLoader variant="stats" count={4} />
          </View>
        ) : summary ? (
          <View style={[s.statsWrap, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <View style={s.statsGrid}>
              {[
                { label: "Today's Collection", value: formatCurrency(summary.today_collected),  icon: 'sun',            color: colors.success },
                { label: 'Total Collected',     value: formatCurrency(summary.total_collected), icon: 'rupee-sign',     color: colors.primary },
                { label: 'Total Due',           value: formatCurrency(summary.total_due),       icon: 'money-bill-alt', color: colors.warning },
                { label: 'Collection Rate',     value: `${(summary.collection_rate ?? 0).toFixed(1)}%`, icon: 'chart-pie', color: colors.info },
              ].map((stat, i) => (
                <View key={i} style={s.statCard}>
                  <View style={[s.statIcon, { backgroundColor: `${stat.color}18` }]}>
                    <Icon name={stat.icon} size={16} color={stat.color} solid />
                  </View>
                  <Text style={[s.statValue, { color: stat.color }]}>{stat.value}</Text>
                  <Text style={[s.statLabel, { color: colors.textSecondary }]}>{stat.label}</Text>
                </View>
              ))}
            </View>
            {summary.overdue_count > 0 && (
              <TouchableOpacity
                style={[s.overdueAlert, { backgroundColor: colors.dangerBg }]}
                onPress={() => setTab('overdue')}
              >
                <Icon name="exclamation-triangle" size={14} color={colors.danger} solid />
                <Text style={[s.overdueAlertText, { color: colors.danger }]}>
                  {summary.overdue_count} students with overdue payments!
                </Text>
                <Icon name="chevron-right" size={12} color={colors.danger} solid />
              </TouchableOpacity>
            )}
          </View>
        ) : null}

        {/* Quick Actions */}
        <View style={{ paddingHorizontal: spacing.base, marginTop: spacing.lg }}>
          <SectionHeader title="Quick Actions" icon="bolt" />
          <View style={s.actionsRow}>
            {QUICK_ACTIONS.map((item, i) => (
              <TouchableOpacity
                key={i}
                style={[s.actionCard, { backgroundColor: colors.surface, ...shadows.sm }]}
                onPress={item.action}
                activeOpacity={0.75}
              >
                <View style={[s.actionIcon, { backgroundColor: `${item.color}18` }]}>
                  <Icon name={item.icon} size={18} color={item.color} solid />
                </View>
                <Text style={[s.actionLabel, { color: colors.text }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Tabs */}
        <View style={{ marginTop: spacing.lg }}>
          <View style={[s.tabs, { borderBottomColor: colors.border }]}>
            {(['receipts', 'overdue'] as const).map(t => (
              <TouchableOpacity
                key={t}
                style={[s.tab, tab === t && { borderBottomColor: colors.primary, borderBottomWidth: 2.5 }]}
                onPress={() => setTab(t)}
              >
                <Text style={[s.tabText, { color: tab === t ? colors.primary : colors.textSecondary }]}>
                  {t === 'receipts' ? 'Recent Receipts' : `Overdue (${overdue.length})`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ paddingHorizontal: spacing.base, paddingTop: spacing.md }}>
            {tab === 'receipts' ? (
              receipts.length === 0 ? (
                <PremiumCard variant="flat" style={s.emptyCard}>
                  <Text style={s.emptyIcon}>🧾</Text>
                  <Text style={[s.emptyText, { color: colors.textSecondary }]}>No receipts today</Text>
                </PremiumCard>
              ) : (
                receipts.map(r => (
                  <PremiumCard key={r.id} variant="bordered" padding={12} style={{ marginBottom: 8 }}>
                    <View style={s.receiptRow}>
                      <View style={[s.receiptIcon, { backgroundColor: colors.successBg }]}>
                        <Text style={{ fontSize: 20 }}>{PAYMENT_MODE_ICONS[r.payment_mode] ?? '💰'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.receiptName, { color: colors.text }]}>{r.student_name}</Text>
                        <Text style={[s.receiptSub, { color: colors.textSecondary }]}>
                          GR: {r.gr_number} • {r.payment_mode.replace('_', ' ').toUpperCase()}
                        </Text>
                        <Text style={[s.receiptDate, { color: colors.textTertiary }]}>
                          {formatDateLong(r.created_at)}
                          {r.receipt_number ? ` • #${r.receipt_number}` : ''}
                        </Text>
                      </View>
                      <Text style={[s.receiptAmount, { color: colors.success }]}>
                        {formatCurrency(r.amount)}
                      </Text>
                    </View>
                  </PremiumCard>
                ))
              )
            ) : (
              overdue.length === 0 ? (
                <PremiumCard variant="flat" style={s.emptyCard}>
                  <Text style={s.emptyIcon}>✅</Text>
                  <Text style={[s.emptyText, { color: colors.textSecondary }]}>No overdue payments</Text>
                </PremiumCard>
              ) : (
                overdue.map(o => (
                  <PremiumCard key={o.student_id} variant="bordered" padding={12} style={{ marginBottom: 8, borderLeftWidth: 4, borderLeftColor: colors.danger }}>
                    <View style={s.overdueRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.receiptName, { color: colors.text }]}>{o.full_name}</Text>
                        <Text style={[s.receiptSub, { color: colors.textSecondary }]}>
                          GR: {o.gr_number} • Std {o.standard}-{o.division}
                        </Text>
                        <Text style={[s.receiptDate, { color: colors.danger }]}>
                          Due since: {formatDateLong(o.due_since)}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <Text style={[s.overdueAmount, { color: colors.danger }]}>
                          {formatCurrency(o.overdue_amount)}
                        </Text>
                        <Badge label="Overdue" variant="danger" size="sm" rounded />
                      </View>
                    </View>
                  </PremiumCard>
                ))
              )
            )}
          </View>
        </View>

        <View style={{ height: spacing['3xl'] }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  statsWrap: { borderBottomWidth: 1 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: spacing.sm, gap: 8 },
  statCard: {
    width: '47%', alignItems: 'center', gap: 4, padding: 12,
    backgroundColor: '#f9fafb', borderRadius: radius.xl,
  },
  statIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: typography.size.lg, fontWeight: typography.weight.extrabold },
  statLabel: { fontSize: typography.size.xs, textAlign: 'center' },
  overdueAlert: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    margin: spacing.sm, borderRadius: radius.md, padding: 12,
  },
  overdueAlertText: { flex: 1, fontSize: typography.size.sm, fontWeight: typography.weight.semibold },
  actionsRow: { flexDirection: 'row', gap: 8 },
  actionCard: { flex: 1, borderRadius: radius.xl, padding: 12, alignItems: 'center', gap: 6 },
  actionIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: typography.size.xs, fontWeight: typography.weight.semibold, textAlign: 'center' },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, marginHorizontal: 0 },
  tab: { flex: 1, padding: 12, alignItems: 'center' },
  tabText: { fontSize: typography.size.sm, fontWeight: typography.weight.semibold },
  receiptRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  receiptIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  receiptName: { fontSize: typography.size.base, fontWeight: typography.weight.bold },
  receiptSub: { fontSize: typography.size.xs, marginTop: 1 },
  receiptDate: { fontSize: typography.size.xs, marginTop: 1 },
  receiptAmount: { fontSize: typography.size.lg, fontWeight: typography.weight.extrabold },
  overdueRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  overdueAmount: { fontSize: typography.size.lg, fontWeight: typography.weight.extrabold },
  emptyCard: { alignItems: 'center', padding: spacing.xl },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyText: { fontSize: typography.size.base },
});
