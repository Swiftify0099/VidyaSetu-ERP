/**
 * VidyaSetu Mobile — Fee Collection Screen (Accountant Tab)
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator,
} from 'react-native';
import { api } from '../../services/api';

interface StudentFee { student_id: number; full_name: string; gr_number: string; balance: number; }

export default function FeesScreen() {
  const [grInput, setGrInput] = useState('');
  const [student, setStudent] = useState<StudentFee | null>(null);
  const [amount, setAmount] = useState('');
  const [payMode, setPayMode] = useState('cash');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const PAYMENT_MODES = ['cash', 'upi', 'cheque', 'bank_transfer'];

  const searchStudent = useCallback(async () => {
    if (!grInput.trim()) return;
    setLoading(true);
    setStudent(null);
    try {
      const res = await api.get('/finance/student-balance', { params: { gr_number: grInput.trim() } });
      setStudent(res.data?.data);
    } catch {
      Alert.alert('❌ Not Found', 'No student found with this GR number.');
    } finally { setLoading(false); }
  }, [grInput]);

  const collectFee = async () => {
    if (!student || !amount) { Alert.alert('⚠️', 'Fill GR and amount'); return; }
    const amtNum = Number(amount);
    if (isNaN(amtNum) || amtNum <= 0) { Alert.alert('⚠️', 'Enter a valid amount'); return; }
    setSaving(true);
    try {
      await api.post('/finance/collect', {
        student_id: student.student_id,
        amount: amtNum,
        payment_mode: payMode,
        academic_year: '2025-2026',
      });
      Alert.alert('✅ Collected', `₹${amtNum.toLocaleString('en-IN')} collected from ${student.full_name}`);
      setGrInput(''); setStudent(null); setAmount('');
    } catch {
      Alert.alert('❌ Error', 'Failed to collect fee. Please retry.');
    } finally { setSaving(false); }
  };

  return (
    <ScrollView style={s.page} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
      <Text style={s.heading}>🧾 Fee Collection</Text>

      {/* GR Search */}
      <Text style={s.label}>Student GR Number</Text>
      <View style={s.searchRow}>
        <TextInput
          style={s.input}
          value={grInput}
          onChangeText={setGrInput}
          placeholder="Enter GR Number..."
          placeholderTextColor="#9ca3af"
          onSubmitEditing={searchStudent}
          autoCapitalize="characters"
        />
        <TouchableOpacity style={s.searchBtn} onPress={searchStudent} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.searchBtnText}>Search</Text>}
        </TouchableOpacity>
      </View>

      {/* Student Card */}
      {student && (
        <View style={s.studentCard}>
          <Text style={s.studentName}>{student.full_name}</Text>
          <Text style={s.studentGR}>GR: {student.gr_number}</Text>
          <View style={s.balanceRow}>
            <Text style={s.balanceLabel}>Outstanding Balance:</Text>
            <Text style={[s.balanceValue, { color: student.balance > 0 ? '#dc2626' : '#059669' }]}>
              ₹{student.balance.toLocaleString('en-IN')}
            </Text>
          </View>
        </View>
      )}

      {/* Amount */}
      {student && (
        <>
          <Text style={s.label}>Amount to Collect (₹)</Text>
          <TextInput
            style={s.input}
            value={amount}
            onChangeText={setAmount}
            placeholder="e.g. 5000"
            placeholderTextColor="#9ca3af"
            keyboardType="numeric"
          />

          {/* Payment Mode */}
          <Text style={s.label}>Payment Mode</Text>
          <View style={s.modeRow}>
            {PAYMENT_MODES.map(m => (
              <TouchableOpacity
                key={m}
                style={[s.modeBtn, payMode === m && s.modeBtnActive]}
                onPress={() => setPayMode(m)}
              >
                <Text style={[s.modeBtnText, payMode === m && s.modeBtnTextActive]}>
                  {m === 'cash' ? '💵' : m === 'upi' ? '📱' : m === 'cheque' ? '🏦' : '🔄'}  {m.replace('_', ' ').toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={s.collectBtn} onPress={collectFee} disabled={saving}>
            <Text style={s.collectBtnText}>{saving ? '⏳ Processing...' : `💰 Collect ₹${amount || '0'}`}</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f8fafc' },
  heading: { fontSize: 20, fontWeight: '900', color: '#1e293b', marginBottom: 20 },
  label: { fontSize: 12, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', marginBottom: 6, marginTop: 14 },
  searchRow: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, height: 48, borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 14, backgroundColor: '#fff', fontSize: 15, color: '#1e293b' },
  searchBtn: { backgroundColor: '#059669', borderRadius: 12, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  searchBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  studentCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginTop: 14, borderWidth: 1.5, borderColor: '#059669', shadowColor: '#059669', shadowOpacity: 0.1, shadowRadius: 8, elevation: 2 },
  studentName: { fontSize: 17, fontWeight: '900', color: '#1e293b' },
  studentGR: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  balanceLabel: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  balanceValue: { fontSize: 22, fontWeight: '900' },
  modeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  modeBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1.5, borderColor: '#e2e8f0' },
  modeBtnActive: { backgroundColor: '#059669', borderColor: '#059669' },
  modeBtnText: { fontSize: 11, fontWeight: '700', color: '#6b7280' },
  modeBtnTextActive: { color: '#fff' },
  collectBtn: { backgroundColor: '#059669', borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 24 },
  collectBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
});
