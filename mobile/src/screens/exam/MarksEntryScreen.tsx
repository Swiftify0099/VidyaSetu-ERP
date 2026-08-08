/**
 * VidyaSetu Mobile — Marks Entry Screen
 * Teacher enters marks for a given exam schedule.
 * Accessible to: teacher, class_teacher, admin, principal
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from '../../theme/ThemeContext';
import { examAPI } from '../../services/api';
import { spacing, radius, typography, shadows } from '../../theme';
import { getGrade, GRADES } from '../../config/constants';
import Toast from 'react-native-toast-message';

interface StudentMark {
  student_id: number;
  full_name: string;
  gr_number: string;
  roll_number: number;
  marks_obtained: string;
  is_absent: boolean;
}

export default function MarksEntryScreen({ route, navigation }: { route: any; navigation: any }) {
  const { colors } = useTheme();
  const { examId, exam } = route.params ?? {};
  const [students, setStudents] = useState<StudentMark[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchMarks = useCallback(async () => {
    if (!examId) { setLoading(false); return; }
    try {
      const res = await examAPI.getMarks(examId, {});
      const data = res.data?.data ?? [];
      setStudents(
        data.map((s: any) => ({
          ...s,
          marks_obtained: s.marks_obtained != null ? String(s.marks_obtained) : '',
          is_absent: s.is_absent ?? false,
        }))
      );
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to load student marks' });
    } finally {
      setLoading(false);
    }
  }, [examId]);

  useEffect(() => { fetchMarks(); }, [fetchMarks]);

  const updateMark = (studentId: number, value: string) => {
    setStudents(prev => prev.map(s =>
      s.student_id === studentId ? { ...s, marks_obtained: value } : s
    ));
  };

  const toggleAbsent = (studentId: number) => {
    setStudents(prev => prev.map(s =>
      s.student_id === studentId ? { ...s, is_absent: !s.is_absent, marks_obtained: !s.is_absent ? '' : s.marks_obtained } : s
    ));
  };

  const saveMarks = async () => {
    const maxMarks = exam?.total_marks ?? 100;
    const invalids = students.filter(s =>
      !s.is_absent && s.marks_obtained !== '' && (isNaN(Number(s.marks_obtained)) || Number(s.marks_obtained) < 0 || Number(s.marks_obtained) > maxMarks)
    );
    if (invalids.length > 0) {
      Alert.alert('Validation Error', `Marks must be between 0 and ${maxMarks}. Check: ${invalids.map(s => s.full_name).join(', ')}`);
      return;
    }
    setSaving(true);
    try {
      const records = students.map(s => ({
        student_id:     s.student_id,
        marks_obtained: s.is_absent ? null : (s.marks_obtained === '' ? null : Number(s.marks_obtained)),
        is_absent:      s.is_absent,
      }));
      await examAPI.submitMarks(examId, { marks: records });
      Toast.show({ type: 'success', text1: 'Marks saved successfully!', text2: `${students.length} records updated` });
      navigation.goBack();
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e?.response?.data?.detail ?? 'Failed to save marks' });
    } finally {
      setSaving(false);
    }
  };

  const maxMarks = exam?.total_marks ?? 100;
  const passingMarks = exam?.passing_marks ?? 35;

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[s.loadingText, { color: colors.textSecondary }]}>Loading students...</Text>
      </View>
    );
  }

  if (!examId) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <Text style={s.emptyIcon}>📋</Text>
        <Text style={[s.emptyText, { color: colors.textSecondary }]}>No exam selected</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[s.backBtn, { backgroundColor: colors.primaryBg }]}>
          <Text style={[s.backBtnText, { color: colors.primary }]}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const entered = students.filter(s => !s.is_absent && s.marks_obtained !== '').length;
  const absent  = students.filter(s => s.is_absent).length;

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      {/* Header Info */}
      {exam && (
        <View style={[s.examInfo, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Text style={[s.examTitle, { color: colors.text }]}>{exam.subject_name}</Text>
          <Text style={[s.examMeta, { color: colors.textSecondary }]}>
            {exam.exam_type_name} • Std {exam.standard}-{exam.division} • Max: {maxMarks} • Pass: {passingMarks}
          </Text>
          <View style={s.statsRow}>
            <Text style={[s.stat, { color: colors.success }]}>✅ Entered: {entered}</Text>
            <Text style={[s.stat, { color: colors.danger }]}>❌ Absent: {absent}</Text>
            <Text style={[s.stat, { color: colors.textSecondary }]}>📋 Total: {students.length}</Text>
          </View>
        </View>
      )}

      <FlatList
        data={students}
        keyExtractor={item => String(item.student_id)}
        contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
        ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
        renderItem={({ item }) => {
          const numMark = Number(item.marks_obtained);
          const grade = !item.is_absent && item.marks_obtained !== '' ? getGrade((numMark / maxMarks) * 100) : null;
          const gradeInfo = grade ? GRADES[grade] : null;
          const isPassing = grade ? (numMark >= passingMarks) : null;

          return (
            <View style={[
              s.studentCard,
              { backgroundColor: colors.surface, ...shadows.sm },
              item.is_absent && { opacity: 0.65 },
            ]}>
              <View style={[s.rollBadge, { backgroundColor: colors.primaryBg }]}>
                <Text style={[s.rollText, { color: colors.primary }]}>{item.roll_number}</Text>
              </View>
              <View style={s.studentInfo}>
                <Text style={[s.studentName, { color: colors.text }]}>{item.full_name}</Text>
                <Text style={[s.studentGr, { color: colors.textSecondary }]}>GR: {item.gr_number}</Text>
              </View>
              {item.is_absent ? (
                <View style={[s.absentTag, { backgroundColor: colors.dangerBg }]}>
                  <Text style={[s.absentText, { color: colors.danger }]}>ABSENT</Text>
                </View>
              ) : (
                <View style={s.marksInputWrap}>
                  <TextInput
                    style={[
                      s.marksInput,
                      { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text },
                      gradeInfo && { borderColor: gradeInfo.color },
                    ]}
                    value={item.marks_obtained}
                    onChangeText={v => updateMark(item.student_id, v)}
                    keyboardType="numeric"
                    placeholder={`/${maxMarks}`}
                    placeholderTextColor={colors.placeholder}
                    maxLength={4}
                  />
                  {gradeInfo && (
                    <Text style={[s.gradeLabel, { color: gradeInfo.color }]}>{grade}</Text>
                  )}
                </View>
              )}
              <TouchableOpacity
                style={[s.absentBtn, { backgroundColor: item.is_absent ? colors.danger : colors.surfaceAlt }]}
                onPress={() => toggleAbsent(item.student_id)}
              >
                <Icon name={item.is_absent ? 'undo' : 'user-times'} size={14} color={item.is_absent ? '#fff' : colors.textSecondary} solid />
              </TouchableOpacity>
            </View>
          );
        }}
      />

      {/* Save Button */}
      <View style={[s.saveWrap, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[s.saveBtn, { backgroundColor: colors.primary }, saving && { opacity: 0.7 }]}
          onPress={saveMarks}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={s.saveBtnText}>💾 Save Marks ({students.length} students)</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: typography.size.base },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: typography.size.base },
  backBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: radius.full, marginTop: 8 },
  backBtnText: { fontWeight: typography.weight.semibold },
  examInfo: {
    padding: spacing.base, borderBottomWidth: 1,
  },
  examTitle: { fontSize: typography.size.lg, fontWeight: typography.weight.bold },
  examMeta: { fontSize: typography.size.sm, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: spacing.base, marginTop: 8 },
  stat: { fontSize: typography.size.sm, fontWeight: typography.weight.semibold },
  studentCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: radius.md, padding: 10,
  },
  rollBadge: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  rollText: { fontSize: typography.size.sm, fontWeight: typography.weight.bold },
  studentInfo: { flex: 1 },
  studentName: { fontSize: typography.size.base, fontWeight: typography.weight.semibold },
  studentGr: { fontSize: typography.size.xs, marginTop: 1 },
  marksInputWrap: { alignItems: 'center', gap: 2 },
  marksInput: {
    width: 64, height: 40, borderWidth: 1.5,
    borderRadius: radius.sm, textAlign: 'center',
    fontSize: typography.size.base, fontWeight: typography.weight.bold,
  },
  gradeLabel: { fontSize: typography.size.xs, fontWeight: typography.weight.bold },
  absentTag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.sm },
  absentText: { fontSize: typography.size.xs, fontWeight: typography.weight.bold },
  absentBtn: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },
  saveWrap: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, borderTopWidth: 1,
  },
  saveBtn: {
    borderRadius: radius.md, paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: typography.size.base, fontWeight: typography.weight.bold },
});
