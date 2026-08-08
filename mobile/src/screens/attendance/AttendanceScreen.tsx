/**
 * VidyaSetu Mobile — Attendance Marking Screen
 * Teacher marks class attendance for the day.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, ActivityIndicator, Platform, TextInput, ScrollView,
} from 'react-native';
import { attendanceAPI, teacherPortalAPI } from '../../services/api';
import { CLASSES, DIVISIONS } from '../../config/constants';
import Toast from 'react-native-toast-message';

const COLORS = {
  primary: '#4f46e5', success: '#10b981', danger: '#ef4444',
  warning: '#f59e0b', surface: '#fff', bg: '#f0f0ff',
  border: '#e5e7eb', text: '#111827', textSecondary: '#6b7280',
};

type AttendanceStatus = 'present' | 'absent' | 'leave' | 'late';

interface StudentRecord {
  id: number;
  gr_number: string;
  full_name: string;
  roll_number: number;
  status: AttendanceStatus;
}

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; color: string; bg: string; icon: string }> = {
  present: { label: 'P', color: '#fff', bg: COLORS.success, icon: '✓' },
  absent:  { label: 'A', color: '#fff', bg: COLORS.danger,  icon: '✗' },
  leave:   { label: 'L', color: '#fff', bg: COLORS.warning, icon: 'L' },
  late:    { label: 'LT', color: '#fff', bg: '#8b5cf6',     icon: '⏰' },
};

export default function AttendanceScreen() {
  // Default to first standard; will be updated when teacher's class loads
  const [standard, setStandard] = useState(CLASSES[0]);
  const [division, setDivision] = useState(DIVISIONS[0]);
  const [availableClasses, setAvailableClasses] = useState<string[]>(CLASSES);
  const [availableDivisions, setAvailableDivisions] = useState<string[]>(DIVISIONS);
  const [date] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fetched, setFetched] = useState(false);

  // Load teacher's assigned classes on mount to pre-fill selection
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
      } catch { /* Use default CLASSES and DIVISIONS */ }
    })();
  }, []);

  const fetchClassList = useCallback(async () => {
    if (!standard || !division) return;
    setLoading(true);
    setFetched(false);
    try {
      const res = await attendanceAPI.getClassAttendance(standard, division, date);
      const data = res.data?.data ?? [];
      // Support both roster array and { students: [] } format
      const rows = Array.isArray(data) ? data : (data.students ?? []);
      setStudents(rows.map((s: any) => ({ ...s, status: s.status ?? 'present' })));
      setFetched(true);
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to load class list' });
    } finally { setLoading(false); }
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
        text1: 'Attendance Saved!',
        text2: `${students.filter(s => s.status === 'present').length} present, ${students.filter(s => s.status === 'absent').length} absent`,
      });
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to save attendance' });
    } finally { setSaving(false); }
  };

  const presentCount  = students.filter(s => s.status === 'present').length;
  const absentCount   = students.filter(s => s.status === 'absent').length;

  return (
    <View style={styles.container}>
      {/* Toolbar */}
      <View style={styles.toolbar}>
        <View style={styles.pickerRow}>
          <View style={styles.pickerGroup}>
            <Text style={styles.pickerLabel}>Standard</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.pickerWrap}>
                {availableClasses.map(s => (
                  <TouchableOpacity
                    key={s} style={[styles.pickerBtn, standard === s && styles.pickerActive]}
                    onPress={() => setStandard(s)}
                  >
                    <Text style={[styles.pickerText, standard === s && styles.pickerActiveText]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
          <View style={styles.pickerGroup}>
            <Text style={styles.pickerLabel}>Division</Text>
            <View style={styles.pickerWrap}>
              {availableDivisions.map(d => (
                <TouchableOpacity
                  key={d} style={[styles.pickerBtn, division === d && styles.pickerActive]}
                  onPress={() => setDivision(d)}
                >
                  <Text style={[styles.pickerText, division === d && styles.pickerActiveText]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.loadBtn} onPress={fetchClassList}>
          <Text style={styles.loadBtnText}>Load Class</Text>
        </TouchableOpacity>
      </View>

      {/* Date display */}
      <View style={styles.dateBadge}>
        <Text style={styles.dateText}>📅 {new Date(date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : !fetched ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>📚</Text>
          <Text style={styles.emptyText}>Select standard & division,{'\n'}then tap "Load Class"</Text>
        </View>
      ) : students.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🎓</Text>
          <Text style={styles.emptyText}>No students found in this class</Text>
        </View>
      ) : (
        <>
          {/* Stats Bar */}
          <View style={styles.statsBar}>
            <View style={styles.stat}>
              <Text style={[styles.statNum, { color: COLORS.success }]}>{presentCount}</Text>
              <Text style={styles.statLabel}>Present</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statNum, { color: COLORS.danger }]}>{absentCount}</Text>
              <Text style={styles.statLabel}>Absent</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNum}>{students.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
          </View>

          {/* Bulk actions */}
          <View style={styles.bulkRow}>
            <Text style={styles.bulkLabel}>Mark All:</Text>
            {(['present','absent','leave'] as AttendanceStatus[]).map(s => (
              <TouchableOpacity
                key={s} onPress={() => setAll(s)}
                style={[styles.bulkBtn, { backgroundColor: STATUS_CONFIG[s].bg }]}
              >
                <Text style={styles.bulkBtnText}>{s.charAt(0).toUpperCase() + s.slice(1)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Student List */}
          <FlatList
            data={students}
            keyExtractor={item => String(item.id)}
            contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
            ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
            renderItem={({ item }) => {
              const cfg = STATUS_CONFIG[item.status];
              return (
                <TouchableOpacity style={styles.studentCard} onPress={() => toggleStatus(item.id)} activeOpacity={0.85}>
                  <View style={styles.rollBadge}>
                    <Text style={styles.rollText}>{item.roll_number}</Text>
                  </View>
                  <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>{item.full_name}</Text>
                    <Text style={styles.studentGr}>GR: {item.gr_number}</Text>
                  </View>
                  <View style={[styles.statusBtn, { backgroundColor: cfg.bg }]}>
                    <Text style={[styles.statusBtnText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />

          {/* Save Button */}
          <View style={styles.saveWrap}>
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={saveAttendance}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.saveBtnText}>💾 Save Attendance ({students.length} students)</Text>
              }
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  toolbar: { backgroundColor: COLORS.surface, padding: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  pickerRow: { gap: 10, marginBottom: 10 },
  pickerGroup: { gap: 6 },
  pickerLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'uppercase' },
  pickerWrap: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  pickerBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    backgroundColor: '#f3f4f6', borderWidth: 1.5, borderColor: COLORS.border,
  },
  pickerActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  pickerText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  pickerActiveText: { color: '#fff' },
  loadBtn: {
    backgroundColor: COLORS.primary, borderRadius: 10,
    paddingVertical: 10, alignItems: 'center',
  },
  loadBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  dateBadge: { backgroundColor: '#ede9fe', paddingHorizontal: 16, paddingVertical: 8 },
  dateText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },
  statsBar: { flexDirection: 'row', backgroundColor: COLORS.surface, padding: 12, gap: 0 },
  stat: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '500', marginTop: 2 },
  bulkRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 8, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border },
  bulkLabel: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600', marginRight: 4 },
  bulkBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
  bulkBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  studentCard: {
    backgroundColor: COLORS.surface, borderRadius: 10, padding: 12,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  rollBadge: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#ede9fe', alignItems: 'center', justifyContent: 'center',
  },
  rollText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  studentGr: { fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },
  statusBtn: {
    width: 44, height: 36, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  statusBtnText: { fontSize: 12, fontWeight: '800' },
  saveWrap: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, backgroundColor: COLORS.surface,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  saveBtn: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.65 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
