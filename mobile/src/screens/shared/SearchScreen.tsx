/**
 * EduShakti One ERP — Premium Search Screen
 */
import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Animated, Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from '../../theme/ThemeContext';
import PremiumCard from '../../components/ui/PremiumCard';
import Badge from '../../components/ui/Badge';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import { spacing, radius, typography, shadows } from '../../theme';

const RECENT_SEARCHES = ['Ravi Sharma', 'Class 10A', 'Attendance Report', 'Fee Collection'];
const QUICK_CATEGORIES = [
  { icon: 'user-graduate', label: 'Students',   color: '#6366f1' },
  { icon: 'chalkboard-teacher', label: 'Teachers', color: '#3b82f6' },
  { icon: 'rupee-sign',   label: 'Fees',        color: '#f59e0b' },
  { icon: 'clipboard-check', label: 'Attendance', color: '#10b981' },
];

export default function SearchScreen() {
  const { colors, roleAccent } = useTheme();
  const [query, setQuery]     = useState('');
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const inputRef = useRef<TextInput>(null);
  const widthAnim = useRef(new Animated.Value(0)).current;

  const onFocus = useCallback(() => {
    setFocused(true);
    Animated.spring(widthAnim, { toValue: 1, useNativeDriver: false, friction: 7 }).start();
  }, []);

  const onBlur = useCallback(() => {
    if (!query) {
      setFocused(false);
      Animated.spring(widthAnim, { toValue: 0, useNativeDriver: false, friction: 7 }).start();
    }
  }, [query]);

  const handleSearch = useCallback(async (q: string) => {
    setQuery(q);
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    // Simulate search delay
    setTimeout(() => {
      setResults(
        q ? [
          { id: 1, type: 'student', name: `${q} - Student Result`, detail: 'Class 9A' },
          { id: 2, type: 'teacher', name: `${q} - Teacher`, detail: 'Mathematics' },
        ] : []
      );
      setLoading(false);
    }, 600);
  }, []);

  const handleClear = () => {
    setQuery('');
    setResults([]);
    inputRef.current?.focus();
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, paddingTop: Platform.OS === 'ios' ? 56 : 24 }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Search</Text>

        {/* Search Bar */}
        <View style={[styles.searchBar, { backgroundColor: colors.inputBg, borderColor: focused ? roleAccent.primary : colors.inputBorder }]}>
          <Icon name="search" size={14} color={focused ? roleAccent.primary : colors.textTertiary} solid />
          <TextInput
            ref={inputRef}
            style={[styles.searchInput, { color: colors.text }]}
            value={query}
            onChangeText={handleSearch}
            onFocus={onFocus}
            onBlur={onBlur}
            placeholder="Search students, teachers, fees..."
            placeholderTextColor={colors.placeholder}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
              <Icon name="times-circle" size={14} color={colors.textTertiary} solid />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={[]}
        keyExtractor={() => ''}
        renderItem={null}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            {/* Results */}
            {query.length >= 2 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                  {loading ? 'Searching...' : `Results for "${query}"`}
                </Text>
                {loading ? (
                  <SkeletonLoader variant="list" count={3} />
                ) : results.length > 0 ? (
                  results.map(r => (
                    <PremiumCard key={r.id} variant="bordered" style={styles.resultCard} padding={12}>
                      <View style={styles.resultRow}>
                        <View style={[styles.resultIcon, { backgroundColor: r.type === 'student' ? '#eef2ff' : '#eff6ff' }]}>
                          <Icon
                            name={r.type === 'student' ? 'user-graduate' : 'chalkboard-teacher'}
                            size={14}
                            color={r.type === 'student' ? '#6366f1' : '#3b82f6'}
                            solid
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.resultName, { color: colors.text }]}>{r.name}</Text>
                          <Text style={[styles.resultDetail, { color: colors.textSecondary }]}>{r.detail}</Text>
                        </View>
                        <Badge label={r.type} variant={r.type === 'student' ? 'primary' : 'info'} size="sm" rounded />
                      </View>
                    </PremiumCard>
                  ))
                ) : (
                  <View style={styles.noResult}>
                    <Icon name="search" size={28} color={colors.textTertiary} solid />
                    <Text style={[styles.noResultText, { color: colors.textSecondary }]}>No results found</Text>
                  </View>
                )}
              </View>
            )}

            {/* Quick Categories */}
            {!query && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Browse by category</Text>
                <View style={styles.categoriesGrid}>
                  {QUICK_CATEGORIES.map((cat, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[styles.categoryBtn, { backgroundColor: colors.surface, ...shadows.sm }]}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.categoryIcon, { backgroundColor: `${cat.color}18` }]}>
                        <Icon name={cat.icon} size={22} color={cat.color} solid />
                      </View>
                      <Text style={[styles.categoryLabel, { color: colors.text }]}>{cat.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Recent Searches */}
            {!query && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Recent searches</Text>
                <View style={styles.recentChips}>
                  {RECENT_SEARCHES.map((s, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[styles.chip, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
                      onPress={() => handleSearch(s)}
                      activeOpacity={0.75}
                    >
                      <Icon name="history" size={10} color={colors.textTertiary} solid />
                      <Text style={[styles.chipText, { color: colors.textSecondary }]}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.base,
    borderBottomWidth: 1,
    gap: spacing.md,
  },
  headerTitle: { fontSize: typography.size['2xl'], fontWeight: typography.weight.extrabold, letterSpacing: -0.4 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    borderRadius: radius.xl, borderWidth: 1.5,
    paddingHorizontal: spacing.md, height: 48,
  },
  searchInput: { flex: 1, fontSize: typography.size.base, fontWeight: typography.weight.medium, paddingVertical: 0 },
  clearBtn: { padding: 4 },
  content: { padding: spacing.base, paddingBottom: spacing['3xl'] },
  section: { marginBottom: spacing.xl },
  sectionTitle: { fontSize: typography.size.sm, fontWeight: typography.weight.semibold, marginBottom: spacing.md, textTransform: 'uppercase', letterSpacing: 0.5 },
  resultCard: { marginBottom: spacing.sm, borderRadius: radius.xl },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  resultIcon: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  resultName: { fontSize: typography.size.base, fontWeight: typography.weight.semibold, marginBottom: 2 },
  resultDetail: { fontSize: typography.size.sm },
  noResult: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  noResultText: { fontSize: typography.size.base },
  categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  categoryBtn: { width: '47%', borderRadius: radius.xl, padding: spacing.md, alignItems: 'center', gap: 6 },
  categoryIcon: { width: 52, height: 52, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  categoryLabel: { fontSize: typography.size.sm, fontWeight: typography.weight.semibold },
  recentChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1 },
  chipText: { fontSize: typography.size.sm, fontWeight: typography.weight.medium },
});
