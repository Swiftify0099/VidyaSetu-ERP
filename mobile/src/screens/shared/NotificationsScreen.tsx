/**
 * EduShakti One ERP — Premium Notifications Screen
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from '../../theme/ThemeContext';
import { communicationAPI } from '../../services/api';
import PremiumCard from '../../components/ui/PremiumCard';
import Badge from '../../components/ui/Badge';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import { spacing, radius, typography, shadows } from '../../theme';

interface Notification { id: number; title: string; content: string; created_at: string; type?: string; }

export default function NotificationsScreen() {
  const { colors, roleAccent } = useTheme();
  const [items, setItems]      = useState<Notification[]>([]);
  const [loading, setLoading]  = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await communicationAPI.getAnnouncements({ limit: 30 });
      setItems(res.data?.data?.items ?? []);
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const renderItem = ({ item, index }: { item: Notification; index: number }) => {
    const isNew = index < 3;
    return (
      <TouchableOpacity activeOpacity={0.8} style={styles.itemWrap}>
        <PremiumCard variant={isNew ? 'default' : 'flat'} padding={12} style={styles.itemCard}>
          <View style={styles.itemRow}>
            {/* Left dot + icon */}
            <View style={styles.itemLeft}>
              {isNew && <View style={[styles.unreadDot, { backgroundColor: roleAccent.primary }]} />}
              <View style={[styles.itemIcon, { backgroundColor: isNew ? colors.primaryBg : colors.surfaceAlt }]}>
                <Icon name="bullhorn" size={14} color={isNew ? roleAccent.primary : colors.textSecondary} solid />
              </View>
            </View>
            {/* Content */}
            <View style={{ flex: 1, gap: 3 }}>
              <View style={styles.itemTitleRow}>
                <Text style={[styles.itemTitle, { color: colors.text, fontWeight: isNew ? typography.weight.bold : typography.weight.semibold }]} numberOfLines={1}>
                  {item.title}
                </Text>
                {isNew && <Badge label="New" variant="primary" size="sm" rounded />}
              </View>
              <Text style={[styles.itemBody, { color: colors.textSecondary }]} numberOfLines={2}>
                {item.content}
              </Text>
              <View style={styles.itemMeta}>
                <Icon name="clock" size={10} color={colors.textTertiary} solid />
                <Text style={[styles.itemDate, { color: colors.textTertiary }]}>
                  {new Date(item.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </Text>
              </View>
            </View>
          </View>
        </PremiumCard>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, paddingTop: Platform.OS === 'ios' ? 56 : 24 }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
        {items.length > 0 && (
          <View style={[styles.headerBadge, { backgroundColor: roleAccent.primary }]}>
            <Text style={styles.headerBadgeText}>{items.length}</Text>
          </View>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingPad}>
          <SkeletonLoader variant="list" count={6} />
        </View>
      ) : items.length === 0 ? (
        /* Empty State */
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceAlt }]}>
            <Icon name="bell-slash" size={32} color={colors.textTertiary} solid />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>All Clear!</Text>
          <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>No notifications at the moment.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={roleAccent.primary} colors={[roleAccent.primary]} />
          }
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.base,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: { fontSize: typography.size['2xl'], fontWeight: typography.weight.extrabold, letterSpacing: -0.4 },
  headerBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full,
  },
  headerBadgeText: { color: '#fff', fontSize: typography.size.xs, fontWeight: typography.weight.bold },
  loadingPad: { padding: spacing.base },
  list: { padding: spacing.base },
  itemWrap: {},
  itemCard: { borderRadius: radius.xl },
  itemRow: { flexDirection: 'row', gap: spacing.md },
  itemLeft: { alignItems: 'center', gap: 4 },
  unreadDot: { width: 7, height: 7, borderRadius: 4 },
  itemIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  itemTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  itemTitle: { flex: 1, fontSize: typography.size.base },
  itemBody: { fontSize: typography.size.sm, lineHeight: 16 },
  itemMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  itemDate: { fontSize: typography.size.xs },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.base, paddingHorizontal: spacing.xl },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: typography.size.xl, fontWeight: typography.weight.bold },
  emptyBody: { fontSize: typography.size.base, textAlign: 'center' },
});
