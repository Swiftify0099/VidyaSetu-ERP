/**
 * VidyaSetu Mobile — Timetable Screen (Role-Aware - Premium Redesign)
 * ====================================================================
 * Period schedule timeline for Teachers and Students with period cards,
 * time badges, teacher / room indicators, and day tabs.
 */
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/ThemeContext';
import { teacherPortalAPI, studentPortalAPI } from '../../services/api';
import { spacing, radius, typography, shadows } from '../../theme';
import { formatTime } from '../../utils/formatters';
import {
  AppCard,
  AppBadge,
  AppTabs,
  AppEmptyState,
  AppSkeleton,
  AppErrorState,
} from '../../components/ui';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_TABS = [
  { key: '0', label: 'Mon' },
  { key: '1', label: 'Tue' },
  { key: '2', label: 'Wed' },
  { key: '3', label: 'Thu' },
  { key: '4', label: 'Fri' },
  { key: '5', label: 'Sat' },
];

const SUBJECT_COLORS = ['#4f46e5', '#059669', '#d97706', '#0891b2', '#7c3aed', '#dc2626', '#f97316', '#10b981'];

interface Period {
  period_number: number;
  start_time: string;
  end_time: string;
  subject: string;
  subject_name?: string;
  teacher_name?: string;
  teacher?: string;
  room?: string;
}

interface DayTimetable {
  day: number | string;
  day_en?: string;
  periods: Period[];
}

function resolveRole(user: any): string {
  if (!user) return '';
  if (Array.isArray(user.roles) && user.roles.length > 0) {
    const r0 = user.roles[0];
    return typeof r0 === 'string' ? r0.toLowerCase() : (r0?.code ?? '').toLowerCase();
  }
  return (user.role ?? '').toLowerCase();
}

export default function TimetableScreen() {
  const { user } = useAuthStore();
  const { colors, roleAccent } = useTheme();
  const role = resolveRole(user);

  const [timetable, setTimetable] = useState<DayTimetable[]>([]);
  const [selectedDayKey, setSelectedDayKey] = useState(() => {
    const d = new Date().getDay();
    const idx = Math.max(0, Math.min(d - 1, 5));
    return String(idx);
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<any>(null);

  const isTeacher = ['teacher', 'class_teacher'].includes(role);
  const isStudent = role === 'student';

  const loadData = useCallback(async () => {
    setError(null);
    if (!isTeacher && !isStudent) {
      setLoading(false);
      setRefreshing(false);
      setError({ message: 'Timetable view is configured for Teachers and Students.' });
      return;
    }
    try {
      let raw: any = null;
      if (isTeacher) {
        const res = await teacherPortalAPI.getMyTimetable();
        raw = res.data?.data;
      } else {
        const res = await studentPortalAPI.getMyTimetable();
        raw = res.data?.data;
      }
      const items: DayTimetable[] = Array.isArray(raw?.timetable)
        ? raw.timetable
        : Array.isArray(raw)
        ? raw
        : [];
      setTimetable(items);
    } catch (e) {
      setError(e);
      setTimetable([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isTeacher, isStudent]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const selectedDayIndex = parseInt(selectedDayKey, 10);

  const currentDayData = useMemo(() => {
    return timetable.find(d => {
      const dayLabel = (d.day_en ?? d.day ?? '').toString().toLowerCase();
      return dayLabel === DAYS[selectedDayIndex].toLowerCase() || Number(d.day) === selectedDayIndex + 1;
    });
  }, [timetable, selectedDayIndex]);

  const periods = currentDayData?.periods ?? [];

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      {/* Day Tabs Bar */}
      <View style={[styles.tabsWrap, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <AppTabs
          tabs={DAY_TABS}
          activeTab={selectedDayKey}
          onChangeTab={setSelectedDayKey}
          variant="pill"
          scrollable
        />
      </View>

      {/* Main Timeline List */}
      {loading ? (
        <View style={{ padding: spacing.base }}>
          <AppSkeleton variant="card" count={4} />
        </View>
      ) : error ? (
        <AppErrorState
          error={error}
          title="Timetable Unavailable"
          onRetry={loadData}
          style={{ flex: 1 }}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Day Title Header */}
          <View style={styles.dayHeader}>
            <Icon name="calendar-day" size={14} color={colors.primary} solid />
            <Text style={[styles.dayTitle, { color: colors.text }]}>
              {DAYS[selectedDayIndex]} Schedule
            </Text>
            <AppBadge
              label={`${periods.length} Periods`}
              variant="neutral"
              size="sm"
              style={{ marginLeft: 'auto' }}
            />
          </View>

          {periods.length === 0 ? (
            <AppEmptyState
              icon="calendar-check"
              title="No Classes Scheduled"
              description={`You have no lectures or periods assigned for ${DAYS[selectedDayIndex]}.`}
              style={{ paddingVertical: spacing['2xl'] }}
            />
          ) : (
            <View style={styles.timelineList}>
              {periods.map((period, index) => {
                const subColor = SUBJECT_COLORS[index % SUBJECT_COLORS.length];
                const subName = period.subject_name ?? period.subject ?? 'Academic Period';
                const instructor = period.teacher_name ?? period.teacher;

                return (
                  <View key={index} style={styles.periodRow}>
                    {/* Left Time Column */}
                    <View style={styles.timeCol}>
                      <Text style={[styles.timeText, { color: colors.text }]}>
                        {period.start_time ? formatTime(period.start_time) : `Period ${period.period_number}`}
                      </Text>
                      <Text style={[styles.timeSub, { color: colors.textTertiary }]}>
                        {period.end_time ? formatTime(period.end_time) : ''}
                      </Text>
                    </View>

                    {/* Timeline Line & Node */}
                    <View style={styles.timelineTrack}>
                      <View style={[styles.node, { backgroundColor: subColor }]} />
                      {index < periods.length - 1 && (
                        <View style={[styles.trackLine, { backgroundColor: colors.border }]} />
                      )}
                    </View>

                    {/* Period Detail Card */}
                    <View style={styles.cardCol}>
                      <AppCard
                        variant="bordered"
                        padding={14}
                        style={{ borderLeftWidth: 3.5, borderLeftColor: subColor }}
                      >
                        <View style={styles.periodCardContent}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.periodNumber, { color: subColor }]}>
                              Period #{period.period_number}
                            </Text>
                            <Text style={[styles.subjectName, { color: colors.text }]}>
                              {subName}
                            </Text>

                            {instructor && (
                              <View style={styles.instructorRow}>
                                <Icon name="chalkboard-teacher" size={11} color={colors.textSecondary} />
                                <Text style={[styles.instructorText, { color: colors.textSecondary }]}>
                                  {instructor}
                                </Text>
                              </View>
                            )}

                            {period.room && (
                              <View style={styles.roomRow}>
                                <Icon name="door-closed" size={10} color={colors.textTertiary} />
                                <Text style={[styles.roomText, { color: colors.textTertiary }]}>
                                  Room {period.room}
                                </Text>
                              </View>
                            )}
                          </View>

                          <View
                            style={[
                              styles.iconPill,
                              { backgroundColor: `${subColor}15` },
                            ]}
                          >
                            <Icon name="book-open" size={14} color={subColor} solid />
                          </View>
                        </View>
                      </AppCard>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  tabsWrap: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
  },
  content: {
    padding: spacing.base,
    paddingBottom: spacing['3xl'],
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  dayTitle: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
  },
  timelineList: {
    gap: spacing.md,
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timeCol: {
    width: 68,
    alignItems: 'flex-end',
    paddingRight: spacing.sm,
    paddingTop: 2,
  },
  timeText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
  },
  timeSub: {
    fontSize: typography.size['2xs'],
    marginTop: 2,
  },
  timelineTrack: {
    width: 20,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  node: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
    marginTop: 6,
  },
  trackLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
  },
  cardCol: {
    flex: 1,
    marginLeft: spacing.xs,
  },
  periodCardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  periodNumber: {
    fontSize: typography.size['2xs'],
    fontWeight: typography.weight.extrabold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subjectName: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    marginTop: 2,
  },
  instructorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  instructorText: {
    fontSize: typography.size.xs,
  },
  roomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  roomText: {
    fontSize: typography.size['2xs'],
  },
  iconPill: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
});
