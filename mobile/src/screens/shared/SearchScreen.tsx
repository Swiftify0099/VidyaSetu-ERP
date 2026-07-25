/**
 * VidyaSetu Mobile — Global Search Screen
 */
import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { api } from '../../services/api';

interface SearchResult { type: string; id: number; label: string; sub?: string; }

const TYPE_ICONS: Record<string, string> = { student: '🎓', teacher: '👨‍🏫', fee: '💰', book: '📚', notice: '📢' };

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (q: string) => {
    if (!q || q.length < 2) { setResults([]); setLoading(false); return; }
    try {
      const res = await api.get('/search', { params: { q } });
      const d = res.data?.data ?? {};
      const flat: SearchResult[] = [
        ...(d.students ?? []).map((s: { id: number; full_name: string; gr_number: string }) => ({ type: 'student', id: s.id, label: s.full_name, sub: `GR: ${s.gr_number}` })),
        ...(d.teachers ?? []).map((t: { id: number; full_name: string; employee_id: string }) => ({ type: 'teacher', id: t.id, label: t.full_name, sub: `EMP: ${t.employee_id}` })),
        ...(d.notices  ?? []).map((n: { id: number; title: string; type: string }) => ({ type: 'notice',  id: n.id, label: n.title, sub: n.type })),
      ];
      setResults(flat);
    } catch { setResults([]); }
    finally { setLoading(false); }
  }, []);

  const onChange = (t: string) => {
    setQuery(t);
    if (timerRef.current) clearTimeout(timerRef.current);
    setLoading(true);
    timerRef.current = setTimeout(() => doSearch(t), 400);
  };

  return (
    <View style={s.page}>
      <View style={s.searchBar}>
        <Text style={s.searchIcon}>🔍</Text>
        <TextInput
          style={s.input}
          placeholder="Search students, teachers, books..."
          placeholderTextColor="#9ca3af"
          value={query}
          onChangeText={onChange}
          autoFocus
        />
        {loading && <ActivityIndicator color="#4f46e5" size="small" style={{ marginRight: 10 }} />}
        {query ? <TouchableOpacity onPress={() => { setQuery(''); setResults([]); }}><Text style={s.clear}>✕</Text></TouchableOpacity> : null}
      </View>

      <FlatList
        data={results}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={{ padding: 12 }}
        ListEmptyComponent={
          query.length >= 2 && !loading ? (
            <View style={s.center}><Text style={{ fontSize: 36 }}>🔍</Text><Text style={s.emptyText}>No results for "{query}"</Text></View>
          ) : query.length === 0 ? (
            <View style={s.center}><Text style={{ fontSize: 48 }}>🔎</Text><Text style={s.emptyText}>Type to search...</Text></View>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={s.result}>
            <View style={s.resultIcon}><Text style={{ fontSize: 20 }}>{TYPE_ICONS[item.type] ?? '📄'}</Text></View>
            <View style={s.resultInfo}>
              <Text style={s.resultLabel}>{item.label}</Text>
              {item.sub && <Text style={s.resultSub}>{item.sub}</Text>}
            </View>
            <Text style={s.arrow}>›</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f8fafc' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 12, borderRadius: 14, paddingHorizontal: 14, borderWidth: 1.5, borderColor: '#4f46e5', shadowColor: '#4f46e5', shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  searchIcon: { fontSize: 16, marginRight: 8 },
  input: { flex: 1, height: 48, color: '#1e293b', fontSize: 15 },
  clear: { fontSize: 16, color: '#6b7280', marginLeft: 6, marginRight: 4 },
  center: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: '#6b7280', marginTop: 12 },
  result: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 6, gap: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  resultIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  resultInfo: { flex: 1 },
  resultLabel: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  resultSub: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  arrow: { fontSize: 22, color: '#d1d5db' },
});
