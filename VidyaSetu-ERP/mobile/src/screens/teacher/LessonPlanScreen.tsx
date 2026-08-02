/**
 * VidyaSetu Mobile — Lesson Plan Screen
 * ========================================
 * For: Teacher, Class Teacher
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { api } from '../../services/api';

interface LessonPlan {
  id: number;
  plan_date: string;
  standard: string;
  division: string;
  subject: string;
  chapter_name: string;
  topic: string;
  status: string;
}

const STATUS_COLOR: Record<string, string> = { draft: '#6b7280', submitted: '#2563eb', approved: '#059669', rejected: '#dc2626' };

export default function LessonPlanScreen() {
  const [plans, setPlans] = useState<LessonPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    plan_date: new Date().toISOString().split('T')[0],
    standard: '8', division: 'A', subject: '', chapter_name: '', topic: '',
    learning_objectives: '', teaching_aids: '', homework: '', academic_year: '2025-2026', period_number: '1',
  });

  const loadPlans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/lesson-plans', { params: { page: 1, per_page: 20 } });
      setPlans(res.data?.data?.items ?? []);
    } catch { setPlans([]); }
    finally { setLoading(false); }
  }, []);

  React.useEffect(() => { loadPlans(); }, [loadPlans]);

  const savePlan = async () => {
    if (!form.subject || !form.chapter_name || !form.topic) {
      Alert.alert('⚠️ Required', 'Please fill Subject, Chapter and Topic.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/lesson-plans', { ...form, period_number: Number(form.period_number) });
      Alert.alert('✅ Saved', 'Lesson plan saved!');
      setShowModal(false);
      loadPlans();
    } catch { Alert.alert('❌ Error', 'Failed to save lesson plan.'); }
    finally { setSaving(false); }
  };

  return (
    <View style={s.page}>
      {/* Header */}
      <View style={s.topBar}>
        <Text style={s.topBarTitle}>📖 Lesson Plans</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowModal(true)}>
          <Text style={s.addBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color="#4f46e5" size="large" /></View>
      ) : (
        <FlatList
          data={plans}
          keyExtractor={i => String(i.id)}
          contentContainerStyle={{ padding: 12, paddingBottom: 30 }}
          onRefresh={loadPlans}
          refreshing={loading}
          ListEmptyComponent={
            <View style={s.center}>
              <Text style={{ fontSize: 40 }}>📖</Text>
              <Text style={s.emptyText}>No lesson plans yet{'\n'}Tap + New to create one</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={s.card}>
              <View style={s.cardHeader}>
                <Text style={s.cardDate}>{item.plan_date}</Text>
                <View style={[s.badge, { backgroundColor: STATUS_COLOR[item.status] + '20' }]}>
                  <Text style={[s.badgeText, { color: STATUS_COLOR[item.status] }]}>{item.status}</Text>
                </View>
              </View>
              <Text style={s.cardSubject}>{item.subject} — {item.chapter_name}</Text>
              <Text style={s.cardTopic}>{item.topic}</Text>
              <Text style={s.cardClass}>Std {item.standard}-{item.division}</Text>
            </View>
          )}
        />
      )}

      {/* Add Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>New Lesson Plan</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Text style={s.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={s.form}>
            {[
              { key: 'plan_date',           label: 'Date',           placeholder: 'YYYY-MM-DD' },
              { key: 'standard',            label: 'Standard',       placeholder: 'e.g. 8' },
              { key: 'division',            label: 'Division',       placeholder: 'e.g. A' },
              { key: 'subject',             label: 'Subject *',      placeholder: 'Mathematics' },
              { key: 'chapter_name',        label: 'Chapter *',      placeholder: 'Linear Equations' },
              { key: 'topic',               label: 'Topic *',        placeholder: 'Solving one-variable' },
              { key: 'learning_objectives', label: 'Objectives',     placeholder: 'What students will learn' },
              { key: 'teaching_aids',       label: 'Teaching Aids',  placeholder: 'Blackboard, Charts' },
              { key: 'homework',            label: 'Homework',       placeholder: 'Exercise 3.1' },
              { key: 'period_number',       label: 'Period No.',     placeholder: '1' },
            ].map(f => (
              <View key={f.key} style={s.fieldGroup}>
                <Text style={s.fieldLabel}>{f.label}</Text>
                <TextInput
                  style={s.fieldInput}
                  value={(form as Record<string, string>)[f.key]}
                  onChangeText={t => setForm(prev => ({ ...prev, [f.key]: t }))}
                  placeholder={f.placeholder}
                  placeholderTextColor="#9ca3af"
                />
              </View>
            ))}
            <TouchableOpacity style={s.saveBtn} onPress={savePlan} disabled={saving}>
              <Text style={s.saveBtnText}>{saving ? '⏳ Saving...' : '💾 Save Lesson Plan'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', padding: 14, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  topBarTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
  addBtn: { backgroundColor: '#4f46e5', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardDate: { fontSize: 12, color: '#6b7280', fontFamily: 'monospace' },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  cardSubject: { fontSize: 14, fontWeight: '800', color: '#1e293b' },
  cardTopic: { fontSize: 12, color: '#6b7280', marginTop: 3 },
  cardClass: { fontSize: 11, color: '#4f46e5', fontWeight: '700', marginTop: 6 },
  emptyText: { fontSize: 13, color: '#6b7280', textAlign: 'center', marginTop: 12 },
  modal: { flex: 1, backgroundColor: '#f8fafc' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  modalTitle: { fontSize: 17, fontWeight: '900', color: '#1e293b' },
  closeBtn: { fontSize: 20, color: '#6b7280' },
  form: { padding: 16, paddingBottom: 40 },
  fieldGroup: { marginBottom: 14 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#6b7280', marginBottom: 4, textTransform: 'uppercase' },
  fieldInput: { height: 42, borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12, backgroundColor: '#fff', fontSize: 14, color: '#1e293b' },
  saveBtn: { backgroundColor: '#4f46e5', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: '#fff', fontWeight: '900', fontSize: 15 },
});
