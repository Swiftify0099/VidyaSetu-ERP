/**
 * VidyaSetu Mobile — Transport Management Screen (Premium Redesign)
 * =================================================================
 * Route navigation planning, bus vehicle fleet tracking, and student commuter rosters.
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
import { transportAPI } from '../../services/api';
import { spacing, radius, typography, shadows } from '../../theme';
import { getErrorMessage } from '../../utils/formatters';
import {
  AppCard,
  AppBadge,
  AppButton,
  AppTabs,
  AppInput,
  AppBottomSheet,
  AppStatCard,
  AppEmptyState,
  AppSkeleton,
} from '../../components/ui';
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

export default function TransportDashboardScreen({ navigation }: { navigation: any }) {
  const { colors, roleAccent } = useTheme();
  const [tab, setTab] = useState<'routes' | 'vehicles' | 'students'>('routes');
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
    vehicle_number: '',
    vehicle_type: 'bus',
    capacity: '40',
    driver_name: '',
    driver_contact: '',
  });

  const load = useCallback(async () => {
    try {
      const [routesRes, vehiclesRes, studentsRes, statsRes] = await Promise.allSettled([
        transportAPI.getRoutes(),
        transportAPI.getVehicles(),
        transportAPI.getStudents(),
        transportAPI.getStats(),
      ]);
      if (routesRes.status === 'fulfilled') {
        setRoutes(routesRes.value.data?.data?.items ?? routesRes.value.data?.data ?? []);
      }
      if (vehiclesRes.status === 'fulfilled') {
        setVehicles(vehiclesRes.value.data?.data?.items ?? vehiclesRes.value.data?.data ?? []);
      }
      if (studentsRes.status === 'fulfilled') {
        setStudents(studentsRes.value.data?.data?.items ?? studentsRes.value.data?.data ?? []);
      }
      if (statsRes.status === 'fulfilled') {
        const d = statsRes.value.data?.data;
        setStats({
          routes: d?.total_routes ?? 0,
          vehicles: d?.total_vehicles ?? 0,
          students: d?.total_students ?? 0,
        });
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

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
        if (!routeForm.name.trim()) {
          Toast.show({ type: 'error', text1: 'Route name is required' });
          setSaving(false);
          return;
        }
        if (editId) {
          await transportAPI.updateRoute(editId, routeForm);
        } else {
          await transportAPI.createRoute(routeForm);
        }
        Toast.show({ type: 'success', text1: editId ? 'Route Updated' : 'Route Created' });
      } else {
        if (!vehicleForm.vehicle_number.trim()) {
          Toast.show({ type: 'error', text1: 'Vehicle number is required' });
          setSaving(false);
          return;
        }
        const payload = { ...vehicleForm, capacity: Number(vehicleForm.capacity) };
        if (editId) {
          await transportAPI.updateVehicle(editId, payload);
        } else {
          await transportAPI.createVehicle(payload);
        }
        Toast.show({ type: 'success', text1: editId ? 'Vehicle Updated' : 'Vehicle Added' });
      }
      setShowForm(false);
      load();
    } catch (e) {
      Toast.show({ type: 'error', text1: getErrorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Top Metric Stats Summary */}
      <View style={[styles.statsRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <AppStatCard
          label="Active Routes"
          value={stats.routes}
          icon="route"
          color={colors.primary}
          style={{ flex: 1 }}
        />
        <AppStatCard
          label="Vehicle Fleet"
          value={stats.vehicles}
          icon="bus"
          color={colors.success}
          style={{ flex: 1 }}
        />
        <AppStatCard
          label="Student Commuters"
          value={stats.students}
          icon="users"
          color={colors.info}
          style={{ flex: 1 }}
        />
      </View>

      {/* Tabs */}
      <View style={[styles.tabsWrap, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <AppTabs
          tabs={[
            { key: 'routes', label: 'Bus Routes', count: routes.length },
            { key: 'vehicles', label: 'Fleet Vehicles', count: vehicles.length },
            { key: 'students', label: 'Commuters', count: students.length },
          ]}
          activeTab={tab}
          onChangeTab={k => setTab(k as any)}
          variant="segmented"
        />
      </View>

      {loading ? (
        <View style={{ padding: spacing.base }}>
          <AppSkeleton variant="card" count={4} />
        </View>
      ) : tab === 'routes' ? (
        /* Routes List */
        <FlatList
          data={routes}
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
              icon="route"
              title="No Transport Routes"
              description="No school bus routes configured yet."
              actionLabel="Create Route"
              onAction={() => openRouteForm()}
              style={{ flex: 1 }}
            />
          }
          renderItem={({ item }) => (
            <AppCard variant="bordered" padding={14}>
              <View style={{ gap: 6 }}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.title, { color: colors.text }]}>{item.name}</Text>
                  <AppBadge
                    label={`${item.total_students || 0} Students`}
                    variant="primary"
                    size="sm"
                    rounded
                  />
                </View>

                {item.stops ? (
                  <View style={styles.stopsRow}>
                    <Icon name="map-marker-alt" size={11} color={colors.textTertiary} />
                    <Text style={[styles.stopsText, { color: colors.textSecondary }]} numberOfLines={2}>
                      Stops: {item.stops}
                    </Text>
                  </View>
                ) : null}

                {item.driver_name && (
                  <Text style={[styles.driverText, { color: colors.textTertiary }]}>
                    Driver: {item.driver_name} {item.vehicle_number ? `(${item.vehicle_number})` : ''}
                  </Text>
                )}
              </View>
            </AppCard>
          )}
        />
      ) : tab === 'vehicles' ? (
        /* Vehicles List */
        <FlatList
          data={vehicles}
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
              icon="bus"
              title="No Vehicles Registered"
              description="No buses or vans added to school transport fleet."
              actionLabel="Register Vehicle"
              onAction={() => openVehicleForm()}
              style={{ flex: 1 }}
            />
          }
          renderItem={({ item }) => (
            <AppCard variant="bordered" padding={14}>
              <View style={{ gap: 6 }}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.title, { color: colors.text }]}>{item.vehicle_number}</Text>
                  <AppBadge
                    label={`${item.capacity} Seats`}
                    variant="neutral"
                    size="sm"
                    rounded
                  />
                </View>

                <Text style={[styles.driverText, { color: colors.textSecondary }]}>
                  Driver: <Text style={{ fontWeight: 'bold', color: colors.text }}>{item.driver_name}</Text>{' '}
                  {item.driver_contact ? `• ${item.driver_contact}` : ''}
                </Text>

                {item.route_name && (
                  <Text style={[styles.stopsText, { color: colors.primary }]}>
                    Assigned Route: {item.route_name}
                  </Text>
                )}
              </View>
            </AppCard>
          )}
        />
      ) : (
        /* Students List */
        <FlatList
          data={students}
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
              icon="users"
              title="No Enrolled Commuters"
              description="No students registered for bus transport service."
              style={{ flex: 1 }}
            />
          }
          renderItem={({ item }) => (
            <AppCard variant="bordered" padding={14}>
              <View style={{ gap: 4 }}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.title, { color: colors.text }]}>{item.student_name}</Text>
                  <AppBadge label={`Std ${item.standard}-${item.division}`} variant="primary" size="sm" rounded />
                </View>
                <Text style={[styles.stopsText, { color: colors.textSecondary }]}>
                  Route: {item.route_name} {item.pickup_point ? `(Stop: ${item.pickup_point})` : ''}
                </Text>
                <Text style={[styles.driverText, { color: colors.textTertiary }]}>
                  GR: {item.gr_number}
                </Text>
              </View>
            </AppCard>
          )}
        />
      )}

      {/* Floating Create Button */}
      {tab !== 'students' && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary, ...shadows.lg }]}
          onPress={() => (tab === 'routes' ? openRouteForm() : openVehicleForm())}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={tab === 'routes' ? 'Add Route' : 'Add Vehicle'}
        >
          <Icon name="plus" size={20} color="#fff" solid />
        </TouchableOpacity>
      )}

      {/* Create / Edit Bottom Sheet */}
      <AppBottomSheet
        visible={showForm}
        onClose={() => setShowForm(false)}
        title={
          formType === 'route'
            ? editId
              ? 'Edit Transport Route'
              : 'Add Transport Route'
            : editId
            ? 'Edit Vehicle'
            : 'Register Vehicle'
        }
        subtitle={
          formType === 'route'
            ? 'Configure route name and stop sequence'
            : 'Configure bus registration, driver and capacity'
        }
      >
        <View style={{ gap: spacing.xs }}>
          {formType === 'route' ? (
            <>
              <AppInput
                label="Route Name *"
                value={routeForm.name}
                onChangeText={v => setRouteForm(f => ({ ...f, name: v }))}
                icon="route"
                placeholder="e.g. Route 4 - Shivaji Nagar Express"
              />
              <AppInput
                label="Stops (Comma Separated)"
                value={routeForm.stops}
                onChangeText={v => setRouteForm(f => ({ ...f, stops: v }))}
                icon="map-marker-alt"
                placeholder="e.g. Bus Stand, City Center, Main Gate"
                multiline
              />
              <AppInput
                label="Description & Schedule"
                value={routeForm.description}
                onChangeText={v => setRouteForm(f => ({ ...f, description: v }))}
                icon="clock"
                placeholder="Morning pickup at 07:15 AM..."
                multiline
              />
            </>
          ) : (
            <>
              <AppInput
                label="Vehicle Number *"
                value={vehicleForm.vehicle_number}
                onChangeText={v => setVehicleForm(f => ({ ...f, vehicle_number: v }))}
                icon="bus"
                placeholder="e.g. MH-12-AB-1234"
                autoCapitalize="characters"
              />
              <AppInput
                label="Seating Capacity *"
                value={vehicleForm.capacity}
                onChangeText={v => setVehicleForm(f => ({ ...f, capacity: v }))}
                icon="users"
                keyboardType="number-pad"
              />
              <AppInput
                label="Driver Full Name *"
                value={vehicleForm.driver_name}
                onChangeText={v => setVehicleForm(f => ({ ...f, driver_name: v }))}
                icon="user"
                placeholder="e.g. Ramesh Patil"
              />
              <AppInput
                label="Driver Contact Mobile"
                value={vehicleForm.driver_contact}
                onChangeText={v => setVehicleForm(f => ({ ...f, driver_contact: v }))}
                icon="phone"
                keyboardType="phone-pad"
                maxLength={10}
              />
            </>
          )}

          <AppButton
            label={editId ? 'Save Changes' : formType === 'route' ? 'Create Route' : 'Register Bus'}
            iconLeft="check"
            variant="primary"
            size="lg"
            onPress={saveForm}
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
  },
  stopsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stopsText: {
    fontSize: typography.size.xs,
  },
  driverText: {
    fontSize: typography.size.xs,
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
