/**
 * VidyaSetu Mobile — Reports Screen (Admin/Principal)
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { api } from '../../services/api';

const REPORTS = [
  { icon: '🎓', label: 'Student Report',     endpoint: '/exports/students/excel',    color: '#4f46e5' },
  { icon: '💰', label: 'Fee Collection',     endpoint: '/exports/fees/excel',        color: '#059669' },
  { icon: '📅', label: 'Attendance Report',  endpoint: '/exports/attendance/excel',  color: '#d97706' },
  { icon: '📝', label: 'Marks Report',       endpoint: '/exports/marks/excel',       color: '#7c3aed' },
  { icon: '⚠️', label: 'Defaulters Report',  endpoint: '/exports/defaulters/excel',  color: '#dc2626' },
  { icon: '📚', label: 'Library Report',     endpoint: '/exports/library/excel',     color: '#0891b2' },
];

export default function ReportsScreen() {
  const [downloading, setDownloading] = useState<string | null>(null);

  const download = async (endpoint: string, label: string) => {
    setDownloading(endpoint);
    try {
      await api.get(endpoint, { params: { academic_year: '2025-2026' } });
      Alert.alert('✅ Ready', `${label} generated successfully.\nCheck your downloads.`);
    } catch {
      Alert.alert('❌ Error', 'Failed to generate report. Please try again.');
    } finally { setDownloading(null); }
  };

  return (
    <ScrollView style={s.page} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={s.heading}>📊 Reports & Exports</Text>
      <Text style={s.sub}>Generate Excel/PDF reports for the current academic year</Text>

      {REPORTS.map(r => (
        <TouchableOpacity
          key={r.endpoint}
          style={[s.card, { borderLeftColor: r.color }]}
          onPress={() => download(r.endpoint, r.label)}
          disabled={downloading === r.endpoint}
        >
          <Text style={s.cardIcon}>{r.icon}</Text>
          <View style={s.cardInfo}>
            <Text style={[s.cardLabel, { color: r.color }]}>{r.label}</Text>
            <Text style={s.cardSub}>Download as Excel</Text>
          </View>
          <Text style={s.arrow}>{downloading === r.endpoint ? '⏳' : '↓'}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f8fafc' },
  heading: { fontSize: 20, fontWeight: '900', color: '#1e293b', marginBottom: 4 },
  sub: { fontSize: 12, color: '#6b7280', marginBottom: 20 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', borderLeftWidth: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  cardIcon: { fontSize: 28, marginRight: 14 },
  cardInfo: { flex: 1 },
  cardLabel: { fontSize: 15, fontWeight: '800' },
  cardSub: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  arrow: { fontSize: 20, color: '#6b7280' },
});
