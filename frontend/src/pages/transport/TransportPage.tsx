/**
 * VidyaSetu ERP — Transport Management Page
 * ==========================================
 * For Transport Incharge role.
 * Manages routes, vehicles, stops, and student assignments.
 */
import { useState, useEffect, useCallback } from 'react';
import { Bus, MapPin, Users, Plus, RefreshCw, ChevronRight, AlertTriangle } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import styles from './TransportPage.module.css';

interface Route {
  id: number;
  name: string;
  route_code: string;
  start_point: string;
  end_point: string;
  morning_start_time: string | null;
  monthly_fee: number | null;
  is_active: boolean;
}

interface Vehicle {
  id: number;
  vehicle_number: string;
  vehicle_type: string;
  capacity: number;
  driver_name: string | null;
  driver_mobile: string | null;
  status: string;
  fitness_expiry: string | null;
  insurance_expiry: string | null;
}

interface TransportStats {
  total_routes: number;
  total_vehicles: number;
  students_on_transport: number;
}

function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) {
  return (
    <div className={styles.statCard} style={{ '--card-color': color } as React.CSSProperties}>
      <div className={styles.statIcon}>{icon}</div>
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  );
}

export default function TransportPage() {
  const { hasPermission } = useAuth();
  const [stats, setStats] = useState<TransportStats | null>(null);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'routes' | 'vehicles'>('routes');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, routesRes, vehiclesRes] = await Promise.all([
        api.get('/transport/stats'),
        api.get('/transport/routes'),
        api.get('/transport/vehicles'),
      ]);
      setStats(statsRes.data?.data);
      setRoutes(routesRes.data?.data || []);
      setVehicles(vehiclesRes.data?.data || []);
    } catch (err) {
      console.error('Transport load failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const today = new Date().toISOString().split('T')[0];
  const expiringSoon = vehicles.filter(v =>
    v.fitness_expiry && v.fitness_expiry < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>
            <Bus size={24} /> Transport Management
          </h1>
          <p className={styles.subtitle}>Manage routes, vehicles, and student assignments</p>
        </div>
        <button className={styles.refreshBtn} onClick={load} disabled={loading}>
          <RefreshCw size={14} className={loading ? styles.spin : ''} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className={styles.statsRow}>
        <StatCard label="Total Routes" value={stats?.total_routes ?? '—'} icon={<MapPin size={20} />} color="var(--color-primary)" />
        <StatCard label="Vehicles" value={stats?.total_vehicles ?? '—'} icon={<Bus size={20} />} color="var(--color-info)" />
        <StatCard label="Students on Transport" value={stats?.students_on_transport ?? '—'} icon={<Users size={20} />} color="var(--color-success)" />
        {expiringSoon.length > 0 && (
          <StatCard label="Expiry Alerts" value={expiringSoon.length} icon={<AlertTriangle size={20} />} color="var(--color-danger)" />
        )}
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'routes' ? styles.tabActive : ''}`} onClick={() => setTab('routes')}>
          <MapPin size={15} /> Routes ({routes.length})
        </button>
        <button className={`${styles.tab} ${tab === 'vehicles' ? styles.tabActive : ''}`} onClick={() => setTab('vehicles')}>
          <Bus size={15} /> Vehicles ({vehicles.length})
        </button>
      </div>

      {/* Routes Table */}
      {tab === 'routes' && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Transport Routes</h2>
            {hasPermission('transport.create') && (
              <button className={styles.addBtn} id="btn-add-route">
                <Plus size={14} /> Add Route
              </button>
            )}
          </div>
          {loading ? (
            <div className={styles.loading}>Loading routes...</div>
          ) : routes.length === 0 ? (
            <div className={styles.empty}>
              <MapPin size={32} />
              <p>No routes configured yet.</p>
              <span>Add your first route to get started.</span>
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Route Code</th>
                  <th>Name</th>
                  <th>Start → End</th>
                  <th>Morning Time</th>
                  <th>Monthly Fee</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {routes.map(r => (
                  <tr key={r.id}>
                    <td><span className={styles.code}>{r.route_code}</span></td>
                    <td className={styles.bold}>{r.name}</td>
                    <td className={styles.muted}>{r.start_point} → {r.end_point}</td>
                    <td>{r.morning_start_time ?? '—'}</td>
                    <td>{r.monthly_fee ? `₹${r.monthly_fee}` : '—'}</td>
                    <td>
                      <span className={`${styles.badge} ${r.is_active ? styles.badgeActive : styles.badgeInactive}`}>
                        {r.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Vehicles Table */}
      {tab === 'vehicles' && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>School Vehicles</h2>
            {hasPermission('transport.create') && (
              <button className={styles.addBtn} id="btn-add-vehicle">
                <Plus size={14} /> Add Vehicle
              </button>
            )}
          </div>
          {loading ? (
            <div className={styles.loading}>Loading vehicles...</div>
          ) : vehicles.length === 0 ? (
            <div className={styles.empty}>
              <Bus size={32} />
              <p>No vehicles registered yet.</p>
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Vehicle No.</th>
                  <th>Type</th>
                  <th>Capacity</th>
                  <th>Driver</th>
                  <th>Fitness Expiry</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map(v => {
                  const fitnessAlert = v.fitness_expiry && v.fitness_expiry <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                  return (
                    <tr key={v.id} className={fitnessAlert ? styles.alertRow : ''}>
                      <td><span className={styles.code}>{v.vehicle_number}</span></td>
                      <td className={styles.capitalize}>{v.vehicle_type}</td>
                      <td>{v.capacity} seats</td>
                      <td>
                        <div className={styles.bold}>{v.driver_name ?? '—'}</div>
                        {v.driver_mobile && <div className={styles.muted}>{v.driver_mobile}</div>}
                      </td>
                      <td className={fitnessAlert ? styles.textDanger : ''}>
                        {v.fitness_expiry ?? '—'}
                        {fitnessAlert && <AlertTriangle size={14} className="inline ml-1 text-amber-500" />}
                      </td>
                      <td>
                        <span className={`${styles.badge} ${v.status === 'active' ? styles.badgeActive : styles.badgeMaint}`}>
                          {v.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
