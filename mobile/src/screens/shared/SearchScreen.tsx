/**
 * VidyaSetu Mobile — Real-Time Global Search Screen (Premium Redesign)
 * ====================================================================
 * Omnisearch across Students, Faculty, Library Books, and School Announcements
 * with debounced lookup and categorized filtering.
 */
import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from '../../theme/ThemeContext';
import { studentsAPI, teachersAPI, libraryAPI, communicationAPI } from '../../services/api';
import { spacing, radius, typography, shadows } from '../../theme';
import {
  AppCard,
  AppBadge,
  AppChip,
  AppSearchBar,
  AppEmptyState,
  AppSkeleton,
} from '../../components/ui';

interface SearchResultItem {
  id: string | number;
  type: 'student' | 'teacher' | 'book' | 'notice';
  name: string;
  detail: string;
  meta?: string;
  icon: string;
  color: string;
  rawItem?: any;
}

const RECENT_SEARCHES = ['Aarav Sharma', 'Std 10A', 'Mathematics', 'Annual Exam', 'Computer Science'];

const CATEGORIES = [
  { type: 'student', icon: 'user-graduate',       label: 'Students',     color: '#6366f1' },
  { type: 'teacher', icon: 'chalkboard-teacher',   label: 'Teachers',     color: '#3b82f6' },
  { type: 'book',    icon: 'book',                 label: 'Library Books',color: '#f59e0b' },
  { type: 'notice',  icon: 'bullhorn',             label: 'Notices',      color: '#10b981' },
];

export default function SearchScreen({ navigation }: { navigation?: any }) {
  const { colors, roleAccent } = useTheme();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);

  const performSearch = useCallback(async (q: string) => {
    setQuery(q);
    if (q.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [studRes, teachRes, bookRes, noticeRes] = await Promise.allSettled([
        studentsAPI.list({ search: q, per_page: 8 }),
        teachersAPI.list({ search: q, limit: 8 }),
        libraryAPI.getBooks({ search: q, per_page: 8 }),
        communicationAPI.getAnnouncements({ limit: 8 }),
      ]);

      const combined: SearchResultItem[] = [];

      // Students
      if (studRes.status === 'fulfilled') {
        const items = studRes.value.data?.data?.items ?? studRes.value.data?.data ?? [];
        if (Array.isArray(items)) {
          items.forEach((s: any) => {
            combined.push({
              id: `stud-${s.id}`,
              type: 'student',
              name: s.full_name,
              detail: `GR: ${s.gr_number} • Std ${s.standard}-${s.division ?? 'A'}`,
              meta: `Roll #${s.roll_number ?? '—'}`,
              icon: 'user-graduate',
              color: '#6366f1',
              rawItem: s,
            });
          });
        }
      }

      // Teachers
      if (teachRes.status === 'fulfilled') {
        const items = teachRes.value.data?.data?.items ?? teachRes.value.data?.data ?? [];
        if (Array.isArray(items)) {
          items.forEach((t: any) => {
            combined.push({
              id: `teach-${t.id}`,
              type: 'teacher',
              name: t.full_name,
              detail: t.designation ?? t.subject_specialization ?? 'Faculty Member',
              meta: t.mobile,
              icon: 'chalkboard-teacher',
              color: '#3b82f6',
              rawItem: t,
            });
          });
        }
      }

      // Books
      if (bookRes.status === 'fulfilled') {
        const items = bookRes.value.data?.data?.items ?? bookRes.value.data?.data ?? [];
        if (Array.isArray(items)) {
          items.forEach((b: any) => {
            combined.push({
              id: `book-${b.id}`,
              type: 'book',
              name: b.title,
              detail: `By ${b.author} • Acc #${b.accession_number}`,
              meta: b.is_available ? 'Available' : 'Issued',
              icon: 'book',
              color: '#f59e0b',
              rawItem: b,
            });
          });
        }
      }

      // Notices
      if (noticeRes.status === 'fulfilled') {
        const items = noticeRes.value.data?.data?.items ?? noticeRes.value.data?.data ?? [];
        if (Array.isArray(items)) {
          items
            .filter((n: any) => n.title?.toLowerCase().includes(q.toLowerCase()))
            .forEach((n: any) => {
              combined.push({
                id: `notice-${n.id}`,
                type: 'notice',
                name: n.title,
                detail: n.content?.substring(0, 60) + '...',
                meta: 'Notice',
                icon: 'bullhorn',
                color: '#10b981',
                rawItem: n,
              });
            });
        }
      }

      setResults(combined);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelect = (item: SearchResultItem) => {
    if (item.type === 'student' && navigation) {
      navigation.navigate('StudentDetail', {
        studentId: item.rawItem?.id,
        studentName: item.name,
      });
    }
  };

  const filteredResults = useMemo(() => {
    if (!selectedFilter) return results;
    return results.filter(r => r.type === selectedFilter);
  }, [results, selectedFilter]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Top Search Input Strip */}
      <View
        style={[
          styles.searchHeader,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
            paddingTop: Platform.OS === 'ios' ? 56 : 20,
          },
        ]}
      >
        <AppSearchBar
          value={query}
          onChangeText={performSearch}
          placeholder="Search students, staff, library, notices..."
          autoFocus
          style={{ marginVertical: 0 }}
        />

        {/* Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.xs, paddingTop: spacing.xs }}
        >
          <AppChip
            label="All Results"
            selected={selectedFilter === null}
            onPress={() => setSelectedFilter(null)}
          />
          {CATEGORIES.map(cat => (
            <AppChip
              key={cat.type}
              label={cat.label}
              icon={cat.icon}
              selected={selectedFilter === cat.type}
              onPress={() => setSelectedFilter(selectedFilter === cat.type ? null : cat.type)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Body / Results */}
      {loading ? (
        <View style={{ padding: spacing.base }}>
          <AppSkeleton variant="list" count={6} />
        </View>
      ) : query.trim().length < 2 ? (
        <ScrollView contentContainerStyle={styles.emptyContainer} showsVerticalScrollIndicator={false}>
          {/* Recent Searches */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Recent Searches</Text>
          <View style={styles.recentWrap}>
            {RECENT_SEARCHES.map((term, i) => (
              <AppChip
                key={i}
                label={term}
                icon="history"
                onPress={() => performSearch(term)}
              />
            ))}
          </View>

          {/* Search by Category */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: spacing.xl }]}>
            Browse Directories
          </Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat.type}
                style={[
                  styles.categoryCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
                onPress={() => setSelectedFilter(cat.type)}
                activeOpacity={0.75}
              >
                <View style={[styles.catIconWrap, { backgroundColor: `${cat.color}15` }]}>
                  <Icon name={cat.icon} size={20} color={cat.color} solid />
                </View>
                <Text style={[styles.catLabel, { color: colors.text }]}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={filteredResults}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={{ padding: spacing.base, paddingBottom: 40 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={
            <AppEmptyState
              icon="search-minus"
              title="No Results Found"
              description={`We couldn't find any items matching "${query}". Check spelling or try a broader search.`}
              style={{ flex: 1 }}
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleSelect(item)}
              disabled={item.type !== 'student'}
            >
              <AppCard variant="bordered" padding={12}>
                <View style={styles.resultRow}>
                  {/* Category Pill Icon */}
                  <View style={[styles.iconWrap, { backgroundColor: `${item.color}18` }]}>
                    <Icon name={item.icon} size={15} color={item.color} solid />
                  </View>

                  {/* Title & Details */}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.resName, { color: colors.text }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={[styles.resDetail, { color: colors.textSecondary }]} numberOfLines={1}>
                      {item.detail}
                    </Text>
                  </View>

                  {/* Meta Tag or Chevron */}
                  {item.meta && (
                    <AppBadge
                      label={item.meta}
                      variant="neutral"
                      size="sm"
                      rounded
                    />
                  )}

                  {item.type === 'student' && (
                    <Icon name="chevron-right" size={12} color={colors.textTertiary} />
                  )}
                </View>
              </AppCard>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  searchHeader: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  emptyContainer: {
    padding: spacing.base,
  },
  sectionTitle: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  recentWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryCard: {
    width: '48%',
    padding: spacing.base,
    borderRadius: radius.lg,
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
  },
  catIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resName: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
  },
  resDetail: {
    fontSize: typography.size.xs,
    marginTop: 2,
  },
});
