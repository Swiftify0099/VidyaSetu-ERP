/**
 * VidyaSetu Mobile — Exam Dashboard Screen (Premium Redesign)
 * ==========================================================
 * Assessment command center: schedules, marks entry shortcuts, results and report cards.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from '../../theme/ThemeContext';
import { examAPI } from '../../services/api';
import { spacing, radius, typography, shadows } from '../../theme';
import { formatDateLong, formatStatus } from '../../utils/formatters';
import { CURRENT_ACADEMIC_YEAR } from '../../config/constants';
import {
  AppCard,
  AppBadge,
  AppStatCard,
  AppSectionHeader,
  AppEmptyState,
  AppSkeleton,
} from '../../components/ui';

interface ExamSchedule {
  id: number;
  exam_type_name: string;
  subject_name: string;
  standard: string;
  division: string;
  exam_date: string;
  start_time: string;
  end_time: string;
  total_marks: number;
  status: string;
}

export default function ExamDashboardScreen({ navigation }: { navigation: any }) {
  const { colors, roleAccent } = useTheme();
  const [schedules, setSchedules] = useState<ExamSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ total: 0, upcoming: 0, completed: 0, ongoing: 0 });

  const fetchData = useCallback(async () => {
    try {
      const res = await examAPI.getSchedules({ academic_year: CURRENT_ACADEMIC_YEAR, limit: 20 });
      const items: ExamSchedule[] = res.data?.data?.items ?? res.data?.data ?? [];
      setSchedules(items);
      setStats({
        total: items.length,
        upcoming:  items.filter(e => e.status === 'scheduled').length,
        ongoing:   items.filter(e => e.status === 'ongoing').length,
        completed: items.filter(e => e.status === 'completed').length,
      });
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const QUICK_ACTIONS = [
    { icon: 'calendar-plus', label: 'Schedule Exam',  color: '#6366f1', action: () => navigation.navigate('ExamSchedule') },
    { icon: 'pen',           label: 'Enter Marks',    color: '#10b981', action: () => navigation.navigate('ExamMarks') },
    { icon: 'chart-bar',     label: 'View Results',   color: '#f59e0b', action: () => navigation.navigate('ExamResults') },
    { icon: 'file-alt',      label: 'Report Cards',   color: '#3b82f6', action: () => navigation.navigate('ReportCard') },
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
        {/* Metric Stats Section */}
        <View style={[styles.statsSection, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={styles.statsGrid}>
            <AppStatCard
              label="Total Assessments"
              value={stats.total}
              icon="calendar-alt"
              color={colors.primary}
              style={{ width: '48%' }}
            />
            <AppStatCard
              label="Upcoming Exams"
              value={stats.upcoming}
              icon="clock"
              color={colors.warning}
              style={{ width: '48%' }}
            />
            <AppStatCard
              label="Ongoing Today"
              value={stats.ongoing}
              icon="stopwatch"
              color={colors.info}
              style={{ width: '48%' }}
            />
            <AppStatCard
              label="Completed"
              value={stats.completed}
              icon="check-circle"
              color={colors.success}
              style={{ width: '48%' }}
            />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={{ paddingHorizontal: spacing.base, marginTop: spacing.md }}>
          <AppSectionHeader title="Assessment Actions" icon="bolt" />
          <View style={styles.actionsGrid}>
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
                <View style={[styles.actionIcon, { backgroundColor: `${item.color}18` }]}>
                  <Icon name={item.icon} size={20} color={item.color} solid />
                </View>
                <Text style={[styles.actionLabel, { color: colors.text }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Exam Schedules List */}
        <View style={styles.section}>
          <AppSectionHeader
            title="Scheduled Examinations"
            icon="calendar-alt"
            onViewAll={() => navigation.navigate('ExamSchedule')}
          />
          {loading ? (
            <AppSkeleton variant="list" count={4} />
          ) : schedules.length === 0 ? (
            <AppEmptyState
              icon="clipboard-list"
              title="No Exam Schedules"
              description="No assessment tests or term exams scheduled yet."
              actionLabel="Schedule Exam"
              onAction={() => navigation.navigate('ExamSchedule')}
              style={{ paddingVertical: spacing.xl }}
            />
          ) : (
            schedules.slice(0, 8).map(exam => {
              const isCompleted = exam.status === 'completed';
              return (
                <TouchableOpacity
                  key={exam.id}
                  activeOpacity={0.8}
                  onPress={() =>
                    navigation.navigate('ExamMarks', {
                      examId: exam.id,
                      exam,
                    })
                  }
                  style={{ marginBottom: spacing.sm }}
                >
                  <AppCard variant="bordered" padding={12}>
                    <View style={styles.examRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.subjectName, { color: colors.text }]}>
                          {exam.subject_name}
                        </Text>
                        <Text style={[styles.examMeta, { color: colors.textSecondary }]}>
                          {exam.exam_type_name} • Std {exam.standard}-{exam.division}
                        </Text>
                        <Text style={[styles.examDate, { color: colors.textTertiary }]}>
                          {formatDateLong(exam.exam_date)}
                        </Text>
                      </View>

                      <View style={{ alignItems: 'flex-end', gap: 6 }}>
                        <AppBadge
                          label={isCompleted ? 'Completed' : 'Scheduled'}
                          variant={isCompleted ? 'success' : 'primary'}
                          size="sm"
                          rounded
                        />
                        <Text style={[styles.maxMarks, { color: colors.textTertiary }]}>
                          Max: {exam.total_marks}
                        </Text>
                      </View>
                    </View>
                  </AppCard>
                </TouchableOpacity>
              );
            })
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
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  actionBtn: {
    width: '48%',
    padding: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
  },
  section: {
    padding: spacing.base,
    paddingBottom: spacing['3xl'],
  },
  examRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subjectName: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
  },
  examMeta: {
    fontSize: typography.size.xs,
    marginTop: 2,
  },
  examDate: {
    fontSize: typography.size['2xs'],
    marginTop: 2,
  },
  maxMarks: {
    fontSize: typography.size['2xs'],
    fontWeight: typography.weight.semibold,
  },
});
