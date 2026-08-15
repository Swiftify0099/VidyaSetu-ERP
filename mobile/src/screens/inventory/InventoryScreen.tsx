/**
 * VidyaSetu Mobile — Inventory Management Screen (Premium Redesign)
 * =================================================================
 * Stock inventory catalog, low-stock alerts, issuance workflows, and valuation metrics.
 */
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from '../../theme/ThemeContext';
import { inventoryAPI } from '../../services/api';
import { spacing, radius, typography, shadows } from '../../theme';
import { formatCurrency, formatDateLong, getErrorMessage } from '../../utils/formatters';
import {
  AppCard,
  AppBadge,
  AppButton,
  AppTabs,
  AppChip,
  AppSearchBar,
  AppInput,
  AppSelect,
  AppBottomSheet,
  AppStatCard,
  AppEmptyState,
  AppSkeleton,
} from '../../components/ui';
import Toast from 'react-native-toast-message';

interface InventoryItem {
  id: number;
  item_name: string;
  category_name?: string;
  category?: string;
  quantity: number;
  min_quantity?: number;
  unit_price?: number;
  location?: string;
  status?: string;
  sku?: string;
}

interface IssuedRecord {
  id: number;
  item_name: string;
  issued_to_name: string;
  issued_to_role?: string;
  quantity: number;
  issued_date: string;
  return_date?: string;
  status: string;
}

const CATEGORY_CHOICES = [
  'Stationery',
  'Lab Equipment',
  'Sports Goods',
  'Textbooks',
  'IT Assets',
  'Furniture',
  'Maintenance',
];

const CATEGORY_OPTIONS = CATEGORY_CHOICES.map(c => ({ label: c, value: c }));

const EMPTY_ITEM_FORM = {
  item_name: '',
  category: 'Stationery',
  quantity: '10',
  min_quantity: '5',
  unit_price: '0',
  location: 'Main Store',
};

const EMPTY_ISSUE_FORM = {
  item_id: '',
  issued_to_name: '',
  issued_to_role: 'teacher',
  quantity: '1',
  remarks: '',
};

export default function InventoryScreen({ navigation }: { navigation: any }) {
  const { colors, roleAccent } = useTheme();
  const [tab, setTab] = useState<'items' | 'issued'>('items');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [issuedList, setIssuedList] = useState<IssuedRecord[]>([]);
  const [stats, setStats] = useState({ total_items: 0, low_stock: 0, total_issued: 0, total_value: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Modals
  const [showItemModal, setShowItemModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [itemForm, setItemForm] = useState({ ...EMPTY_ITEM_FORM });
  const [issueForm, setIssueForm] = useState({ ...EMPTY_ISSUE_FORM });

  const loadData = useCallback(async () => {
    try {
      const [itemsRes, issuedRes, statsRes] = await Promise.allSettled([
        inventoryAPI.getItems({ search: search || undefined }),
        inventoryAPI.getIssuedItems({ limit: 30 }),
        inventoryAPI.getStats(),
      ]);

      if (itemsRes.status === 'fulfilled') {
        const d = itemsRes.value.data?.data;
        setItems(Array.isArray(d?.items) ? d.items : Array.isArray(d) ? d : []);
      }
      if (issuedRes.status === 'fulfilled') {
        const d = issuedRes.value.data?.data;
        setIssuedList(Array.isArray(d?.items) ? d.items : Array.isArray(d) ? d : []);
      }
      if (statsRes.status === 'fulfilled') {
        const s = statsRes.value.data?.data ?? {};
        setStats({
          total_items: s.total_items ?? items.length,
          low_stock: s.low_stock_count ?? s.low_stock ?? 0,
          total_issued: s.total_issued_count ?? s.issued ?? 0,
          total_value: s.total_valuation ?? s.total_value ?? 0,
        });
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, items.length]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const categories = Array.from(
    new Set(items.map(i => i.category_name ?? i.category ?? 'General'))
  ).filter(Boolean);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchCat =
        !selectedCategory || (item.category_name ?? item.category) === selectedCategory;
      const matchSearch =
        !search ||
        item.item_name.toLowerCase().includes(search.toLowerCase()) ||
        (item.sku && item.sku.toLowerCase().includes(search.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [items, selectedCategory, search]);

  const saveItem = async () => {
    if (!itemForm.item_name.trim()) {
      Toast.show({ type: 'error', text1: 'Item name is required' });
      return;
    }
    setSaving(true);
    try {
      await inventoryAPI.createItem({
        item_name: itemForm.item_name,
        category: itemForm.category,
        quantity: Number(itemForm.quantity) || 0,
        min_quantity: Number(itemForm.min_quantity) || 5,
        unit_price: Number(itemForm.unit_price) || 0,
        location: itemForm.location,
      });
      Toast.show({ type: 'success', text1: 'Stock Item Created Successfully' });
      setShowItemModal(false);
      setItemForm({ ...EMPTY_ITEM_FORM });
      loadData();
    } catch (e) {
      Toast.show({ type: 'error', text1: getErrorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  const issueItem = async () => {
    if (!issueForm.item_id || !issueForm.issued_to_name.trim()) {
      Toast.show({ type: 'error', text1: 'Select item and recipient name' });
      return;
    }
    setSaving(true);
    try {
      await inventoryAPI.issueItem({
        item_id: Number(issueForm.item_id),
        issued_to_name: issueForm.issued_to_name,
        issued_to_role: issueForm.issued_to_role,
        quantity: Number(issueForm.quantity) || 1,
        remarks: issueForm.remarks,
      });
      Toast.show({ type: 'success', text1: 'Item Issued Successfully' });
      setShowIssueModal(false);
      setIssueForm({ ...EMPTY_ISSUE_FORM });
      loadData();
    } catch (e) {
      Toast.show({ type: 'error', text1: getErrorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  const itemOptions = items.map(i => ({
    label: `${i.item_name} (Stock: ${i.quantity})`,
    value: String(i.id),
  }));

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Top Valuation Metrics Bar */}
      <View style={[styles.metricsBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <AppStatCard
          label="Total Stock Items"
          value={stats.total_items}
          icon="boxes"
          color={colors.primary}
          style={{ flex: 1 }}
        />
        <AppStatCard
          label="Low Stock Alerts"
          value={stats.low_stock}
          icon="exclamation-triangle"
          color={stats.low_stock > 0 ? colors.danger : colors.success}
          style={{ flex: 1 }}
        />
      </View>

      {/* Tabs */}
      <View style={[styles.tabsWrap, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <AppTabs
          tabs={[
            { key: 'items', label: 'Stock Catalog', count: items.length },
            { key: 'issued', label: 'Issued Assets', count: issuedList.length },
          ]}
          activeTab={tab}
          onChangeTab={k => setTab(k as any)}
          variant="segmented"
        />
      </View>

      {tab === 'items' ? (
        <>
          {/* Search & Category Filter */}
          <View style={[styles.filterWrap, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <AppSearchBar
              value={search}
              onChangeText={setSearch}
              placeholder="Search stock by item name or SKU..."
              style={{ marginVertical: 0 }}
            />

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing.xs, paddingTop: spacing.xs }}
            >
              <AppChip
                label="All Categories"
                selected={selectedCategory === null}
                onPress={() => setSelectedCategory(null)}
              />
              {categories.map(c => (
                <AppChip
                  key={c}
                  label={c}
                  selected={selectedCategory === c}
                  onPress={() => setSelectedCategory(selectedCategory === c ? null : c)}
                />
              ))}
            </ScrollView>
          </View>

          {loading ? (
            <View style={{ padding: spacing.base }}>
              <AppSkeleton variant="card" count={4} />
            </View>
          ) : (
            <FlatList
              data={filteredItems}
              keyExtractor={item => String(item.id)}
              contentContainerStyle={{ padding: spacing.base, paddingBottom: 100 }}
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
                  icon="boxes"
                  title="No Inventory Items"
                  description="No stock catalog items found matching your current search or category."
                  actionLabel="Add Stock Item"
                  onAction={() => setShowItemModal(true)}
                  style={{ flex: 1 }}
                />
              }
              renderItem={({ item }) => {
                const isLow = item.quantity <= (item.min_quantity ?? 5);
                return (
                  <AppCard
                    variant="bordered"
                    padding={14}
                    style={{
                      borderLeftWidth: isLow ? 3.5 : 0,
                      borderLeftColor: colors.danger,
                    }}
                  >
                    <View style={styles.itemRow}>
                      <View style={{ flex: 1, gap: 3 }}>
                        <View style={styles.nameRow}>
                          <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
                            {item.item_name}
                          </Text>
                          <AppBadge
                            label={isLow ? 'Low Stock' : 'In Stock'}
                            variant={isLow ? 'danger' : 'success'}
                            size="sm"
                            rounded
                          />
                        </View>

                        <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>
                          {item.category_name ?? item.category ?? 'General'}
                          {item.location ? ` • ${item.location}` : ''}
                        </Text>

                        {item.unit_price ? (
                          <Text style={[styles.priceText, { color: colors.textTertiary }]}>
                            Unit Price: {formatCurrency(item.unit_price)}
                          </Text>
                        ) : null}
                      </View>

                      <View style={[styles.qtyBox, { backgroundColor: isLow ? colors.dangerBg : colors.surfaceAlt }]}>
                        <Text style={[styles.qtyNum, { color: isLow ? colors.danger : colors.text }]}>
                          {item.quantity}
                        </Text>
                        <Text style={[styles.qtyLabel, { color: isLow ? colors.danger : colors.textSecondary }]}>
                          Units
                        </Text>
                      </View>
                    </View>
                  </AppCard>
                );
              }}
            />
          )}
        </>
      ) : (
        /* Issued List */
        <FlatList
          data={issuedList}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={{ padding: spacing.base, paddingBottom: 100 }}
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
              icon="dolly"
              title="No Issued Records"
              description="No inventory items or assets are currently checked out."
              actionLabel="Issue Item"
              onAction={() => setShowIssueModal(true)}
              style={{ flex: 1 }}
            />
          }
          renderItem={({ item }) => (
            <AppCard variant="bordered" padding={14}>
              <View style={{ gap: 6 }}>
                <View style={styles.nameRow}>
                  <Text style={[styles.itemName, { color: colors.text }]}>{item.item_name}</Text>
                  <AppBadge label={`${item.quantity} Qty`} variant="primary" size="sm" rounded />
                </View>

                <Text style={[styles.issuedTo, { color: colors.textSecondary }]}>
                  Issued to: <Text style={{ fontWeight: 'bold', color: colors.text }}>{item.issued_to_name}</Text>{' '}
                  ({item.issued_to_role ?? 'Staff'})
                </Text>

                <Text style={[styles.issuedDate, { color: colors.textTertiary }]}>
                  Date: {formatDateLong(item.issued_date)}
                </Text>
              </View>
            </AppCard>
          )}
        />
      )}

      {/* Floating Create Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, ...shadows.lg }]}
        onPress={() => (tab === 'items' ? setShowItemModal(true) : setShowIssueModal(true))}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Add Inventory"
      >
        <Icon name="plus" size={20} color="#fff" solid />
      </TouchableOpacity>

      {/* Create Stock Item Bottom Sheet */}
      <AppBottomSheet
        visible={showItemModal}
        onClose={() => setShowItemModal(false)}
        title="Add Inventory Item"
        subtitle="Record stock items in school store"
      >
        <View style={{ gap: spacing.xs }}>
          <AppInput
            label="Item Name *"
            value={itemForm.item_name}
            onChangeText={v => setItemForm(f => ({ ...f, item_name: v }))}
            icon="box"
            placeholder="e.g. A4 Notebooks 200 Pages"
          />

          <AppSelect
            label="Category"
            value={itemForm.category}
            options={CATEGORY_OPTIONS}
            onSelect={v => setItemForm(f => ({ ...f, category: String(v) }))}
          />

          <View style={styles.formRow}>
            <View style={{ flex: 1 }}>
              <AppInput
                label="Quantity *"
                value={itemForm.quantity}
                onChangeText={v => setItemForm(f => ({ ...f, quantity: v }))}
                keyboardType="number-pad"
              />
            </View>
            <View style={{ flex: 1 }}>
              <AppInput
                label="Min Threshold"
                value={itemForm.min_quantity}
                onChangeText={v => setItemForm(f => ({ ...f, min_quantity: v }))}
                keyboardType="number-pad"
              />
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={{ flex: 1 }}>
              <AppInput
                label="Unit Price (₹)"
                value={itemForm.unit_price}
                onChangeText={v => setItemForm(f => ({ ...f, unit_price: v }))}
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1 }}>
              <AppInput
                label="Storage Location"
                value={itemForm.location}
                onChangeText={v => setItemForm(f => ({ ...f, location: v }))}
                placeholder="e.g. Rack B-3"
              />
            </View>
          </View>

          <AppButton
            label="Save Stock Item"
            iconLeft="save"
            variant="primary"
            size="lg"
            onPress={saveItem}
            loading={saving}
            fullWidth
            style={{ marginTop: spacing.md }}
          />
        </View>
      </AppBottomSheet>

      {/* Issue Item Bottom Sheet */}
      <AppBottomSheet
        visible={showIssueModal}
        onClose={() => setShowIssueModal(false)}
        title="Issue Stock Item"
        subtitle="Check out items to staff or department"
      >
        <View style={{ gap: spacing.xs }}>
          <AppSelect
            label="Select Item *"
            value={issueForm.item_id}
            options={itemOptions}
            onSelect={v => setIssueForm(f => ({ ...f, item_id: String(v) }))}
          />

          <AppInput
            label="Issued To Name *"
            value={issueForm.issued_to_name}
            onChangeText={v => setIssueForm(f => ({ ...f, issued_to_name: v }))}
            icon="user"
            placeholder="Staff or Teacher name"
          />

          <AppInput
            label="Quantity to Issue *"
            value={issueForm.quantity}
            onChangeText={v => setIssueForm(f => ({ ...f, quantity: v }))}
            keyboardType="number-pad"
          />

          <AppInput
            label="Remarks / Department Notes"
            value={issueForm.remarks}
            onChangeText={v => setIssueForm(f => ({ ...f, remarks: v }))}
            placeholder="Purpose or classroom..."
          />

          <AppButton
            label="Confirm Item Issue"
            iconLeft="check"
            variant="primary"
            size="lg"
            onPress={issueItem}
            loading={saving}
            fullWidth
            style={{ marginTop: spacing.md }}
          />
        </View>
      </AppBottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  metricsBar: {
    flexDirection: 'row',
    padding: spacing.base,
    gap: spacing.md,
    borderBottomWidth: 1,
  },
  tabsWrap: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  filterWrap: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemName: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    flex: 1,
    marginRight: spacing.sm,
  },
  itemMeta: {
    fontSize: typography.size.xs,
  },
  priceText: {
    fontSize: typography.size['2xs'],
  },
  qtyBox: {
    width: 60,
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyNum: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.extrabold,
  },
  qtyLabel: {
    fontSize: typography.size['2xs'],
    fontWeight: typography.weight.semibold,
  },
  issuedTo: {
    fontSize: typography.size.xs,
  },
  issuedDate: {
    fontSize: typography.size['2xs'],
  },
  formRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 54,
    height: 54,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
