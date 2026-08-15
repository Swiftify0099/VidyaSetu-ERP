/**
 * VidyaSetu Mobile — Notifications Screen (Premium Redesign)
 * ============================================================
 * Real-time school alerts, push notifications, announcement broadcasts,
 * and FCM token diagnostics.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Platform,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from '../../theme/ThemeContext';
import { communicationAPI } from '../../services/api';
import { spacing, radius, typography, shadows } from '../../theme';
import { formatDateLong, timeAgo } from '../../utils/formatters';
import {
  AppCard,
  AppBadge,
  AppButton,
  AppEmptyState,
  AppSkeleton,
} from '../../components/ui';
import { getFcmToken, requestNotificationPermission } from '../../config/firebase';
import Toast from 'react-native-toast-message';

interface Notification {
  id: number;
  title: string;
  content: string;
  created_at: string;
  type?: string;
}

export default function NotificationsScreen() {
  const { colors, roleAccent } = useTheme();
  const [items, setItems]      = useState<Notification[]>([]);
  const [loading, setLoading]  = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fcmToken, setFcmToken] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [res, token] = await Promise.all([
        communicationAPI.getAnnouncements({ limit: 30 }).catch(() => null),
        getFcmToken().catch(() => null),
      ]);
      if (res?.data?.data?.items) setItems(res.data.data.items);
      if (token) setFcmToken(token);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    requestNotificationPermission();
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const showFcmToken = async () => {
    const token = await getFcmToken();
    setFcmToken(token);
    Alert.alert(
      'Firebase FCM Token',
      `Device Push Token for Firebase Cloud Messaging:\n\n${token}`,
      [
        { text: 'Copy to Log', onPress: () => console.log('COPIED FCM TOKEN:', token) },
        { text: 'Close' },
      ]
    );
  };

  const triggerTestNotification = () => {
    const testItem: Notification = {
      id: Date.now(),
      title: 'School Announcement Alert',
      content: 'Real-time alert channel connected to VidyaSetu ERP. System notifications are active.',
      created_at: new Date().toISOString(),
    };
    setItems(prev => [testItem, ...prev]);
    Toast.show({
      type: 'success',
      text1: 'Notification Received',
      text2: 'Alert channel active on VidyaSetu ERP Mobile.',
    });
  };

  const renderItem = ({ item, index }: { item: Notification; index: number }) => {
    const isNew = index < 3;
    return (
      <AppCard
        variant={isNew ? 'default' : 'flat'}
        padding={14}
        style={{
          borderLeftWidth: isNew ? 3 : 0,
          borderLeftColor: roleAccent.primary,
        }}
      >
        <View style={styles.itemRow}>
          {/* Icon Pill */}
          <View
            style={[
              styles.itemIcon,
              {
                backgroundColor: isNew ? colors.primaryBg : colors.surfaceAlt,
              },
            ]}
          >
            <Icon
              name="bell"
              size={15}
              color={isNew ? roleAccent.primary : colors.textSecondary}
              solid
            />
          </View>

          {/* Content */}
          <View style={{ flex: 1, gap: 4 }}>
            <View style={styles.itemTitleRow}>
              <Text
                style={[
                  styles.itemTitle,
                  {
                    color: colors.text,
                    fontWeight: isNew ? typography.weight.bold : typography.weight.semibold,
                  },
                ]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              {isNew && <AppBadge label="New" variant="primary" size="sm" rounded />}
            </View>

            <Text style={[styles.itemBody, { color: colors.textSecondary }]} numberOfLines={3}>
              {item.content}
            </Text>

            <View style={styles.itemMeta}>
              <Icon name="clock" size={10} color={colors.textTertiary} solid />
              <Text style={[styles.itemDate, { color: colors.textTertiary }]}>
                {timeAgo(item.created_at)} • {formatDateLong(item.created_at)}
              </Text>
            </View>
          </View>
        </View>
      </AppCard>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Top Action Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
            paddingTop: Platform.OS === 'ios' ? 56 : 20,
          },
        ]}
      >
        <View style={styles.titleWrap}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
          {items.length > 0 && (
            <View style={[styles.headerBadge, { backgroundColor: roleAccent.primary }]}>
              <Text style={styles.headerBadgeText}>{items.length}</Text>
            </View>
          )}
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.xs }}>
          <AppButton
            label="Token"
            iconLeft="key"
            variant="outline"
            size="sm"
            onPress={showFcmToken}
          />
          <AppButton
            label="Test Alert"
            iconLeft="paper-plane"
            variant="primary"
            size="sm"
            onPress={triggerTestNotification}
          />
        </View>
      </View>

      {loading ? (
        <View style={{ padding: spacing.base }}>
          <AppSkeleton variant="list" count={5} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={roleAccent.primary}
            />
          }
          ListEmptyComponent={
            <AppEmptyState
              icon="bell-slash"
              title="No Notifications"
              description="You have no unread notifications or announcements at this time."
              style={{ flex: 1 }}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
  },
  headerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  headerBadgeText: {
    color: '#ffffff',
    fontSize: typography.size['2xs'],
    fontWeight: typography.weight.bold,
  },
  list: {
    padding: spacing.base,
    paddingBottom: spacing['3xl'],
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  itemIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemTitle: {
    fontSize: typography.size.base,
    flex: 1,
    marginRight: spacing.sm,
  },
  itemBody: {
    fontSize: typography.size.xs,
    lineHeight: 18,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  itemDate: {
    fontSize: typography.size['2xs'],
  },
});
