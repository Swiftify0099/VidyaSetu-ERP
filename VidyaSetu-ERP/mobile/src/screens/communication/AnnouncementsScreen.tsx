/**
 * VidyaSetu Mobile — Announcements / Notifications Screen
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { communicationAPI } from '../../services/api';
import Toast from 'react-native-toast-message';

const COLORS = {
  primary: '#4f46e5', surface: '#fff', bg: '#f0f0ff',
  border: '#e5e7eb', text: '#111827', textSecondary: '#6b7280',
};

interface Announcement {
  id: number;
  title: string;
  content: string;
  announcement_type: string;
  priority: string;
  is_read?: boolean;
  created_at: string;
  target_audience: string;
}

const TYPE_ICONS: Record<string, string> = {
  general: '📢', exam: '📝', holiday: '🎉', fee: '💰',
  event: '🎭', emergency: '🚨', academic: '📚',
};
const TYPE_COLORS: Record<string, string> = {
  general: '#4f46e5', exam: '#7c3aed', holiday: '#059669',
  fee: '#d97706', event: '#db2777', emergency: '#dc2626', academic: '#0891b2',
};

export default function AnnouncementsScreen() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await communicationAPI.getAnnouncements({ limit: 50 });
      setItems(res.data?.data?.items ?? res.data?.data ?? []);
    } catch { Toast.show({ type: 'error', text1: 'Failed to load announcements' }); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const markRead = async (id: number) => {
    try {
      await communicationAPI.markRead(id);
      setItems(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a));
    } catch { /* ignore */ }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={item => String(item.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No announcements yet</Text>
          </View>
        }
        renderItem={({ item }) => {
          const typeColor = TYPE_COLORS[item.announcement_type] ?? COLORS.primary;
          const typeIcon  = TYPE_ICONS[item.announcement_type] ?? '📢';
          return (
            <TouchableOpacity
              style={[styles.card, !item.is_read && styles.cardUnread]}
              activeOpacity={0.85}
              onPress={() => !item.is_read && markRead(item.id)}
            >
              {/* Unread indicator */}
              {!item.is_read && <View style={[styles.unreadDot, { backgroundColor: typeColor }]} />}

              <View style={styles.cardHeader}>
                <View style={[styles.typeChip, { backgroundColor: typeColor + '18' }]}>
                  <Text style={styles.typeIcon}>{typeIcon}</Text>
                  <Text style={[styles.typeText, { color: typeColor }]}>
                    {item.announcement_type.toUpperCase()}
                  </Text>
                </View>
                {item.priority === 'high' || item.priority === 'urgent' ? (
                  <View style={styles.urgentChip}>
                    <Text style={styles.urgentText}>🔴 {item.priority.toUpperCase()}</Text>
                  </View>
                ) : null}
              </View>

              <Text style={[styles.title, !item.is_read && styles.titleBold]}>
                {item.title}
              </Text>
              <Text style={styles.body} numberOfLines={3}>{item.content}</Text>

              <View style={styles.cardFooter}>
                <Text style={styles.dateText}>
                  {new Date(item.created_at).toLocaleDateString('en-IN', {
                    weekday: 'short', day: 'numeric', month: 'short',
                  })}
                </Text>
                <View style={styles.audienceBadge}>
                  <Text style={styles.audienceText}>📣 {item.target_audience}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 14, color: COLORS.textSecondary },
  card: {
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
    position: 'relative',
  },
  cardUnread: { borderLeftWidth: 4, borderLeftColor: COLORS.primary },
  unreadDot: {
    position: 'absolute', top: 14, right: 14,
    width: 8, height: 8, borderRadius: 4,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  typeIcon: { fontSize: 12 },
  typeText: { fontSize: 10, fontWeight: '700' },
  urgentChip: { backgroundColor: '#fee2e2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  urgentText: { fontSize: 10, fontWeight: '700', color: '#991b1b' },
  title: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  titleBold: { fontWeight: '800' },
  body: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19, marginBottom: 10 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateText: { fontSize: 11, color: COLORS.textSecondary },
  audienceBadge: { backgroundColor: '#ede9fe', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  audienceText: { fontSize: 10, color: COLORS.primary, fontWeight: '600' },
});
