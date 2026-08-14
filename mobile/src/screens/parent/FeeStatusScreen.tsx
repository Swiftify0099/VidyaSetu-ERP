/**
 * VidyaSetu Mobile — Fee Status Screen (Parent Portal - Premium Redesign)
 * =======================================================================
 * Detailed tuition, exam, transport, and term fee status with balance breakdown
 * and child switching.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ScrollView,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from '../../theme/ThemeContext';
import { parentAPI } from '../../services/api';
import { spacing, radius, typography, shadows } from '../../theme';
import { formatCurrency, formatDateLong } from '../../utils/formatters';
import {
  AppCard,
  AppBadge,
  AppChip,
  AppEmptyState,
  AppSkeleton,
} from '../../components/ui';

interface Child {
  id: number;
  full_name: string;
  standard?: string;
  division?: string;
}

interface FeeRecord {
  fee_head?: string;
  fee_type?: string;
  amount_due: number;
  amount_paid: number;
  balance?: number;
  status: string;
  due_date?: string;
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'neutral' }> = {
  paid:    { label: 'Paid in Full', variant: 'success' },
  partial: { label: 'Partially Paid', variant: 'warning' },
  pending: { label: 'Pending Payment', variant: 'danger' },
  overdue: { label: 'Overdue Dues', variant: 'danger' },
};

export default function FeeStatusScreen() {
  const { colors, roleAccent } = useTheme();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const [records, setRecords] = useState<FeeRecord[]>([]);
  const [totals, setTotals] = useState({ due: 0, paid: 0, balance: 0 });
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await parentAPI.getMyChildren();
        const data = res.data?.data;
        const list: Child[] = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
        setChildren(list);
        if (list.length > 0) setSelectedChildId(list[0].id);
      } catch {
        // ignore
      } finally {
        setLoadingChildren(false);
      }
    })();
  }, []);

  const loadFees = useCallback(async () => {
    if (!selectedChildId) return;
    setLoading(true);
    try {
      const res = await parentAPI.getChildFees(selectedChildId, { academic_year: '2025-2026' });
      const d = res.data?.data;
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
      setRecords([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedChildId]);

  useEffect(() => {
    if (selectedChildId !== null) loadFees();
  }, [loadFees, selectedChildId]);

  const onRefresh = () => {
    setRefreshing(true);
    loadFees();
  };

  if (loadingChildren) {
    return (
      <View style={{ padding: spacing.base, backgroundColor: colors.background, flex: 1 }}>
        <AppSkeleton variant="card" count={3} />
      </View>
    );
  }

  if (children.length === 0) {
    return (
      <View style={[styles.page, { backgroundColor: colors.background }]}>
        <AppEmptyState
          icon="child"
          title="No Linked Children"
          description="No student profiles are currently connected to your parent account."
          style={{ flex: 1 }}
        />
      </View>
    );
  }

  const selectedChild = children.find(c => c.id === selectedChildId);

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      {/* Header Summary Banner */}
      <LinearGradient
        colors={roleAccent.gradient}
        style={styles.banner}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.title}>Fee Summary</Text>
        {selectedChild && (
          <Text style={styles.sub}>
            {selectedChild.full_name}
            {selectedChild.standard ? ` • Std ${selectedChild.standard}${selectedChild.division ? `-${selectedChild.division}` : ''}` : ''}
          </Text>
        )}

        <View style={styles.totalsRow}>
          <View style={styles.totalBox}>
            <Text style={[styles.tv, { color: '#fde68a' }]}>{formatCurrency(totals.due)}</Text>
            <Text style={styles.tl}>Total Demanded</Text>
          </View>
          <View style={styles.totalBox}>
            <Text style={[styles.tv, { color: '#6ee7b7' }]}>{formatCurrency(totals.paid)}</Text>
            <Text style={styles.tl}>Paid So Far</Text>
          </View>
          <View style={styles.totalBox}>
            <Text style={[styles.tv, { color: totals.balance > 0 ? '#fca5a5' : '#6ee7b7' }]}>
              {formatCurrency(totals.balance)}
            </Text>
            <Text style={styles.tl}>Balance Due</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Child Switcher Chips */}
      {children.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.childBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}
          contentContainerStyle={styles.childBarContent}
        >
          {children.map(child => (
            <AppChip
              key={child.id}
              label={child.full_name.split(' ')[0]}
              selected={selectedChildId === child.id}
              onPress={() => setSelectedChildId(child.id)}
            />
          ))}
        </ScrollView>
      )}

      {loading ? (
        <View style={{ padding: spacing.base }}>
          <AppSkeleton variant="card" count={4} />
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(_, i) => String(i)}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={roleAccent.primary}
            />
          }
          contentContainerStyle={{ padding: spacing.base, paddingBottom: 40 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={
            <AppEmptyState
              icon="check-circle"
              title="All Fees Cleared"
              description="No outstanding or pending fee dues found for this academic cycle."
              style={{ flex: 1 }}
            />
          }
          renderItem={({ item }) => {
            const st = STATUS_CONFIG[item.status] ?? { label: item.status, variant: 'neutral' as const };
            const heading = item.fee_head ?? item.fee_type ?? 'Institutional Fee';
            const balance = item.balance ?? ((item.amount_due ?? 0) - (item.amount_paid ?? 0));
            return (
              <AppCard variant="bordered" padding={14}>
                <View style={{ gap: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[styles.feeHead, { color: colors.text }]}>{heading}</Text>
                    <AppBadge label={st.label} variant={st.variant} size="sm" rounded />
                  </View>
                  <View style={[styles.cardBottom, { backgroundColor: colors.surfaceAlt }]}>
                    <View>
                      <Text style={[styles.amtLbl, { color: colors.textTertiary }]}>Demanded</Text>
                      <Text style={[styles.amtVal, { color: colors.text }]}>
                        {formatCurrency(item.amount_due ?? 0)}
                      </Text>
                    </View>
                    <View>
                      <Text style={[styles.amtLbl, { color: colors.textTertiary }]}>Paid</Text>
                      <Text style={[styles.amtVal, { color: colors.success }]}>
                        {formatCurrency(item.amount_paid ?? 0)}
                      </Text>
                    </View>
                    <View>
                      <Text style={[styles.amtLbl, { color: colors.textTertiary }]}>Balance</Text>
                      <Text style={[styles.amtVal, { color: balance > 0 ? colors.danger : colors.success }]}>
                        {formatCurrency(balance)}
                      </Text>
                    </View>
                  </View>
                  {item.due_date ? (
                    <Text style={[styles.due, { color: colors.textTertiary }]}>
                      Due Date: {formatDateLong(item.due_date)}
                    </Text>
                  ) : null}
                </View>
              </AppCard>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  banner: {
    padding: spacing.xl,
    paddingTop: Platform.OS === 'ios' ? 24 : spacing.xl,
    borderBottomLeftRadius: radius['2xl'],
    borderBottomRightRadius: radius['2xl'],
    ...shadows.md,
  },
  title: {
    color: '#fff',
    fontSize: typography.size.lg,
    fontWeight: typography.weight.extrabold,
  },
  sub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: typography.size.xs,
    marginTop: 2,
    marginBottom: spacing.base,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalBox: {
    alignItems: 'center',
  },
  tv: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.extrabold,
  },
  tl: {
    fontSize: typography.size['2xs'],
    color: 'rgba(255,255,255,0.85)',
    fontWeight: typography.weight.semibold,
    marginTop: 2,
  },
  childBar: {
    flexGrow: 0,
    borderBottomWidth: 1,
  },
  childBarContent: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  feeHead: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    flex: 1,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: spacing.md,
    borderRadius: radius.md,
  },
  amtLbl: {
    fontSize: typography.size['2xs'],
    fontWeight: typography.weight.semibold,
    textTransform: 'uppercase',
  },
  amtVal: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    marginTop: 2,
  },
  due: {
    fontSize: typography.size['2xs'],
    marginTop: 2,
  },
});
