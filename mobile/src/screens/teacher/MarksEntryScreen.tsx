/**
 * VidyaSetu Mobile — Marks Entry Screen
 * =======================================
 * For: Teacher, Class Teacher, Exam Coordinator
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { api } from '../../services/api';

const STANDARDS = ['1','2','3','4','5','6','7','8','9','10','11','12'];
const DIVISIONS = ['A','B','C','D'];

interface Student { id: number; full_name: string; gr_number: string; marks?: string; }
interface Exam { id: number; name: string; subject: string; max_marks: number; }

export default function MarksEntryScreen() {
  const [standard, setStandard] = useState('8');
  const [division, setDivision] = useState('A');
  const [exam, setExam] = useState<Exam | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [marks, setMarks] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadExams = useCallback(async () => {
    try {
      const res = await api.get('/exams', { params: { standard, is_active: true } });
      setExams(res.data?.data?.items ?? []);
    } catch { setExams([]); }
  }, [standard]);

  const loadStudents = useCallback(async () => {
    if (!exam) return;
    setLoading(true);
    try {
      const res = await api.get('/students', { params: { standard, division, academic_year: '2025-2026', per_page: 60 } });
      setStudents(res.data?.data?.items ?? []);
    } catch { setStudents([]); }
    finally { setLoading(false); }
  }, [exam, standard, division]);

  const saveMarks = async () => {
    if (!exam || students.length === 0) return;
    setSaving(true);
    try {
      const payload = students.map(s => ({
        student_id: s.id,
        exam_id: exam.id,
        marks_obtained: Number(marks[s.id] ?? 0),
        is_absent: marks[s.id] === 'AB',
      }));
      await api.post('/exams/marks/bulk', { marks: payload });
      Alert.alert('✅ Saved', 'Marks saved successfully!');
    } catch {
      Alert.alert('❌ Error', 'Failed to save marks. Please retry.');
    } finally { setSaving(false); }
  };

  return (
    <View style={s.page}>
      {/* Filters */}
      <View style={s.filtersBox}>
        <View style={s.pickerWrap}>
          <Text style={s.filterLabel}>Standard</Text>
          <Picker selectedValue={standard} onValueChange={setStandard} style={s.picker}>
            {STANDARDS.map(st => <Picker.Item key={st} label={`Std ${st}`} value={st} />)}
          </Picker>
        </View>
        <View style={s.pickerWrap}>
          <Text style={s.filterLabel}>Division</Text>
          <Picker selectedValue={division} onValueChange={setDivision} style={s.picker}>
            {DIVISIONS.map(d => <Picker.Item key={d} label={d} value={d} />)}
          </Picker>
        </View>
        <TouchableOpacity style={s.fetchBtn} onPress={() => { loadExams(); loadStudents(); }}>
          <Text style={s.fetchBtnText}>Load</Text>
        </TouchableOpacity>
      </View>

      {/* Exam selector */}
      {exams.length > 0 && (
        <View style={s.examRow}>
          {exams.map(e => (
            <TouchableOpacity
              key={e.id}
              style={[s.examChip, exam?.id === e.id && s.examChipActive]}
              onPress={() => setExam(e)}
            >
              <Text style={[s.examChipText, exam?.id === e.id && s.examChipTextActive]}>
                {e.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {loading ? (
        <View style={s.center}><ActivityIndicator color="#4f46e5" size="large" /></View>
      ) : (
        <FlatList
          data={students}
          keyExtractor={i => String(i.id)}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={<View style={s.center}><Text style={s.emptyText}>Select standard, division and exam to load students</Text></View>}
          renderItem={({ item, index }) => (
            <View style={s.row}>
              <Text style={s.rowNum}>{index + 1}.</Text>
              <View style={s.rowInfo}>
                <Text style={s.rowName}>{item.full_name}</Text>
                <Text style={s.rowGR}>GR: {item.gr_number}</Text>
              </View>
              <TextInput
                style={s.marksInput}
                value={marks[item.id] ?? ''}
                onChangeText={t => setMarks(prev => ({ ...prev, [item.id]: t }))}
                placeholder={exam ? `/${exam.max_marks}` : '--'}
                placeholderTextColor="#9ca3af"
                keyboardType="default"
                maxLength={4}
              />
            </View>
          )}
        />
      )}

      {/* Save Button */}
      {students.length > 0 && (
        <View style={s.saveBar}>
          <TouchableOpacity style={s.saveBtn} onPress={saveMarks} disabled={saving}>
            <Text style={s.saveBtnText}>{saving ? '⏳ Saving...' : '💾 Save All Marks'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  filtersBox: { flexDirection: 'row', backgroundColor: '#fff', padding: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', alignItems: 'flex-end' },
  pickerWrap: { flex: 1 },
  filterLabel: { fontSize: 10, fontWeight: '700', color: '#6b7280', marginBottom: 2 },
  picker: { height: 44 },
  fetchBtn: { backgroundColor: '#4f46e5', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  fetchBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  examRow: { flexDirection: 'row', flexWrap: 'wrap', padding: 10, gap: 6 },
  examChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1.5, borderColor: '#e2e8f0' },
  examChipActive: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  examChipText: { fontSize: 12, fontWeight: '700', color: '#6b7280' },
  examChipTextActive: { color: '#fff' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 10, marginBottom: 6, borderRadius: 10, padding: 12, gap: 10 },
  rowNum: { fontSize: 13, color: '#6b7280', width: 24, fontWeight: '700' },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 13, fontWeight: '700', color: '#1e293b' },
  rowGR: { fontSize: 11, color: '#6b7280' },
  marksInput: { width: 60, height: 38, borderWidth: 1.5, borderColor: '#4f46e5', borderRadius: 8, textAlign: 'center', fontSize: 15, fontWeight: '800', color: '#1e293b' },
  emptyText: { color: '#6b7280', fontSize: 13, textAlign: 'center' },
  saveBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', padding: 14, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  saveBtn: { backgroundColor: '#4f46e5', borderRadius: 14, padding: 16, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '900', fontSize: 15 },
});
