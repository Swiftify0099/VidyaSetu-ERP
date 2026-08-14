/**
 * VidyaSetu Mobile — Attendance Marking Screen (Premium Redesign)
 * ================================================================
 * Daily class attendance roster with one-tap status toggling,
 * bulk actions, search filtering, progress breakdown, and real-time synchronization.
 */
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from '../../theme/ThemeContext';
import { attendanceAPI, teacherPortalAPI } from '../../services/api';
import { CLASSES, DIVISIONS, CURRENT_ACADEMIC_YEAR } from '../../config/constants';
import { spacing, radius, typography, shadows } from '../../theme';
import {
  AppCard,
  AppButton,
  AppBadge,
  AppSearchBar,
  AppProgress,
  AppEmptyState,
  AppSkeleton,
  AppChip,
} from '../../components/ui';
import Toast from 'react-native-toast-message';
import { getErrorMessage } from '../../utils/formatters';

type AttendanceStatus = 'present' | 'absent' | 'leave' | 'late';

interface StudentRecord {
  id: number;
  gr_number: string;
  full_name: string;
  roll_number: number;
  status: AttendanceStatus;
}

const STATUS_MAP: Record<AttendanceStatus, { label: string; icon: string; color: string; bg: string; badgeVariant: any }> = {
  present: { label: 'Present', icon: 'check',          color: '#059669', bg: '#d1fae5', badgeVariant: 'success' },
  absent:  { label: 'Absent',  icon: 'times',          color: '#dc2626', bg: '#fee2e2', badgeVariant: 'danger'  },
  leave:   { label: 'Leave',   icon: 'umbrella-beach', color: '#d97706', bg: '#fef3c7', badgeVariant: 'warning' },
  late:    { label: 'Late',    icon: 'clock',          color: '#7c3aed', bg: '#ede9fe', badgeVariant: 'info'    },
};

export default function AttendanceScreen() {
  const { colors, roleAccent } = useTheme();
  const [standard, setStandard] = useState(CLASSES[0]);
  const [division, setDivision] = useState(DIVISIONS[0]);
  const [availableClasses, setAvailableClasses] = useState<string[]>(CLASSES);
  const [availableDivisions, setAvailableDivisions] = useState<string[]>(DIVISIONS);
  const [date] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [search, setSearch] = useState('');

  // Load teacher assigned classes
  useEffect(() => {
    (async () => {
      try {
        const res = await teacherPortalAPI.getMyClasses();
        const classes = res.data?.data ?? [];
        if (Array.isArray(classes) && classes.length > 0) {
          const standards = [...new Set(classes.map((c: any) => String(c.standard)))];
          const divisions = [...new Set(classes.map((c: any) => String(c.division ?? 'A')))];
          if (standards.length > 0) { setAvailableClasses(standards); setStandard(standards[0]); }
          if (divisions.length > 0) { setAvailableDivisions(divisions); setDivision(divisions[0]); }
        }
      } catch {
        // use defaults
      }
    })();
  }, []);

  const fetchClassList = useCallback(async () => {
    if (!standard || !division) return;
    setLoading(true);
    setFetched(false);
    try {
      const res = await attendanceAPI.getClassAttendance(standard, division, date);
      const data = res.data?.data ?? [];
      const rows = Array.isArray(data) ? data : (data.students ?? []);
      setStudents(rows.map((s: any) => ({ ...s, status: s.status ?? 'present' })));
      setFetched(true);
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Failed to load class roster', text2: getErrorMessage(e) });
    } finally {
      setLoading(false);
    }
  }, [standard, division, date]);

  const toggleStatus = (id: number) => {
    const cycle: AttendanceStatus[] = ['present', 'absent', 'leave', 'late'];
    setStudents(prev => prev.map(s => {
      if (s.id !== id) return s;
      const idx = cycle.indexOf(s.status);
      return { ...s, status: cycle[(idx + 1) % cycle.length] };
    }));
  };

  const setAll = (status: AttendanceStatus) => {
    setStudents(prev => prev.map(s => ({ ...s, status })));
  };

  const saveAttendance = async () => {
    if (students.length === 0) return;
    setSaving(true);
    try {
      const records = students.map(s => ({
        student_id: s.id,
        status: s.status,
      }));
      await attendanceAPI.markAttendance({
        att_date: date,
        standard,
        division,
        academic_year_id: 1,
        records,
      });
      Toast.show({
        type: 'success',
        text1: 'Attendance Recorded Successfully',
        text2: `${presentCount} Present • ${absentCount} Absent • ${leaveCount} Leave`,
      });
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Failed to save attendance', text2: getErrorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = useMemo(() => {
    if (!search.trim()) return students;
    const q = search.toLowerCase();
    return students.filter(s =>
      s.full_name.toLowerCase().includes(q) || s.gr_number.includes(q) || String(s.roll_number).includes(q)
    );
  }, [students, search]);

  const presentCount = students.filter(s => s.status === 'present').length;
  const absentCount  = students.filter(s => s.status === 'absent').length;
  const leaveCount   = students.filter(s => s.status === 'leave').length;
  const lateCount    = students.filter(s => s.status === 'late').length;

  const attendancePercent = students.length > 0 ? (presentCount / students.length) * 100 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Class Selection Controls */}
      <View style={[styles.toolbar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {/* Class Selection Chips */}
        <View style={styles.pickerSection}>
          <Text style={[styles.pickerLabel, { color: colors.textSecondary }]}>Standard</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {availableClasses.map(s => (
              <AppChip
                key={s}
                label={`Std ${s}`}
                selected={standard === s}
                onPress={() => setStandard(s)}
              />
            ))}
          </ScrollView>
        </View>

        {/* Division Selection Chips */}
        <View style={styles.pickerSection}>
          <Text style={[styles.pickerLabel, { color: colors.textSecondary }]}>Division</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {availableDivisions.map(d => (
              <AppChip
                key={d}
                label={`Div ${d}`}
                selected={division === d}
                onPress={() => setDivision(d)}
              />
            ))}
          </View>
        </View>

        {/* Load Roster Button */}
        <AppButton
          label="Load Class Roster"
          iconLeft="sync-alt"
          onPress={fetchClassList}
          loading={loading}
          fullWidth
          size="md"
        />
      </View>

      {/* Date Header Strip */}
      <View style={[styles.dateStrip, { backgroundColor: colors.primaryBg, borderColor: colors.primaryBorder }]}>
        <Icon name="calendar-alt" size={13} color={colors.primary} solid />
        <Text style={[styles.dateText, { color: colors.primary }]}>
          {new Date(date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </Text>
      </View>

      {loading ? (
        <View style={{ padding: spacing.base }}>
          <AppSkeleton variant="list" count={6} />
        </View>
      ) : !fetched ? (
        <AppEmptyState
          icon="clipboard-list"
          title="Select Class & Division"
          description="Choose a standard and division above, then tap 'Load Class Roster' to take attendance."
          actionLabel="Load Now"
          onAction={fetchClassList}
          style={{ flex: 1 }}
        />
      ) : students.length === 0 ? (
        <AppEmptyState
          icon="user-graduate"
          title="No Students Enrolled"
          description={`There are no students enrolled in Standard ${standard} - Division ${division}.`}
          actionLabel="Refresh"
          onAction={fetchClassList}
          style={{ flex: 1 }}
        />
      ) : (
        <>
          {/* Summary Metric Stats Card */}
          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={[styles.statNum, { color: colors.success }]}>{presentCount}</Text>
                <Text style={[styles.statLbl, { color: colors.textSecondary }]}>Present</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statNum, { color: colors.danger }]}>{absentCount}</Text>
                <Text style={[styles.statLbl, { color: colors.textSecondary }]}>Absent</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statNum, { color: colors.warning }]}>{leaveCount}</Text>
                <Text style={[styles.statLbl, { color: colors.textSecondary }]}>Leave</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statNum, { color: colors.info }]}>{lateCount}</Text>
                <Text style={[styles.statLbl, { color: colors.textSecondary }]}>Late</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statNum, { color: colors.text }]}>{students.length}</Text>
                <Text style={[styles.statLbl, { color: colors.textSecondary }]}>Total</Text>
              </View>
            </View>

            <AppProgress
              value={attendancePercent}
              label="Turnout Rate"
              color={colors.success}
              style={{ marginTop: spacing.xs }}
            />
          </View>

          {/* Quick Bulk Actions & Search */}
          <View style={[styles.filterBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <View style={styles.bulkRow}>
              <Text style={[styles.bulkTitle, { color: colors.textSecondary }]}>Mark All:</Text>
              <TouchableOpacity
                style={[styles.bulkChip, { backgroundColor: colors.successBg }]}
                onPress={() => setAll('present')}
                activeOpacity={0.75}
              >
                <Icon name="check" size={10} color={colors.success} solid />
                <Text style={{ color: colors.success, fontSize: 11, fontWeight: '700' }}>Present</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.bulkChip, { backgroundColor: colors.dangerBg }]}
                onPress={() => setAll('absent')}
                activeOpacity={0.75}
              >
                <Icon name="times" size={10} color={colors.danger} solid />
                <Text style={{ color: colors.danger, fontSize: 11, fontWeight: '700' }}>Absent</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.bulkChip, { backgroundColor: colors.warningBg }]}
                onPress={() => setAll('leave')}
                activeOpacity={0.75}
              >
                <Icon name="umbrella-beach" size={10} color={colors.warning} solid />
                <Text style={{ color: colors.warning, fontSize: 11, fontWeight: '700' }}>Leave</Text>
              </TouchableOpacity>
            </View>

            <AppSearchBar
              value={search}
              onChangeText={setSearch}
              placeholder="Search by student name or roll..."
              style={{ marginVertical: 0 }}
            />
          </View>

          {/* Student Roster List */}
          <FlatList
            data={filteredStudents}
            keyExtractor={item => String(item.id)}
            contentContainerStyle={{ padding: spacing.base, paddingBottom: 110 }}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            renderItem={({ item }) => {
              const cfg = STATUS_MAP[item.status] ?? STATUS_MAP.present;
              return (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => toggleStatus(item.id)}
                >
                  <AppCard variant="bordered" padding={12}>
                    <View style={styles.studentCardRow}>
                      {/* Roll Number Circle */}
                      <View style={[styles.rollCircle, { backgroundColor: colors.primaryBg }]}>
                        <Text style={[styles.rollNum, { color: colors.primary }]}>
                          {item.roll_number}
                        </Text>
                      </View>

                      {/* Name & GR Info */}
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.studName, { color: colors.text }]}>{item.full_name}</Text>
                        <Text style={[styles.studGr, { color: colors.textSecondary }]}>
                          GR: {item.gr_number}
                        </Text>
                      </View>

                      {/* Interactive Status Toggle Pill */}
                      <View style={[styles.statusToggle, { backgroundColor: cfg.bg }]}>
                        <Icon name={cfg.icon} size={12} color={cfg.color} solid />
                        <Text style={[styles.statusToggleText, { color: cfg.color }]}>
                          {cfg.label}
                        </Text>
                      </View>
                    </View>
                  </AppCard>
                </TouchableOpacity>
              );
            }}
          />

          {/* Floating Save Footer */}
          <View
            style={[
              styles.saveWrap,
              {
                backgroundColor: colors.surface,
                borderTopColor: colors.border,
                ...shadows.lg,
              },
            ]}
          >
            <AppButton
              label={`Save Attendance (${students.length} students)`}
              iconLeft="save"
              onPress={saveAttendance}
              loading={saving}
              fullWidth
              size="lg"
            />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toolbar: {
    padding: spacing.base,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  pickerSection: {
    gap: 4,
  },
  pickerLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  dateStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: 1,
  },
  dateText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
  },
  summaryCard: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statNum: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.extrabold,
  },
  statLbl: {
    fontSize: typography.size['2xs'],
    fontWeight: typography.weight.semibold,
    marginTop: 1,
  },
  filterBar: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  bulkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bulkTitle: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    textTransform: 'uppercase',
  },
  bulkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  studentCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rollCircle: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rollNum: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.extrabold,
  },
  studName: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
  },
  studGr: {
    fontSize: typography.size.xs,
    marginTop: 2,
  },
  statusToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.md,
  },
  statusToggleText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
  },
  saveWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.base,
    borderTopWidth: 1,
  },
});
