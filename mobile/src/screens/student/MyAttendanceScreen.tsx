/**
 * VidyaSetu Mobile — My Attendance Screen (Student Portal - Premium Redesign)
 * ===========================================================================
 * Visual attendance gauge, monthly summary statistics & daily attendance log.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from '../../theme/ThemeContext';
import { studentPortalAPI } from '../../services/api';
import { spacing, radius, typography, shadows } from '../../theme';
import {
  AppCard,
  AppBadge,
  AppProgress,
  AppSectionHeader,
  AppEmptyState,
  AppSkeleton,
} from '../../components/ui';

interface AttendanceRecord {
  day: number;
  dateStr: string;
  status: string;
  remarks?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string; variant: any }> = {
  present:       { label: 'Present',       color: '#059669', bg: '#d1fae5', icon: 'check-circle', variant: 'success' },
  P:             { label: 'Present',       color: '#059669', bg: '#d1fae5', icon: 'check-circle', variant: 'success' },
  absent:        { label: 'Absent',        color: '#dc2626', bg: '#fee2e2', icon: 'times-circle', variant: 'danger' },
  A:             { label: 'Absent',        color: '#dc2626', bg: '#fee2e2', icon: 'times-circle', variant: 'danger' },
  late:          { label: 'Late',          color: '#d97706', bg: '#fef3c7', icon: 'clock',        variant: 'warning' },
  leave:         { label: 'Leave',         color: '#6366f1', bg: '#e0e7ff', icon: 'umbrella-beach',variant: 'primary' },
  medical_leave: { label: 'Medical Leave', color: '#0891b2', bg: '#cff4fc', icon: 'hospital',     variant: 'primary' },
  L:             { label: 'Leave',         color: '#6366f1', bg: '#e0e7ff', icon: 'umbrella-beach',variant: 'primary' },
  holiday:       { label: 'Holiday',       color: '#6b7280', bg: '#f3f4f6', icon: 'calendar-day', variant: 'neutral' },
  H:             { label: 'Holiday',       color: '#6b7280', bg: '#f3f4f6', icon: 'calendar-day', variant: 'neutral' },
};

export default function MyAttendanceScreen() {
  const { colors, roleAccent } = useTheme();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [monthName, setMonthName] = useState('');
  const [summary, setSummary] = useState({
    present: 0,
    absent: 0,
    late: 0,
    leave: 0,
    total: 0,
    percentage: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    try {
      const res = await studentPortalAPI.getMyAttendance({ year, month });
      const data = res.data?.data;

      if (data) {
        setMonthName(`${data.month_name_en || 'Current Month'} ${data.year || year}`);
        const sum = data.summary || {};
        setSummary({
          present: sum.present_days ?? data.present ?? 0,
          absent: sum.absent_days ?? data.absent ?? 0,
          late: sum.late_days ?? 0,
          leave: sum.leave_days ?? data.leave ?? 0,
          total: sum.working_days ?? data.total ?? 0,
          percentage: Math.round(sum.percentage ?? data.percentage ?? 0),
        });

        const list: AttendanceRecord[] = [];
        if (data.daily && typeof data.daily === 'object') {
          Object.keys(data.daily).forEach(dayKey => {
            const item = data.daily[dayKey];
            const dayNum = parseInt(dayKey, 10);
            const d = new Date(year, month - 1, dayNum);
            const dateStr = d.toLocaleDateString('en-IN', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
            });
            list.push({
              day: dayNum,
              dateStr,
              status: item.status || 'present',
              remarks: item.remarks,
            });
          });
          list.sort((a, b) => b.day - a.day);
        } else if (Array.isArray(data.records)) {
          data.records.forEach((r: any) => {
            list.push({
              day: new Date(r.date).getDate(),
              dateStr: new Date(r.date).toLocaleDateString('en-IN', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              }),
              status: r.status,
              remarks: r.remarks,
            });
          });
        }
        setRecords(list);
      }
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const isEligible = summary.percentage >= 75;

  return (
    <ScrollView
      style={[styles.page, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={roleAccent.primary}
          colors={[roleAccent.primary]}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header Banner */}
      <LinearGradient
        colors={roleAccent.gradient}
        style={[styles.banner, { paddingTop: Platform.OS === 'ios' ? 24 : spacing.xl }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.bannerTitle}>{monthName || "Current Month's Attendance"}</Text>

        {/* Circular Percentage Gauge */}
        <View style={[styles.circleGauge, { borderColor: isEligible ? '#6ee7b7' : '#fca5a5' }]}>
          <Text style={[styles.circleValue, { color: '#ffffff' }]}>
            {summary.percentage}%
          </Text>
          <Text style={styles.circleLabel}>Rate</Text>
        </View>

        {/* Mini stats row */}
        <View style={styles.miniStats}>
          <View style={styles.miniStat}>
            <Text style={[styles.miniVal, { color: '#6ee7b7' }]}>{summary.present}</Text>
            <Text style={styles.miniLbl}>Present</Text>
          </View>
          <View style={styles.miniStat}>
            <Text style={[styles.miniVal, { color: '#fca5a5' }]}>{summary.absent}</Text>
            <Text style={styles.miniLbl}>Absent</Text>
          </View>
          <View style={styles.miniStat}>
            <Text style={[styles.miniVal, { color: '#fde68a' }]}>{summary.leave}</Text>
            <Text style={styles.miniLbl}>Leave</Text>
          </View>
          <View style={styles.miniStat}>
            <Text style={[styles.miniVal, { color: '#fff' }]}>{summary.total}</Text>
            <Text style={styles.miniLbl}>Days</Text>
          </View>
        </View>

        {/* Eligibility Status Pill */}
        <View style={[styles.eligibilityPill, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
          <Icon
            name={isEligible ? 'check-circle' : 'exclamation-circle'}
            size={12}
            color="#fff"
            solid
          />
          <Text style={styles.eligibilityText}>
            {isEligible
              ? 'Exam Eligibility Criteria Met (>= 75%)'
              : 'Attendance Below 75% Threshold'}
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <AppSectionHeader title="Daily Attendance Register" icon="calendar-check" />

        {loading ? (
          <AppSkeleton variant="list" count={6} />
        ) : records.length === 0 ? (
          <AppEmptyState
            icon="calendar-check"
            title="No Attendance Logs"
            description="No entries recorded for this month yet."
            style={{ paddingVertical: spacing.xl }}
          />
        ) : (
          records.map((r, i) => {
            const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.present;
            return (
              <AppCard key={i} variant="bordered" padding={12} style={{ marginBottom: spacing.xs }}>
                <View style={styles.recordRow}>
                  <View style={styles.dateCol}>
                    <Text style={[styles.dateText, { color: colors.text }]}>{r.dateStr}</Text>
                    {r.remarks ? (
                      <Text style={[styles.remarks, { color: colors.textTertiary }]}>{r.remarks}</Text>
                    ) : null}
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
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  banner: {
    padding: spacing.xl,
    borderBottomLeftRadius: radius['2xl'],
    borderBottomRightRadius: radius['2xl'],
    alignItems: 'center',
    ...shadows.md,
  },
  bannerTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: '#ffffff',
    marginBottom: spacing.md,
  },
  circleGauge: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.xs,
  },
  circleValue: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.extrabold,
  },
  circleLabel: {
    fontSize: typography.size['2xs'],
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase',
  },
  miniStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: spacing.md,
  },
  miniStat: {
    alignItems: 'center',
  },
  miniVal: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
  },
  miniLbl: {
    fontSize: typography.size['2xs'],
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  eligibilityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.full,
    marginTop: spacing.md,
  },
  eligibilityText: {
    color: '#ffffff',
    fontSize: typography.size['2xs'],
    fontWeight: typography.weight.semibold,
  },
  content: {
    padding: spacing.base,
    paddingBottom: spacing['3xl'],
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
  remarks: {
    fontSize: typography.size['2xs'],
    marginTop: 2,
  },
});
