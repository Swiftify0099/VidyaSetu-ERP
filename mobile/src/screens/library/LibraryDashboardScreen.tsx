/**
 * VidyaSetu Mobile — Library Dashboard Screen (Librarian)
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, FlatList, RefreshControl,
  TextInput, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { api } from '../../services/api';

interface Book { id: number; title: string; author: string; accession_number: string; is_available: boolean; }
interface IssuedBook { id: number; book_title: string; member_name: string; issue_date: string; due_date: string; is_overdue: boolean; }

export default function LibraryDashboardScreen() {
  const [books, setBooks] = useState<Book[]>([]);
  const [issued, setIssued] = useState<IssuedBook[]>([]);
  const [stats, setStats] = useState({ total: 0, available: 0, issued: 0, overdue: 0 });
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'books' | 'issued'>('books');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [booksRes, issuedRes, statsRes] = await Promise.allSettled([
        api.get('/library/books', { params: { search: search || undefined, per_page: 20 } }),
        api.get('/library/issued', { params: { per_page: 20 } }),
        api.get('/library/stats'),
      ]);
      if (booksRes.status === 'fulfilled')  setBooks(booksRes.value.data?.data?.items ?? []);
      if (issuedRes.status === 'fulfilled') setIssued(issuedRes.value.data?.data?.items ?? []);
      if (statsRes.status === 'fulfilled') {
        const d = statsRes.value.data?.data;
        setStats({ total: d?.total_books ?? 0, available: d?.available_books ?? 0, issued: d?.issued_books ?? 0, overdue: d?.overdue_books ?? 0 });
      }
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const returnBook = async (id: number) => {
    try {
      await api.post(`/library/return/${id}`);
      Alert.alert('✅ Returned', 'Book returned successfully!');
      load();
    } catch { Alert.alert('❌ Error', 'Failed to process return.'); }
  };

  if (loading) return <View style={s.center}><ActivityIndicator color="#d97706" size="large" /></View>;

  return (
    <View style={s.page}>
      {/* Stats */}
      <View style={s.statsBar}>
        {[
          { label: 'Total', value: stats.total, color: '#4f46e5' },
          { label: 'Available', value: stats.available, color: '#059669' },
          { label: 'Issued', value: stats.issued, color: '#d97706' },
          { label: 'Overdue', value: stats.overdue, color: '#dc2626' },
        ].map((s2, i) => (
          <View key={i} style={s.statItem}>
            <Text style={[s.statValue, { color: s2.color }]}>{s2.value}</Text>
            <Text style={s.statLabel}>{s2.label}</Text>
          </View>
        ))}
      </View>

      {/* Tabs */}
      <View style={s.tabRow}>
        {(['books', 'issued'] as const).map(t => (
          <TouchableOpacity key={t} style={[s.tabBtn, tab === t && s.tabBtnActive]} onPress={() => setTab(t)}>
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>
              {t === 'books' ? '📚 Books' : '📤 Issued'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'books' ? (
        <>
          <View style={s.searchRow}>
            <Text style={s.searchIcon}>🔍</Text>
            <TextInput style={s.search} placeholder="Search by title or author..." placeholderTextColor="#9ca3af" value={search} onChangeText={setSearch} />
          </View>
          <FlatList
            data={books}
            keyExtractor={b => String(b.id)}
            contentContainerStyle={{ padding: 10, paddingBottom: 30 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
            renderItem={({ item }) => (
              <View style={s.bookCard}>
                <View style={[s.bookAvail, { backgroundColor: item.is_available ? '#d1fae5' : '#fee2e2' }]}>
                  <Text style={{ fontSize: 20 }}>{item.is_available ? '✅' : '📤'}</Text>
                </View>
                <View style={s.bookInfo}>
                  <Text style={s.bookTitle}>{item.title}</Text>
                  <Text style={s.bookAuthor}>{item.author}</Text>
                  <Text style={s.accNum}>Acc: {item.accession_number}</Text>
                </View>
              </View>
            )}
            ListEmptyComponent={<View style={s.center}><Text style={s.emptyText}>No books found</Text></View>}
          />
        </>
      ) : (
        <FlatList
          data={issued}
          keyExtractor={b => String(b.id)}
          contentContainerStyle={{ padding: 10, paddingBottom: 30 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
          renderItem={({ item }) => (
            <View style={[s.issuedCard, item.is_overdue && s.overdueCard]}>
              {item.is_overdue && <View style={s.overdueTag}><Text style={s.overdueTagText}>OVERDUE</Text></View>}
              <Text style={s.issuedBook}>{item.book_title}</Text>
              <Text style={s.issuedMember}>👤 {item.member_name}</Text>
              <View style={s.issuedDates}>
                <Text style={s.issuedDate}>Issued: {item.issue_date}</Text>
                <Text style={[s.issuedDate, item.is_overdue && { color: '#dc2626', fontWeight: '800' }]}>Due: {item.due_date}</Text>
              </View>
              <TouchableOpacity style={s.returnBtn} onPress={() => returnBook(item.id)}>
                <Text style={s.returnBtnText}>↩ Return Book</Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={<View style={s.center}><Text style={s.emptyText}>No issued books</Text></View>}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
  statsBar: { backgroundColor: '#d97706', flexDirection: 'row', padding: 16, justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '900' },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  tabRow: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tabBtn: { flex: 1, padding: 12, alignItems: 'center' },
  tabBtnActive: { borderBottomWidth: 2.5, borderBottomColor: '#d97706' },
  tabText: { fontSize: 13, fontWeight: '700', color: '#6b7280' },
  tabTextActive: { color: '#d97706' },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 10, borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  searchIcon: { fontSize: 15, marginRight: 6 },
  search: { flex: 1, height: 40, color: '#1e293b', fontSize: 13 },
  bookCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 6, gap: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  bookAvail: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  bookInfo: { flex: 1 },
  bookTitle: { fontSize: 13, fontWeight: '800', color: '#1e293b' },
  bookAuthor: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  accNum: { fontSize: 10, color: '#9ca3af', marginTop: 2 },
  issuedCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  overdueCard: { borderWidth: 1.5, borderColor: '#fca5a5', backgroundColor: '#fff7f7' },
  overdueTag: { backgroundColor: '#dc2626', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start', marginBottom: 8 },
  overdueTagText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  issuedBook: { fontSize: 14, fontWeight: '800', color: '#1e293b' },
  issuedMember: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  issuedDates: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  issuedDate: { fontSize: 11, color: '#6b7280', fontWeight: '600' },
  returnBtn: { marginTop: 10, backgroundColor: '#d97706', borderRadius: 8, padding: 8, alignItems: 'center' },
  returnBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  emptyText: { color: '#6b7280', fontSize: 13 },
});
