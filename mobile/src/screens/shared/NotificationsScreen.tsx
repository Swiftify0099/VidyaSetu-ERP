/**
 * VidyaSetu Mobile — Shared Notifications Screen
 * ================================================
 * All roles can see notices/announcements filtered by their permissions
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { api } from '../../services/api';

interface Notice { id: number; title: string; body: string; type: string; priority: string; created_at: string; is_read?: boolean; }

const TYPE_CONFIG: Record<string, { icon: string; color: string }> = {
  announcement: { icon: '📢', color: '#4f46e5' },
  circular:     { icon: '📋', color: '#0891b2' },
  event:        { icon: '🎉', color: '#059669' },
  exam:         { icon: '📝', color: '#7c3aed' },
  holiday:      { icon: '🎊', color: '#d97706' },
  urgent:       { icon: '🚨', color: '#dc2626' },
};

export default function NotificationsScreen() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/communication/notices', { params: { page: 1, per_page: 30 } });
      setNotices(res.data?.data?.items ?? []);
    } catch { setNotices([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const markRead = async (id: number) => {
    try {
      await api.patch(`/communication/notices/${id}/read`);
      setNotices(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch { /* ignore */ }
  };

  if (loading) return <View style={s.center}><ActivityIndicator color="#4f46e5" size="large" /></View>;

  return (
    <View style={s.page}>
      <FlatList
        data={notices}
        keyExtractor={i => String(i.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#4f46e5" />}
        contentContainerStyle={{ padding: 12 }}
        ListEmptyComponent={<View style={s.center}><Text style={{ fontSize: 40 }}>🔔</Text><Text style={s.emptyText}>No notices yet</Text></View>}
        renderItem={({ item }) => {
          const cfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.announcement;
          return (
            <TouchableOpacity style={[s.card, !item.is_read && s.unread]} onPress={() => markRead(item.id)}>
              <View style={[s.iconBox, { backgroundColor: cfg.color + '18' }]}>
                <Text style={{ fontSize: 20 }}>{cfg.icon}</Text>
              </View>
              <View style={s.cardBody}>
                <View style={s.cardHeader}>
                  <Text style={[s.noticeTitle, !item.is_read && { color: '#1e293b', fontWeight: '800' }]} numberOfLines={2}>{item.title}</Text>
                  {!item.is_read && <View style={s.dot} />}
                </View>
                <Text style={s.noticeBody} numberOfLines={2}>{item.body}</Text>
                <Text style={s.dateText}>{new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  card: { flexDirection: 'row', gap: 12, backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  unread: { borderLeftWidth: 4, borderLeftColor: '#4f46e5', backgroundColor: '#f0f4ff' },
  iconBox: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardBody: { flex: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  noticeTitle: { flex: 1, fontSize: 13, color: '#374151', fontWeight: '600' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4f46e5', marginTop: 4 },
  noticeBody: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  dateText: { fontSize: 10, color: '#9ca3af', marginTop: 6 },
  emptyText: { fontSize: 13, color: '#6b7280', marginTop: 12 },
});
