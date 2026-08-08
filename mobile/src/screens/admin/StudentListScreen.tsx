/**
 * VidyaSetu Mobile — Student List Screen
 * ========================================
 * For: Admin, Principal, Clerk, Teacher, Class Teacher
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, RefreshControl, Dimensions,
} from 'react-native';
import { api } from '../../services/api';

const { width } = Dimensions.get('window');

interface Student {
  id: number;
  full_name: string;
  gr_number: string;
  standard: string;
  division: string;
  roll_number: number;
  is_active: boolean;
}

export default function StudentListScreen() {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);

  const loadStudents = useCallback(async () => {
    try {
      const res = await api.get('/students', { params: { search: search || undefined, page, per_page: 20, academic_year: '2025-2026' } });
      setStudents(res.data?.data?.items ?? []);
    } catch { setStudents([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, [search, page]);

  useEffect(() => { loadStudents(); }, [loadStudents]);

  const onRefresh = () => { setRefreshing(true); loadStudents(); };

  const renderItem = ({ item }: { item: Student }) => (
    <TouchableOpacity style={s.card}>
      <View style={s.avatar}>
        <Text style={s.avatarText}>{item.full_name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={s.info}>
        <Text style={s.name}>{item.full_name}</Text>
        <Text style={s.meta}>GR: {item.gr_number} | Std {item.standard}-{item.division} | Roll {item.roll_number}</Text>
      </View>
      <View style={[s.activeBadge, { backgroundColor: item.is_active ? '#d1fae5' : '#fee2e2' }]}>
        <Text style={[s.activeBadgeText, { color: item.is_active ? '#059669' : '#dc2626' }]}>
          {item.is_active ? '✓' : '✗'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={s.page}>
      {/* Search */}
      <View style={s.searchRow}>
        <Text style={s.searchIcon}>🔍</Text>
        <TextInput
          style={s.search}
          placeholder="Search by name or GR number..."
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={t => { setSearch(t); setPage(1); }}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={{ fontSize: 16, color: '#6b7280', marginRight: 8 }}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color="#4f46e5" size="large" /></View>
      ) : (
        <FlatList
          data={students}
          keyExtractor={i => String(i.id)}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={
            <View style={s.center}>
              <Text style={{ fontSize: 40 }}>🎓</Text>
              <Text style={s.emptyText}>No students found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 12, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1.5, borderColor: '#e2e8f0' },
  searchIcon: { fontSize: 16, marginRight: 8 },
  search: { flex: 1, height: 44, color: '#1e293b', fontSize: 14 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 8, padding: 14, borderRadius: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 18 },
  info: { flex: 1, marginLeft: 12 },
  name: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  meta: { fontSize: 11, color: '#6b7280', marginTop: 3 },
  activeBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  activeBadgeText: { fontSize: 13, fontWeight: '800' },
  emptyText: { fontSize: 14, color: '#6b7280', marginTop: 12, fontWeight: '600' },
});
