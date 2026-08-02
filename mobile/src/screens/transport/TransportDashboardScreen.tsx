/**
 * VidyaSetu Mobile — Transport Management Screen
 * Routes, Vehicles, Students.
 * transport_incharge, admin, principal
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal,
  TextInput, Alert, ActivityIndicator, ScrollView, RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from '../../theme/ThemeContext';
import { transportAPI } from '../../services/api';
import { spacing, radius, typography, shadows } from '../../theme';
import { getErrorMessage } from '../../utils/formatters';
import SectionHeader from '../../components/ui/SectionHeader';
import PremiumCard from '../../components/ui/PremiumCard';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import StatCard from '../../components/ui/StatCard';
import Toast from 'react-native-toast-message';

interface Route {
  id: number;
  name: string;
  description?: string;
  vehicle_number?: string;
  driver_name?: string;
  total_students: number;
  stops?: string;
}

interface Vehicle {
  id: number;
  vehicle_number: string;
  vehicle_type: string;
  capacity: number;
  driver_name: string;
  driver_contact?: string;
  route_name?: string;
}

interface TransportStudent {
  id: number;
  student_name: string;
  gr_number: string;
  standard: string;
  division: string;
  route_name: string;
  pickup_point?: string;
}

const TABS = ['routes', 'vehicles', 'students'] as const;
type Tab = typeof TABS[number];

export default function TransportDashboardScreen({ navigation }: { navigation: any }) {
  const { colors } = useTheme();
  const [tab, setTab] = useState<Tab>('routes');
  const [routes, setRoutes] = useState<Route[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [students, setStudents] = useState<TransportStudent[]>([]);
  const [stats, setStats] = useState({ routes: 0, vehicles: 0, students: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'route' | 'vehicle'>('route');
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [routeForm, setRouteForm] = useState({ name: '', description: '', stops: '' });
  const [vehicleForm, setVehicleForm] = useState({
    vehicle_number: '', vehicle_type: 'bus', capacity: '40',
    driver_name: '', driver_contact: '',
  });
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      const [routesRes, vehiclesRes, studentsRes, statsRes] = await Promise.allSettled([
        transportAPI.getRoutes(),
        transportAPI.getVehicles(),
        transportAPI.getStudents(),
        transportAPI.getStats(),
      ]);
      if (routesRes.status   === 'fulfilled') setRoutes(routesRes.value.data?.data?.items ?? routesRes.value.data?.data ?? []);
      if (vehiclesRes.status === 'fulfilled') setVehicles(vehiclesRes.value.data?.data?.items ?? vehiclesRes.value.data?.data ?? []);
      if (studentsRes.status === 'fulfilled') setStudents(studentsRes.value.data?.data?.items ?? studentsRes.value.data?.data ?? []);
      if (statsRes.status    === 'fulfilled') {
        const d = statsRes.value.data?.data;
        setStats({ routes: d?.total_routes ?? 0, vehicles: d?.total_vehicles ?? 0, students: d?.total_students ?? 0 });
      }
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  const openRouteForm = (route?: Route) => {
    setFormType('route');
    setEditId(route?.id ?? null);
    setRouteForm({
      name: route?.name ?? '',
      description: route?.description ?? '',
      stops: route?.stops ?? '',
    });
    setShowForm(true);
  };

  const openVehicleForm = (vehicle?: Vehicle) => {
    setFormType('vehicle');
    setEditId(vehicle?.id ?? null);
    setVehicleForm({
      vehicle_number: vehicle?.vehicle_number ?? '',
      vehicle_type: vehicle?.vehicle_type ?? 'bus',
      capacity: String(vehicle?.capacity ?? 40),
      driver_name: vehicle?.driver_name ?? '',
      driver_contact: vehicle?.driver_contact ?? '',
    });
    setShowForm(true);
  };

  const saveForm = async () => {
    setSaving(true);
    try {
      if (formType === 'route') {
        if (!routeForm.name.trim()) { Toast.show({ type: 'error', text1: 'Route name is required' }); setSaving(false); return; }
        if (editId) {
          await transportAPI.updateRoute(editId, routeForm);
        } else {
          await transportAPI.createRoute(routeForm);
        }
        Toast.show({ type: 'success', text1: editId ? 'Route updated' : 'Route created' });
      } else {
        if (!vehicleForm.vehicle_number.trim()) { Toast.show({ type: 'error', text1: 'Vehicle number is required' }); setSaving(false); return; }
        const payload = { ...vehicleForm, capacity: Number(vehicleForm.capacity) };
        if (editId) {
          await transportAPI.updateVehicle(editId, payload);
        } else {
          await transportAPI.createVehicle(payload);
        }
        Toast.show({ type: 'success', text1: editId ? 'Vehicle updated' : 'Vehicle added' });
      }
      setShowForm(false);
      load();
    } catch (e) {
      Toast.show({ type: 'error', text1: getErrorMessage(e) });
    } finally { setSaving(false); }
  };

  const deleteRoute = (id: number) => {
    Alert.alert('Delete Route', 'Delete this route?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await transportAPI.deleteRoute(id); Toast.show({ type: 'success', text1: 'Route deleted' }); load(); }
        catch (e) { Toast.show({ type: 'error', text1: getErrorMessage(e) }); }
      }},
    ]);
  };

  const deleteVehicle = (id: number) => {
    Alert.alert('Delete Vehicle', 'Delete this vehicle?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await transportAPI.deleteVehicle(id); Toast.show({ type: 'success', text1: 'Vehicle deleted' }); load(); }
        catch (e) { Toast.show({ type: 'error', text1: getErrorMessage(e) }); }
      }},
    ]);
  };

  const filteredStudents = students.filter(s =>
    !search || s.student_name.toLowerCase().includes(search.toLowerCase()) || s.gr_number.includes(search)
  );

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      {/* Stats */}
      <View style={[s.statsBar, { backgroundColor: colors.primary }]}>
        {[
          { label: 'Routes',   value: stats.routes,   icon: 'route' },
          { label: 'Vehicles', value: stats.vehicles, icon: 'bus' },
          { label: 'Students', value: stats.students, icon: 'user-graduate' },
        ].map((item, i) => (
          <View key={i} style={s.statItem}>
            <Text style={s.statValue}>{item.value}</Text>
            <Text style={s.statLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* Tabs */}
      <View style={[s.tabs, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t}
            style={[s.tab, tab === t && { borderBottomColor: colors.primary, borderBottomWidth: 2.5 }]}
            onPress={() => setTab(t)}
          >
            <Text style={[s.tabText, { color: tab === t ? colors.primary : colors.textSecondary }]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={{ padding: spacing.base }}>
          <SkeletonLoader variant="list" count={5} />
        </View>
      ) : tab === 'routes' ? (
        <FlatList
          data={routes}
          keyExtractor={r => String(r.id)}
          contentContainerStyle={{ padding: spacing.base, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => (
            <PremiumCard variant="bordered" padding={12}>
              <View style={s.itemRow}>
                <View style={[s.itemIcon, { backgroundColor: colors.primaryBg }]}>
                  <Icon name="route" size={16} color={colors.primary} solid />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.itemTitle, { color: colors.text }]}>{item.name}</Text>
                  {item.description ? <Text style={[s.itemSub, { color: colors.textSecondary }]}>{item.description}</Text> : null}
                  <Text style={[s.itemMeta, { color: colors.textTertiary }]}>
                    🚌 {item.vehicle_number ?? 'No vehicle'} • 👤 {item.driver_name ?? 'No driver'}
                    {' '}• 🎓 {item.total_students} students
                  </Text>
                </View>
                <View style={s.actionBtns}>
                  <TouchableOpacity style={[s.actionBtn, { backgroundColor: colors.primaryBg }]} onPress={() => openRouteForm(item)}>
                    <Icon name="edit" size={13} color={colors.primary} solid />
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.actionBtn, { backgroundColor: colors.dangerBg }]} onPress={() => deleteRoute(item.id)}>
                    <Icon name="trash" size={13} color={colors.danger} solid />
                  </TouchableOpacity>
                </View>
              </View>
            </PremiumCard>
          )}
          ListEmptyComponent={<View style={s.emptyWrap}><Text style={s.emptyIcon}>🗺️</Text><Text style={[s.emptyText, { color: colors.textSecondary }]}>No routes created</Text></View>}
        />
      ) : tab === 'vehicles' ? (
        <FlatList
          data={vehicles}
          keyExtractor={v => String(v.id)}
          contentContainerStyle={{ padding: spacing.base, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => (
            <PremiumCard variant="bordered" padding={12}>
              <View style={s.itemRow}>
                <View style={[s.itemIcon, { backgroundColor: colors.warningBg }]}>
                  <Icon name="bus" size={16} color={colors.warning} solid />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.itemTitle, { color: colors.text }]}>{item.vehicle_number}</Text>
                  <Text style={[s.itemSub, { color: colors.textSecondary }]}>
                    {item.vehicle_type.toUpperCase()} • Capacity: {item.capacity}
                  </Text>
                  <Text style={[s.itemMeta, { color: colors.textTertiary }]}>
                    👤 {item.driver_name}
                    {item.driver_contact ? ` • 📞 ${item.driver_contact}` : ''}
                    {item.route_name ? ` • Route: ${item.route_name}` : ''}
                  </Text>
                </View>
                <View style={s.actionBtns}>
                  <TouchableOpacity style={[s.actionBtn, { backgroundColor: colors.primaryBg }]} onPress={() => openVehicleForm(item)}>
                    <Icon name="edit" size={13} color={colors.primary} solid />
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.actionBtn, { backgroundColor: colors.dangerBg }]} onPress={() => deleteVehicle(item.id)}>
                    <Icon name="trash" size={13} color={colors.danger} solid />
                  </TouchableOpacity>
                </View>
              </View>
            </PremiumCard>
          )}
          ListEmptyComponent={<View style={s.emptyWrap}><Text style={s.emptyIcon}>🚌</Text><Text style={[s.emptyText, { color: colors.textSecondary }]}>No vehicles added</Text></View>}
        />
      ) : (
        <>
          <View style={[s.searchWrap, { borderBottomColor: colors.border }]}>
            <View style={[s.searchBox, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
              <Icon name="search" size={14} color={colors.textTertiary} />
              <TextInput
                style={[s.searchInput, { color: colors.text }]}
                value={search}
                onChangeText={setSearch}
                placeholder="Search students..."
                placeholderTextColor={colors.placeholder}
              />
            </View>
          </View>
          <FlatList
            data={filteredStudents}
            keyExtractor={s2 => String(s2.id)}
            contentContainerStyle={{ padding: spacing.base, paddingBottom: 30 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
            ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
            renderItem={({ item }) => (
              <PremiumCard variant="bordered" padding={10}>
                <View style={s.studentRow}>
                  <View style={[s.avatar, { backgroundColor: colors.primaryBg }]}>
                    <Text style={[s.avatarText, { color: colors.primary }]}>{item.student_name[0]}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.studentName, { color: colors.text }]}>{item.student_name}</Text>
                    <Text style={[s.studentSub, { color: colors.textSecondary }]}>
                      GR: {item.gr_number} • Std {item.standard}-{item.division}
                    </Text>
                    <Text style={[s.studentRoute, { color: colors.primary }]}>
                      🚌 {item.route_name}
                      {item.pickup_point ? ` • 📍 ${item.pickup_point}` : ''}
                    </Text>
                  </View>
                </View>
              </PremiumCard>
            )}
            ListEmptyComponent={<View style={s.emptyWrap}><Text style={s.emptyIcon}>🎓</Text><Text style={[s.emptyText, { color: colors.textSecondary }]}>No transport students</Text></View>}
          />
        </>
      )}

      {/* FAB */}
      {(tab === 'routes' || tab === 'vehicles') && (
        <TouchableOpacity
          style={[s.fab, { backgroundColor: colors.primary }]}
          onPress={() => tab === 'routes' ? openRouteForm() : openVehicleForm()}
        >
          <Icon name="plus" size={20} color="#fff" solid />
        </TouchableOpacity>
      )}

      {/* Form Modal */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <View style={[s.modal, { backgroundColor: colors.background }]}>
          <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <Icon name="times" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={[s.modalTitle, { color: colors.text }]}>
              {editId ? 'Edit' : 'Add'} {formType === 'route' ? 'Route' : 'Vehicle'}
            </Text>
            <TouchableOpacity onPress={saveForm} disabled={saving}>
              {saving
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Text style={[s.saveText, { color: colors.primary }]}>Save</Text>}
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: spacing.base, gap: 14 }}>
            {formType === 'route' ? (
              <>
                <View>
                  <Text style={[s.label, { color: colors.textSecondary }]}>Route Name *</Text>
                  <TextInput style={[s.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                    value={routeForm.name} onChangeText={v => setRouteForm(f => ({ ...f, name: v }))}
                    placeholder="Route name..." placeholderTextColor={colors.placeholder} />
                </View>
                <View>
                  <Text style={[s.label, { color: colors.textSecondary }]}>Description</Text>
                  <TextInput style={[s.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                    value={routeForm.description} onChangeText={v => setRouteForm(f => ({ ...f, description: v }))}
                    placeholder="Route description..." placeholderTextColor={colors.placeholder} />
                </View>
                <View>
                  <Text style={[s.label, { color: colors.textSecondary }]}>Stops</Text>
                  <TextInput style={[s.input, s.textarea, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                    value={routeForm.stops} onChangeText={v => setRouteForm(f => ({ ...f, stops: v }))}
                    placeholder="Stop 1, Stop 2, Stop 3..." placeholderTextColor={colors.placeholder} multiline numberOfLines={3} />
                </View>
              </>
            ) : (
              <>
                <View>
                  <Text style={[s.label, { color: colors.textSecondary }]}>Vehicle Number *</Text>
                  <TextInput style={[s.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                    value={vehicleForm.vehicle_number} onChangeText={v => setVehicleForm(f => ({ ...f, vehicle_number: v }))}
                    placeholder="GJ-01-AB-1234" placeholderTextColor={colors.placeholder} autoCapitalize="characters" />
                </View>
                <View>
                  <Text style={[s.label, { color: colors.textSecondary }]}>Vehicle Type</Text>
                  <View style={s.chips}>
                    {['bus', 'van', 'auto'].map(t => (
                      <TouchableOpacity key={t} style={[s.chip, vehicleForm.vehicle_type === t && { backgroundColor: colors.primary }]}
                        onPress={() => setVehicleForm(f => ({ ...f, vehicle_type: t }))}>
                        <Text style={[s.chipText, vehicleForm.vehicle_type === t && { color: '#fff' }]}>{t.toUpperCase()}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View>
                  <Text style={[s.label, { color: colors.textSecondary }]}>Capacity</Text>
                  <TextInput style={[s.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                    value={vehicleForm.capacity} onChangeText={v => setVehicleForm(f => ({ ...f, capacity: v }))}
                    keyboardType="numeric" placeholderTextColor={colors.placeholder} />
                </View>
                <View>
                  <Text style={[s.label, { color: colors.textSecondary }]}>Driver Name *</Text>
                  <TextInput style={[s.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                    value={vehicleForm.driver_name} onChangeText={v => setVehicleForm(f => ({ ...f, driver_name: v }))}
                    placeholder="Driver full name..." placeholderTextColor={colors.placeholder} />
                </View>
                <View>
                  <Text style={[s.label, { color: colors.textSecondary }]}>Driver Contact</Text>
                  <TextInput style={[s.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                    value={vehicleForm.driver_contact} onChangeText={v => setVehicleForm(f => ({ ...f, driver_contact: v }))}
                    keyboardType="phone-pad" placeholder="10-digit mobile..." placeholderTextColor={colors.placeholder} />
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  statsBar: { flexDirection: 'row', padding: spacing.base, justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: typography.size.xl, fontWeight: typography.weight.extrabold, color: '#fff' },
  statLabel: { fontSize: typography.size.xs, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, padding: 12, alignItems: 'center' },
  tabText: { fontSize: typography.size.sm, fontWeight: typography.weight.semibold },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  itemIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  itemTitle: { fontSize: typography.size.base, fontWeight: typography.weight.bold },
  itemSub: { fontSize: typography.size.sm, marginTop: 1 },
  itemMeta: { fontSize: typography.size.xs, marginTop: 3 },
  actionBtns: { gap: 6 },
  actionBtn: { width: 32, height: 32, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  studentRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: typography.size.base, fontWeight: typography.weight.bold },
  studentName: { fontSize: typography.size.base, fontWeight: typography.weight.semibold },
  studentSub: { fontSize: typography.size.xs, marginTop: 2 },
  studentRoute: { fontSize: typography.size.xs, marginTop: 2 },
  searchWrap: { padding: spacing.sm, borderBottomWidth: 1 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: 12, height: 40 },
  searchInput: { flex: 1, fontSize: typography.size.base },
  emptyWrap: { alignItems: 'center', padding: spacing.xl },
  emptyIcon: { fontSize: 44, marginBottom: 12 },
  emptyText: { fontSize: typography.size.base },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8,
  },
  modal: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.base, borderBottomWidth: 1 },
  modalTitle: { fontSize: typography.size.lg, fontWeight: typography.weight.bold },
  saveText: { fontSize: typography.size.base, fontWeight: typography.weight.bold },
  label: { fontSize: typography.size.xs, fontWeight: typography.weight.semibold, textTransform: 'uppercase', marginBottom: 6 },
  input: { height: 48, borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: spacing.md, fontSize: typography.size.base },
  textarea: { height: 90, textAlignVertical: 'top', paddingTop: 10 },
  chips: { flexDirection: 'row', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full, backgroundColor: '#f3f4f6', borderWidth: 1.5, borderColor: '#e5e7eb' },
  chipText: { fontSize: typography.size.sm, fontWeight: typography.weight.semibold, color: '#6b7280' },
});
