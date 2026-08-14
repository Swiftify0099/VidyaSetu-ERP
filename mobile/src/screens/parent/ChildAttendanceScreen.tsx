/**
 * VidyaSetu Mobile — Child Attendance Screen (Parent Portal - Premium Redesign)
 * ============================================================================
 * Linked children switcher, term attendance percentage gauge, and daily attendance logs.
 */
import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
import { formatDateLong } from '../../utils/formatters';
import {
  AppCard,
  AppBadge,
  AppChip,
  AppProgress,
  AppEmptyState,
  AppSkeleton,
} from '../../components/ui';

interface Child {
  id: number;
  full_name: string;
  standard?: string;
  division?: string;
}

interface AttendanceRecord {
  date: string;
  status: string;
}

interface Summary {
  present: number;
  absent: number;
  leave: number;
  total: number;
  percentage: number;
}

const STATUS_CONFIG: Record<string, { label: string; icon: string; bg: string; color: string; variant: any }> = {
  present: { label: 'Present', icon: 'check',        bg: '#d1fae5', color: '#059669', variant: 'success' },
  P:       { label: 'Present', icon: 'check',        bg: '#d1fae5', color: '#059669', variant: 'success' },
  absent:  { label: 'Absent',  icon: 'times',        bg: '#fee2e2', color: '#dc2626', variant: 'danger' },
  A:       { label: 'Absent',  icon: 'times',        bg: '#fee2e2', color: '#dc2626', variant: 'danger' },
  leave:   { label: 'Leave',   icon: 'umbrella-beach',bg: '#fef3c7', color: '#d97706', variant: 'warning' },
  L:       { label: 'Leave',   icon: 'umbrella-beach',bg: '#fef3c7', color: '#d97706', variant: 'warning' },
  late:    { label: 'Late',    icon: 'clock',        bg: '#ede9fe', color: '#7c3aed', variant: 'primary' },
};

export default function ChildAttendanceScreen() {
  const { colors, roleAccent } = useTheme();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<Summary>({ present: 0, absent: 0, leave: 0, total: 0, percentage: 0 });
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

  const loadAttendance = useCallback(async () => {
    if (!selectedChildId) return;
    setLoading(true);
    try {
      const res = await parentAPI.getChildAttendance(selectedChildId, { academic_year: '2025-2026' });
      const d = res.data?.data;
      if (Array.isArray(d)) {
        setRecords(d);
        const present = d.filter(r => ['present', 'P'].includes(r.status)).length;
        const absent  = d.filter(r => ['absent',  'A'].includes(r.status)).length;
        const leave   = d.filter(r => ['leave',   'L'].includes(r.status)).length;
        const total   = d.length;
        setSummary({
          present,
          absent,
          leave,
          total,
          percentage: total > 0 ? Math.round((present / total) * 100) : 0,
        });
      } else {
        setRecords(d?.records ?? []);
        setSummary({
          present:    d?.present    ?? 0,
          absent:     d?.absent     ?? 0,
          leave:      d?.leave      ?? 0,
          total:      d?.total      ?? 0,
          percentage: d?.percentage ?? 0,
        });
      }
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedChildId]);

  useEffect(() => {
    if (selectedChildId !== null) loadAttendance();
  }, [loadAttendance, selectedChildId]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAttendance();
  };

  if (loadingChildren) {
    return (
      <View style={{ flex: 1, padding: spacing.base, backgroundColor: colors.background }}>
        <AppSkeleton variant="card" count={3} />
      </View>
    );
  }

  if (children.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <AppEmptyState
          icon="child"
          title="No Linked Children"
          description="No student profiles are linked to your parent portal account."
          style={{ flex: 1 }}
        />
      </View>
    );
  }

  const selectedChild = children.find(c => c.id === selectedChildId);
  const pct = summary.percentage ?? 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Child Switcher Chips */}
      {children.length > 1 && (
        <View style={[styles.childBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing.xs }}
          >
            {children.map(child => (
              <AppChip
                key={child.id}
                label={child.full_name}
                selected={selectedChildId === child.id}
                onPress={() => setSelectedChildId(child.id)}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Header Attendance Gauge Banner */}
      <LinearGradient
        colors={roleAccent.gradient}
        style={styles.banner}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.bannerTitle}>Attendance Summary</Text>
        {selectedChild && (
          <Text style={styles.bannerSub}>
            {selectedChild.full_name}
            {selectedChild.standard
              ? ` • Std ${selectedChild.standard}${selectedChild.division ? `-${selectedChild.division}` : ''}`
              : ''}
          </Text>
        )}

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={[styles.statVal, { color: '#6ee7b7' }]}>{summary.present}</Text>
            <Text style={styles.statLbl}>Present</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statVal, { color: '#fca5a5' }]}>{summary.absent}</Text>
            <Text style={styles.statLbl}>Absent</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statVal, { color: '#fde68a' }]}>{summary.leave}</Text>
            <Text style={styles.statLbl}>Leave</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statVal, { color: '#fff' }]}>{pct}%</Text>
            <Text style={styles.statLbl}>Rate</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={{ marginTop: spacing.md }}>
          <AppProgress
            value={pct}
            color={pct >= 75 ? '#6ee7b7' : '#fca5a5'}
            height={8}
          />
        </View>
      </LinearGradient>

      {/* Daily Records List */}
      {loading ? (
        <View style={{ padding: spacing.base }}>
          <AppSkeleton variant="list" count={5} />
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(r, idx) => `${r.date}-${idx}`}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          contentContainerStyle={{ padding: spacing.base, paddingBottom: 100 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={
            <AppEmptyState
              icon="calendar-check"
              title="No Attendance Logs"
              description="No attendance entries recorded for this academic year yet."
              style={{ flex: 1 }}
            />
          }
          renderItem={({ item }) => {
            const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.present;
            return (
              <AppCard variant="bordered" padding={12}>
                <View style={styles.recordRow}>
                  <View style={styles.dateCol}>
                    <Text style={[styles.dateText, { color: colors.text }]}>
                      {formatDateLong(item.date)}
                    </Text>
                  </View>

                  <AppBadge
                    label={cfg.label}
                    variant={cfg.variant}
                    size="sm"
                    rounded
                  />
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
  root: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  childBar: {
    padding: spacing.base,
    borderBottomWidth: 1,
  },
  banner: {
    padding: spacing.xl,
    borderBottomLeftRadius: radius['2xl'],
    borderBottomRightRadius: radius['2xl'],
    ...shadows.md,
  },
  bannerTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.extrabold,
    color: '#ffffff',
  },
  bannerSub: {
    fontSize: typography.size.xs,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.lg,
  },
  statBox: {
    alignItems: 'center',
  },
  statVal: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.extrabold,
  },
  statLbl: {
    fontSize: typography.size['2xs'],
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateCol: {
    flex: 1,
  },
  dateText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },
});
