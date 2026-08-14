/**
 * VidyaSetu Mobile — Finance Dashboard Screen (Premium Redesign)
 * ===============================================================
 * Financial collections overview, overdue accounts monitor, and payment receipt audit logs.
 */
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from '../../theme/ThemeContext';
import { financeAPI } from '../../services/api';
import { spacing, radius, typography, shadows } from '../../theme';
import { formatCurrency, formatDateLong } from '../../utils/formatters';
import { CURRENT_ACADEMIC_YEAR } from '../../config/constants';
import {
  AppCard,
  AppBadge,
  AppButton,
  AppTabs,
  AppStatCard,
  AppSectionHeader,
  AppEmptyState,
  AppSkeleton,
} from '../../components/ui';

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
  cash: 'money-bill-wave',
  upi: 'mobile-alt',
  cheque: 'money-check',
  bank_transfer: 'university',
  dd: 'file-invoice-dollar',
};

export default function FinanceDashboardScreen({ navigation }: { navigation: any }) {
  const { colors, roleAccent } = useTheme();
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
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const QUICK_ACTIONS = [
    { icon: 'hand-holding-usd', label: 'Collect Fee', color: '#059669', action: () => navigation.navigate('FeeCollection') },
    { icon: 'user-graduate',   label: 'Students',     color: '#4f46e5', action: () => navigation.navigate('Students') },
    { icon: 'chart-pie',       label: 'Reports',      color: '#f59e0b', action: () => navigation.navigate('Reports') },
    { icon: 'exclamation-circle', label: 'Overdue Dues', color: '#dc2626', action: () => setTab('overdue') },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Key Collections Metrics */}
        {loading ? (
          <View style={{ padding: spacing.base }}>
            <AppSkeleton variant="stat" count={4} />
          </View>
        ) : summary ? (
          <View style={[styles.statsSection, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <View style={styles.statsGrid}>
              <AppStatCard
                label="Today's Collection"
                value={formatCurrency(summary.today_collected)}
                icon="sun"
                color={colors.success}
                style={{ width: '48%' }}
              />
              <AppStatCard
                label="Total Collected"
                value={formatCurrency(summary.total_collected)}
                icon="rupee-sign"
                color={colors.primary}
                style={{ width: '48%' }}
              />
              <AppStatCard
                label="Outstanding Dues"
                value={formatCurrency(summary.total_due)}
                icon="money-bill-alt"
                color={colors.warning}
                style={{ width: '48%' }}
              />
              <AppStatCard
                label="Collection Rate"
                value={`${(summary.collection_rate ?? 0).toFixed(1)}%`}
                icon="chart-pie"
                color={colors.info}
                style={{ width: '48%' }}
              />
            </View>

            {summary.overdue_count > 0 && (
              <TouchableOpacity
                style={[styles.overdueAlert, { backgroundColor: colors.dangerBg, borderColor: colors.dangerBorder }]}
                onPress={() => setTab('overdue')}
                activeOpacity={0.8}
              >
                <Icon name="exclamation-triangle" size={14} color={colors.danger} solid />
                <Text style={[styles.overdueAlertText, { color: colors.danger }]}>
                  {summary.overdue_count} students with overdue fee payments!
                </Text>
                <Icon name="chevron-right" size={12} color={colors.danger} />
              </TouchableOpacity>
            )}
          </View>
        ) : null}

        {/* Quick Actions */}
        <View style={{ paddingHorizontal: spacing.base, marginTop: spacing.md }}>
          <AppSectionHeader title="Accountant Actions" icon="bolt" />
          <View style={styles.actionsRow}>
            {QUICK_ACTIONS.map((item, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.actionBtn,
                  { backgroundColor: colors.surface, ...shadows.sm, borderColor: colors.border },
                ]}
                onPress={item.action}
                activeOpacity={0.75}
              >
                <View style={[styles.actionIconWrap, { backgroundColor: `${item.color}18` }]}>
                  <Icon name={item.icon} size={18} color={item.color} solid />
                </View>
                <Text style={[styles.actionLabel, { color: colors.text }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Activity Tabs */}
        <View style={{ paddingHorizontal: spacing.base, marginTop: spacing.lg }}>
          <AppTabs
            tabs={[
              { key: 'receipts', label: 'Recent Receipts', count: receipts.length },
              { key: 'overdue', label: 'Overdue Dues', count: overdue.length },
            ]}
            activeTab={tab}
            onChangeTab={k => setTab(k as any)}
            variant="segmented"
          />
        </View>

        {/* Tab Content List */}
        <View style={{ padding: spacing.base, paddingBottom: spacing['3xl'] }}>
          {tab === 'receipts' ? (
            receipts.length === 0 ? (
              <AppEmptyState
                icon="receipt"
                title="No Receipts Issued"
                description="No recent fee payment receipts recorded for this session."
                style={{ paddingVertical: spacing.xl }}
              />
            ) : (
              receipts.map(r => (
                <AppCard key={r.id} variant="bordered" padding={12} style={{ marginBottom: spacing.xs }}>
                  <View style={styles.receiptRow}>
                    <View style={[styles.receiptIconWrap, { backgroundColor: colors.successBg }]}>
                      <Icon
                        name={PAYMENT_MODE_ICONS[r.payment_mode] ?? 'receipt'}
                        size={15}
                        color={colors.success}
                        solid
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rName, { color: colors.text }]}>{r.student_name}</Text>
                      <Text style={[styles.rSub, { color: colors.textSecondary }]}>
                        GR: {r.gr_number} • {formatDateLong(r.created_at)}
                      </Text>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.rAmt, { color: colors.success }]}>
                        {formatCurrency(r.amount)}
                      </Text>
                      <AppBadge
                        label={r.payment_mode.toUpperCase()}
                        variant="neutral"
                        size="sm"
                        rounded
                      />
                    </View>
                  </View>
                </AppCard>
              ))
            )
          ) : overdue.length === 0 ? (
            <AppEmptyState
              icon="check-circle"
              title="No Overdue Accounts"
              description="All students have cleared required term fee dues."
              style={{ paddingVertical: spacing.xl }}
            />
          ) : (
            overdue.map(o => (
              <AppCard key={o.student_id} variant="bordered" padding={12} style={{ marginBottom: spacing.xs }}>
                <View style={styles.receiptRow}>
                  <View style={[styles.receiptIconWrap, { backgroundColor: colors.dangerBg }]}>
                    <Icon name="exclamation" size={15} color={colors.danger} solid />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rName, { color: colors.text }]}>{o.full_name}</Text>
                    <Text style={[styles.rSub, { color: colors.textSecondary }]}>
                      Std {o.standard}-{o.division} • GR: {o.gr_number}
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.rAmt, { color: colors.danger }]}>
                      {formatCurrency(o.overdue_amount)}
                    </Text>
                    <AppBadge label="Overdue" variant="danger" size="sm" rounded />
                  </View>
                </View>
              </AppCard>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  statsSection: {
    padding: spacing.base,
    borderBottomWidth: 1,
    gap: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  overdueAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  overdueAlertText: {
    flex: 1,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
  },
  actionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: typography.size['2xs'],
    fontWeight: typography.weight.bold,
    textAlign: 'center',
  },
  receiptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  receiptIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rName: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
  },
  rSub: {
    fontSize: typography.size['2xs'],
    marginTop: 2,
  },
  rAmt: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.extrabold,
    marginBottom: 2,
  },
});
