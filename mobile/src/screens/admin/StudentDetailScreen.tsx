/**
 * VidyaSetu Mobile — Student Detail Screen (Premium Redesign)
 * ============================================================
 * Comprehensive student profile view with attendance breakdown, fee status,
 * personal & guardian details, and quick module links.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from '../../theme/ThemeContext';
import { studentsAPI, financeAPI } from '../../services/api';
import { spacing, radius, typography, shadows } from '../../theme';
import { formatDateLong, formatCurrency } from '../../utils/formatters';
import {
  AppCard,
  AppBadge,
  AppAvatar,
  AppSectionHeader,
  AppStatCard,
  AppProgress,
  AppSkeleton,
  AppErrorState,
} from '../../components/ui';

interface StudentDetail {
  id: number;
  full_name: string;
  gr_number: string;
  standard: string;
  division: string;
  roll_number: number;
  gender?: string;
  dob?: string;
  blood_group?: string;
  mobile?: string;
  email?: string;
  address?: string;
  guardian_name?: string;
  guardian_mobile?: string;
  is_active: boolean;
  admission_date?: string;
  photo_url?: string;
}

interface AttendanceSummary {
  total_days: number;
  present: number;
  absent: number;
  leave: number;
  percentage: number;
}

interface FeeOverview {
  total_due: number;
  total_paid: number;
  balance: number;
  status: string;
}

export default function StudentDetailScreen({
  navigation,
  route,
}: {
  navigation: any;
  route: any;
}) {
  const { studentId } = route?.params ?? {};
  const { colors, roleAccent } = useTheme();

  const [student, setStudent]       = useState<StudentDetail | null>(null);
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null);
  const [fees, setFees]             = useState<FeeOverview | null>(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState<any>(null);

  const load = useCallback(async () => {
    if (!studentId) {
      setError({ message: 'No student specified' });
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const [studRes, attRes, feeRes] = await Promise.allSettled([
        studentsAPI.get(studentId),
        studentsAPI.getAttendanceSummary(studentId, { academic_year: '2025-2026' }),
        financeAPI.getStudentFees(studentId, '2025-2026'),
      ]);

      if (studRes.status === 'fulfilled') {
        setStudent(studRes.value.data?.data ?? null);
      } else {
        setError(studRes.reason);
      }

      if (attRes.status === 'fulfilled') {
        const attData = attRes.value.data?.data ?? [];
        const recs = Array.isArray(attData) ? attData : attData.records ?? [];
        const present = recs.filter((r: any) => r.status === 'present' || r.status === 'P').length;
        const absent  = recs.filter((r: any) => r.status === 'absent'  || r.status === 'A').length;
        const leave   = recs.filter((r: any) => r.status === 'leave'   || r.status === 'L').length;
        const total   = recs.length;
        setAttendance({
          total_days: total,
          present,
          absent,
          leave,
          percentage: total > 0 ? Math.round((present / total) * 100) : 0,
        });
      }

      if (feeRes.status === 'fulfilled') {
        const feeData = feeRes.value.data?.data;
        setFees({
          total_due:  feeData?.total_due  ?? 0,
          total_paid: feeData?.total_paid ?? 0,
          balance:    feeData?.balance    ?? 0,
          status:     feeData?.status     ?? 'unknown',
        });
      }
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [studentId]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const pct = attendance?.percentage ?? 0;
  const attColor = pct >= 75 ? colors.success : pct >= 60 ? colors.warning : colors.danger;
  const balColor = (fees?.balance ?? 0) > 0 ? colors.danger : colors.success;

  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, padding: spacing.base }]}>
        <AppSkeleton variant="profile" />
        <View style={{ height: 16 }} />
        <AppSkeleton variant="card" count={2} />
      </View>
    );
  }

  if (error || !student) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <AppErrorState
          error={error}
          title="Student Profile Unavailable"
          message="Could not load student information. Please verify connection and retry."
          onRetry={load}
          onSecondaryAction={() => navigation.goBack()}
          style={{ flex: 1 }}
        />
      </View>
    );
  }

  const renderInfoRow = (label: string, value?: string | null, icon?: string) => {
    if (!value) return null;
    return (
      <View style={[styles.infoRow, { borderBottomColor: colors.divider }]}>
        <View style={styles.infoLabelRow}>
          {icon && <Icon name={icon} size={11} color={colors.textTertiary} style={{ marginRight: 6 }} />}
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
        </View>
        <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
      </View>
    );
  };

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
        {/* ── Hero Profile Header ───────────────────────────────── */}
        <LinearGradient
          colors={roleAccent.gradient}
          style={[styles.hero, { paddingTop: Platform.OS === 'ios' ? 56 : 40 }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.heroTop}>
            <AppAvatar
              name={student.full_name}
              size="lg"
              roleColor="#ffffff"
            />
            <View style={styles.heroInfo}>
              <Text style={styles.heroName}>{student.full_name}</Text>
              <Text style={styles.heroSub}>
                Standard {student.standard}-{student.division} • Roll #{student.roll_number}
              </Text>
              <View style={styles.heroBadgeRow}>
                <View style={[styles.grBadge, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
                  <Text style={styles.grText}>GR: {student.gr_number}</Text>
                </View>
                <AppBadge
                  label={student.is_active ? 'Active' : 'Inactive'}
                  variant={student.is_active ? 'success' : 'danger'}
                  size="sm"
                  rounded
                />
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.body}>
          {/* ── Key Metrics Grid ───────────────────────────────── */}
          <View style={styles.statsRow}>
            <AppStatCard
              label="Attendance Rate"
              value={`${pct}%`}
              icon="clipboard-check"
              color={attColor}
              subtitle={`${attendance?.present ?? 0}P / ${attendance?.absent ?? 0}A`}
            />
            <AppStatCard
              label="Fee Dues"
              value={formatCurrency(fees?.balance ?? 0)}
              icon="rupee-sign"
              color={balColor}
              subtitle={`Paid ${formatCurrency(fees?.total_paid ?? 0)}`}
            />
          </View>

          {/* Turnout Progress */}
          <AppCard variant="bordered" padding={14}>
            <AppSectionHeader title="Academic Attendance" icon="chart-line" />
            <AppProgress
              value={pct}
              label="Yearly Attendance Turnout"
              color={attColor}
            />
          </AppCard>

          {/* ── Personal Info ─────────────────────────────────── */}
          <AppCard variant="bordered" padding={14}>
            <AppSectionHeader title="Personal Information" icon="user" />
            {renderInfoRow('Gender', student.gender, 'venus-mars')}
            {renderInfoRow('Date of Birth', student.dob ? formatDateLong(student.dob) : null, 'birthday-cake')}
            {renderInfoRow('Blood Group', student.blood_group, 'tint')}
            {renderInfoRow('Mobile Phone', student.mobile, 'phone')}
            {renderInfoRow('Email Address', student.email, 'envelope')}
            {renderInfoRow('Residential Address', student.address, 'map-marker-alt')}
            {renderInfoRow('Admission Date', student.admission_date ? formatDateLong(student.admission_date) : null, 'calendar')}
          </AppCard>

          {/* ── Guardian Info ────────────────────────────────── */}
          {(student.guardian_name || student.guardian_mobile) && (
            <AppCard variant="bordered" padding={14}>
              <AppSectionHeader title="Parent / Guardian" icon="user-friends" />
              {renderInfoRow('Guardian Name', student.guardian_name, 'user')}
              {renderInfoRow('Contact Mobile', student.guardian_mobile, 'phone')}
            </AppCard>
          )}

          {/* ── Module Quick Shortcuts ────────────────────────── */}
          <AppCard variant="bordered" padding={14}>
            <AppSectionHeader title="Student Records & History" icon="folder-open" />
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.primaryBg }]}
                onPress={() => navigation?.navigate('ExamResults', { studentId: student.id })}
                activeOpacity={0.75}
              >
                <Icon name="award" size={18} color={colors.primary} />
                <Text style={[styles.actionText, { color: colors.primary }]}>Results</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.successBg }]}
                onPress={() => navigation?.navigate('Leave', { studentId: student.id })}
                activeOpacity={0.75}
              >
                <Icon name="calendar-minus" size={18} color={colors.success} />
                <Text style={[styles.actionText, { color: colors.success }]}>Leave</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.warningBg }]}
                onPress={() => navigation?.navigate('BehaviourLog', { studentId: student.id })}
                activeOpacity={0.75}
              >
                <Icon name="clipboard-list" size={18} color={colors.warning} />
                <Text style={[styles.actionText, { color: colors.warning }]}>Behaviour</Text>
              </TouchableOpacity>
            </View>
          </AppCard>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  hero: {
    padding: spacing.xl,
    overflow: 'hidden',
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
  },
  heroInfo: {
    flex: 1,
  },
  heroName: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.extrabold,
    color: '#ffffff',
  },
  heroSub: {
    fontSize: typography.size.xs,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  grBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  grText: {
    color: '#ffffff',
    fontSize: typography.size['2xs'],
    fontWeight: typography.weight.bold,
  },
  body: {
    padding: spacing.base,
    gap: spacing.md,
    paddingBottom: spacing['3xl'],
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
  },
  infoLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
  },
  infoValue: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    maxWidth: '55%',
    textAlign: 'right',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    gap: 6,
  },
  actionText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
  },
});
