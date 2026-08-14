/**
 * VidyaSetu Mobile — Library Dashboard Screen (Premium Redesign)
 * ================================================================
 * Library accession catalog, circulation issuance, return processing, and overdue tracking.
 */
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from '../../theme/ThemeContext';
import { libraryAPI } from '../../services/api';
import { spacing, radius, typography, shadows } from '../../theme';
import { formatDateLong, getErrorMessage } from '../../utils/formatters';
import {
  AppCard,
  AppBadge,
  AppButton,
  AppTabs,
  AppSearchBar,
  AppStatCard,
  AppConfirmDialog,
  AppEmptyState,
  AppSkeleton,
} from '../../components/ui';
import Toast from 'react-native-toast-message';

interface Book {
  id: number;
  title: string;
  author: string;
  accession_number: string;
  category?: string;
  is_available: boolean;
}

interface IssuedBook {
  id: number;
  book_title: string;
  member_name: string;
  issue_date: string;
  due_date: string;
  is_overdue: boolean;
}

export default function LibraryDashboardScreen() {
  const { colors, roleAccent } = useTheme();
  const [books, setBooks] = useState<Book[]>([]);
  const [issued, setIssued] = useState<IssuedBook[]>([]);
  const [stats, setStats] = useState({ total: 0, available: 0, issued: 0, overdue: 0 });
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'books' | 'issued'>('books');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Return dialog
  const [returnTargetId, setReturnTargetId] = useState<number | null>(null);
  const [returning, setReturning] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [booksRes, issuedRes, statsRes] = await Promise.allSettled([
        libraryAPI.getBooks({ search: search || undefined, per_page: 40 }),
        libraryAPI.getIssued({ per_page: 40 }),
        libraryAPI.getStats(),
      ]);
      if (booksRes.status === 'fulfilled') {
        const d = booksRes.value.data?.data;
        setBooks(Array.isArray(d?.items) ? d.items : Array.isArray(d) ? d : []);
      }
      if (issuedRes.status === 'fulfilled') {
        const d = issuedRes.value.data?.data;
        setIssued(Array.isArray(d?.items) ? d.items : Array.isArray(d) ? d : []);
      }
      if (statsRes.status === 'fulfilled') {
        const d = statsRes.value.data?.data ?? {};
        setStats({
          total: d.total_books ?? 0,
          available: d.available_books ?? 0,
          issued: d.issued_books ?? 0,
          overdue: d.overdue_books ?? 0,
        });
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const confirmReturn = async () => {
    if (!returnTargetId) return;
    setReturning(true);
    try {
      await libraryAPI.returnBook(returnTargetId);
      Toast.show({ type: 'success', text1: 'Book Returned Successfully' });
      setReturnTargetId(null);
      loadData();
    } catch (e) {
      Toast.show({ type: 'error', text1: getErrorMessage(e) });
    } finally {
      setReturning(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Top Metric Stats Summary */}
      <View style={[styles.statsRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <AppStatCard
          label="Total Books"
          value={stats.total || books.length}
          icon="book"
          color={colors.primary}
          style={{ flex: 1 }}
        />
        <AppStatCard
          label="Available"
          value={stats.available}
          icon="check-circle"
          color={colors.success}
          style={{ flex: 1 }}
        />
        <AppStatCard
          label="Overdue"
          value={stats.overdue}
          icon="exclamation-circle"
          color={stats.overdue > 0 ? colors.danger : colors.textSecondary}
          style={{ flex: 1 }}
        />
      </View>

      {/* Tabs */}
      <View style={[styles.tabsWrap, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <AppTabs
          tabs={[
            { key: 'books', label: 'Book Catalog', count: books.length },
            { key: 'issued', label: 'Issued Circulation', count: issued.length },
          ]}
          activeTab={tab}
          onChangeTab={k => setTab(k as any)}
          variant="segmented"
        />
      </View>

      {tab === 'books' ? (
        <>
          {/* Search Header */}
          <View style={[styles.searchWrap, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <AppSearchBar
              value={search}
              onChangeText={setSearch}
              placeholder="Search books by title, author, accession..."
              style={{ marginVertical: 0 }}
            />
          </View>

          {loading ? (
            <View style={{ padding: spacing.base }}>
              <AppSkeleton variant="card" count={4} />
            </View>
          ) : (
            <FlatList
              data={books}
              keyExtractor={item => String(item.id)}
              contentContainerStyle={{ padding: spacing.base, paddingBottom: 40 }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={colors.primary}
                  colors={[colors.primary]}
                />
              }
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              ListEmptyComponent={
                <AppEmptyState
                  icon="book-open"
                  title="No Books Found"
                  description="No library catalog records matching your current search query."
                  style={{ flex: 1 }}
                />
              }
              renderItem={({ item }) => (
                <AppCard variant="bordered" padding={14}>
                  <View style={styles.bookRow}>
                    <View style={[styles.bookIconWrap, { backgroundColor: `${colors.primary}15` }]}>
                      <Icon name="book" size={16} color={colors.primary} solid />
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={styles.titleRow}>
                        <Text style={[styles.bookTitle, { color: colors.text }]} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <AppBadge
                          label={item.is_available ? 'Available' : 'Issued'}
                          variant={item.is_available ? 'success' : 'warning'}
                          size="sm"
                          rounded
                        />
                      </View>

                      <Text style={[styles.author, { color: colors.textSecondary }]}>
                        By {item.author}
                      </Text>

                      <View style={styles.metaRow}>
                        <Text style={[styles.accession, { color: colors.textTertiary }]}>
                          Acc: {item.accession_number}
                        </Text>
                        {item.category && (
                          <Text style={[styles.category, { color: colors.primary }]}>
                            • {item.category}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                </AppCard>
              )}
            />
          )}
        </>
      ) : (
        /* Issued Circulation List */
        <FlatList
          data={issued}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={{ padding: spacing.base, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={
            <AppEmptyState
              icon="book-reader"
              title="No Issued Books"
              description="No library books are currently checked out to students or faculty."
              style={{ flex: 1 }}
            />
          }
          renderItem={({ item }) => (
            <AppCard
              variant="bordered"
              padding={14}
              style={{
                borderLeftWidth: item.is_overdue ? 3.5 : 0,
                borderLeftColor: colors.danger,
              }}
            >
              <View style={{ gap: 6 }}>
                <View style={styles.titleRow}>
                  <Text style={[styles.bookTitle, { color: colors.text }]} numberOfLines={1}>
                    {item.book_title}
                  </Text>
                  <AppBadge
                    label={item.is_overdue ? 'Overdue' : 'On Loan'}
                    variant={item.is_overdue ? 'danger' : 'neutral'}
                    size="sm"
                    rounded
                  />
                </View>

                <Text style={[styles.author, { color: colors.textSecondary }]}>
                  Borrower: <Text style={{ fontWeight: 'bold', color: colors.text }}>{item.member_name}</Text>
                </Text>

                <View style={styles.dateRow}>
                  <Text style={[styles.accession, { color: colors.textTertiary }]}>
                    Issued: {formatDateLong(item.issue_date)}
                  </Text>
                  <Text
                    style={[
                      styles.accession,
                      { color: item.is_overdue ? colors.danger : colors.textTertiary },
                    ]}
                  >
                    Due: {formatDateLong(item.due_date)}
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end', marginTop: 4 }}>
                  <AppButton
                    label="Process Return"
                    iconLeft="undo"
                    variant="outline"
                    size="sm"
                    onPress={() => setReturnTargetId(item.id)}
                  />
                </View>
              </View>
            </AppCard>
          )}
        />
      )}

      {/* Return Confirmation Dialog */}
      <AppConfirmDialog
        visible={!!returnTargetId}
        onClose={() => setReturnTargetId(null)}
        onConfirm={confirmReturn}
        title="Confirm Book Return"
        message="Process return check-in for this library book? Available inventory will increment."
        confirmLabel="Return Book"
        variant="success"
        loading={returning}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    padding: spacing.base,
    gap: spacing.sm,
    borderBottomWidth: 1,
  },
  tabsWrap: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  searchWrap: {
    padding: spacing.base,
    borderBottomWidth: 1,
  },
  bookRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  bookIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bookTitle: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    flex: 1,
    marginRight: spacing.sm,
  },
  author: {
    fontSize: typography.size.xs,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  accession: {
    fontSize: typography.size['2xs'],
  },
  category: {
    fontSize: typography.size['2xs'],
    fontWeight: typography.weight.bold,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
});
