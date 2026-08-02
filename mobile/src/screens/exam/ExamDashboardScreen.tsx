/**
 * VidyaSetu Mobile — Exam Dashboard Screen
 * Shows exam schedules, stats, and quick actions.
 * Accessible to: admin, principal, teacher, class_teacher, exam_coordinator
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from '../../theme/ThemeContext';
import { examAPI } from '../../services/api';
import { spacing, radius, typography, shadows } from '../../theme';
import { formatDateLong, formatStatus, statusColor } from '../../utils/formatters';
import { CURRENT_ACADEMIC_YEAR } from '../../config/constants';
import SectionHeader from '../../components/ui/SectionHeader';
import PremiumCard from '../../components/ui/PremiumCard';
import Badge from '../../components/ui/Badge';
import SkeletonLoader from '../../components/ui/SkeletonLoader';

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
  const { colors } = useTheme();
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

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const QUICK_ACTIONS = [
    { icon: 'calendar-plus', label: 'Schedule Exam',  color: '#6366f1', action: () => navigation.navigate('ExamSchedule') },
    { icon: 'pen',           label: 'Enter Marks',    color: '#10b981', action: () => navigation.navigate('ExamMarks') },
    { icon: 'chart-bar',     label: 'View Results',   color: '#f59e0b', action: () => navigation.navigate('ExamResults') },
    { icon: 'file-alt',      label: 'Report Cards',   color: '#3b82f6', action: () => navigation.navigate('ReportCard') },
  ];

  function badgeVariant(status: string) {
    if (status === 'completed') return 'success';
    if (status === 'ongoing')   return 'warning';
    if (status === 'scheduled') return 'primary';
    return 'default';
  }

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {/* Stats */}
        <View style={[s.statsBar, { backgroundColor: colors.primary }]}>
          {[
            { label: 'Total',     value: stats.total,     color: '#fff' },
            { label: 'Upcoming',  value: stats.upcoming,  color: '#fde68a' },
            { label: 'Ongoing',   value: stats.ongoing,   color: '#6ee7b7' },
            { label: 'Completed', value: stats.completed, color: '#a5b4fc' },
          ].map((item, i) => (
            <View key={i} style={s.statItem}>
              <Text style={[s.statValue, { color: item.color }]}>{item.value}</Text>
              <Text style={s.statLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={[s.section, { marginTop: spacing.lg }]}>
          <SectionHeader title="Quick Actions" icon="bolt" />
          <View style={s.actionsGrid}>
            {QUICK_ACTIONS.map((item, i) => (
              <TouchableOpacity
                key={i}
                style={[s.actionBtn, { backgroundColor: colors.surface, ...shadows.sm }]}
                onPress={item.action}
                activeOpacity={0.75}
              >
                <View style={[s.actionIcon, { backgroundColor: `${item.color}18` }]}>
                  <Icon name={item.icon} size={20} color={item.color} solid />
                </View>
                <Text style={[s.actionLabel, { color: colors.text }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Exam List */}
        <View style={s.section}>
          <SectionHeader
            title="Exam Schedules"
            icon="calendar-alt"
            onViewAll={() => navigation.navigate('ExamSchedule')}
          />
          {loading ? (
            <SkeletonLoader variant="list" count={4} />
          ) : schedules.length === 0 ? (
            <PremiumCard variant="flat" style={s.emptyCard}>
              <Text style={s.emptyIcon}>📋</Text>
              <Text style={[s.emptyText, { color: colors.textSecondary }]}>No exam schedules found</Text>
              <TouchableOpacity
                style={[s.emptyBtn, { backgroundColor: colors.primaryBg }]}
                onPress={() => navigation.navigate('ExamSchedule')}
              >
                <Text style={[s.emptyBtnText, { color: colors.primary }]}>Schedule an Exam</Text>
              </TouchableOpacity>
            </PremiumCard>
          ) : (
            schedules.slice(0, 8).map((exam) => (
              <PremiumCard key={exam.id} variant="bordered" style={s.examCard} padding={12}>
                <TouchableOpacity
                  onPress={() => navigation.navigate('ExamMarks', { examId: exam.id, exam })}
                  activeOpacity={0.85}
                >
                  <View style={s.examRow}>
                    <View style={[s.examIconWrap, { backgroundColor: colors.primaryBg }]}>
                      <Icon name="file-alt" size={16} color={colors.primary} solid />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={s.examTitleRow}>
                        <Text style={[s.examSubject, { color: colors.text }]} numberOfLines={1}>
                          {exam.subject_name}
                        </Text>
                        <Badge
                          label={formatStatus(exam.status)}
                          variant={badgeVariant(exam.status) as any}
                          size="sm"
                          rounded
                        />
                      </View>
                      <Text style={[s.examType, { color: colors.textSecondary }]}>
                        {exam.exam_type_name} • Std {exam.standard}-{exam.division}
                      </Text>
                      <View style={s.examMeta}>
                        <Icon name="calendar" size={10} color={colors.textTertiary} solid />
                        <Text style={[s.examDate, { color: colors.textTertiary }]}>
                          {formatDateLong(exam.exam_date)}
                        </Text>
                        <Icon name="clock" size={10} color={colors.textTertiary} solid />
                        <Text style={[s.examDate, { color: colors.textTertiary }]}>
                          {exam.start_time} – {exam.end_time}
                        </Text>
                        <Text style={[s.examMarks, { color: colors.textTertiary }]}>
                          Max: {exam.total_marks}
                        </Text>
                      </View>
                    </View>
                    <Icon name="chevron-right" size={12} color={colors.textTertiary} solid />
                  </View>
                </TouchableOpacity>
              </PremiumCard>
            ))
          )}
        </View>

        <View style={{ height: spacing['3xl'] }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  statsBar: {
    flexDirection: 'row', padding: spacing.base,
    justifyContent: 'space-around',
  },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: typography.size.xl, fontWeight: typography.weight.extrabold },
  statLabel: { fontSize: typography.size.xs, color: 'rgba(255,255,255,0.75)', marginTop: 2, fontWeight: typography.weight.medium },
  section: { paddingHorizontal: spacing.base, marginTop: spacing.lg },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actionBtn: {
    width: '47%', borderRadius: radius.xl, padding: spacing.md,
    alignItems: 'center', gap: 6,
  },
  actionIcon: { width: 48, height: 48, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: typography.size.xs, fontWeight: typography.weight.semibold, textAlign: 'center' },
  examCard: { marginBottom: spacing.sm },
  examRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  examIconWrap: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  examTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  examSubject: { fontSize: typography.size.base, fontWeight: typography.weight.bold, flex: 1, marginRight: 8 },
  examType: { fontSize: typography.size.sm, marginBottom: 4 },
  examMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
  examDate: { fontSize: typography.size.xs },
  examMarks: { fontSize: typography.size.xs, marginLeft: 4 },
  emptyCard: { alignItems: 'center', padding: spacing.xl },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyText: { fontSize: typography.size.base, marginBottom: spacing.md },
  emptyBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.full },
  emptyBtnText: { fontSize: typography.size.sm, fontWeight: typography.weight.semibold },
});
