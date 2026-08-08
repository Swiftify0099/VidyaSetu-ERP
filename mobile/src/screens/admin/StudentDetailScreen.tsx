/**
 * VidyaSetu Mobile — Student Detail Screen
 * ==========================================
 * Full student profile view with attendance, fee status, and recent results.
 * Accessible to: Admin, Principal, Teacher, Class Teacher, Clerk, Accountant
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from '../../theme/ThemeContext';
import { studentsAPI, financeAPI } from '../../services/api';
import { shadows } from '../../theme';
import PremiumCard from '../../components/ui/PremiumCard';
import SectionHeader from '../../components/ui/SectionHeader';
import SkeletonLoader from '../../components/ui/SkeletonLoader';

interface StudentDetail {
  id: number;
  full_name: string;
  gr_number: string;
  standard: string;
  division: string;
  roll_number: number;
  gender?: string;
  dob?: string;
  blood_group?: string;
  mobile?: string;
  email?: string;
  address?: string;
  guardian_name?: string;
  guardian_mobile?: string;
  is_active: boolean;
  admission_date?: string;
  photo_url?: string;
}

interface AttendanceSummary {
  total_days: number;
  present: number;
  absent: number;
  leave: number;
  percentage: number;
}

interface FeeOverview {
  total_due: number;
  total_paid: number;
  balance: number;
  status: string;
}

export default function StudentDetailScreen({ navigation, route }: { navigation: any; route: any }) {
  const { studentId, studentName } = route?.params ?? {};
  const { colors } = useTheme();

  const [student, setStudent]       = useState<StudentDetail | null>(null);
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null);
  const [fees, setFees]             = useState<FeeOverview | null>(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!studentId) { setError('No student selected.'); setLoading(false); return; }
    setError(null);
    try {
      const [studRes, attRes, feeRes] = await Promise.allSettled([
        studentsAPI.get(studentId),
        studentsAPI.getAttendanceSummary(studentId, { academic_year: '2025-2026' }),
        financeAPI.getStudentFees(studentId, '2025-2026'),
      ]);

      if (studRes.status === 'fulfilled') {
        setStudent(studRes.value.data?.data ?? null);
      } else {
        setError('Could not load student details.');
      }

      if (attRes.status === 'fulfilled') {
        const attData = attRes.value.data?.data ?? [];
        const recs = Array.isArray(attData) ? attData : attData.records ?? [];
        const present = recs.filter((r: any) => r.status === 'present' || r.status === 'P').length;
        const absent  = recs.filter((r: any) => r.status === 'absent'  || r.status === 'A').length;
        const leave   = recs.filter((r: any) => r.status === 'leave'   || r.status === 'L').length;
        const total   = recs.length;
        setAttendance({
          total_days: total,
          present,
          absent,
          leave,
          percentage: total > 0 ? Math.round((present / total) * 100) : 0,
        });
      }

      if (feeRes.status === 'fulfilled') {
        const feeData = feeRes.value.data?.data;
        setFees({
          total_due:  feeData?.total_due  ?? 0,
          total_paid: feeData?.total_paid ?? 0,
          balance:    feeData?.balance    ?? 0,
          status:     feeData?.status     ?? 'unknown',
        });
      }
    } catch (e) {
      setError('Failed to load student data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [studentId]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  const pct = attendance?.percentage ?? 0;
  const attColor = pct >= 75 ? colors.success : pct >= 60 ? colors.warning : colors.danger;
  const balColor = (fees?.balance ?? 0) > 0 ? colors.danger : colors.success;

  if (loading) {
    return (
      <View style={[s.root, { backgroundColor: colors.background }]}>
        <SkeletonLoader />
      </View>
    );
  }

  if (error || !student) {
    return (
      <View style={[s.root, s.center, { backgroundColor: colors.background }]}>
        <Text style={{ fontSize: 40 }}>🙁</Text>
        <Text style={[s.errorText, { color: colors.textSecondary }]}>{error ?? 'Student not found.'}</Text>
        <TouchableOpacity style={[s.retryBtn, { backgroundColor: colors.primary }]} onPress={load}>
          <Text style={s.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const info = (label: string, value?: string | null) => value ? (
    <View style={s.infoRow}>
      <Text style={[s.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[s.infoValue, { color: colors.text }]}>{value}</Text>
    </View>
  ) : null;

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* ── Hero Header ───────────────────────────────────────── */}
        <View style={[s.hero, { backgroundColor: colors.primary }]}>
          <View style={s.avatarCircle}>
            <Text style={s.avatarText}>{student.full_name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={s.heroInfo}>
            <Text style={s.heroName}>{student.full_name}</Text>
            <Text style={s.heroSub}>
              Std {student.standard}-{student.division}  ·  Roll #{student.roll_number}
            </Text>
            <Text style={s.heroGR}>GR: {student.gr_number}</Text>
          </View>
          <View style={[s.activePill, { backgroundColor: student.is_active ? '#d1fae5' : '#fee2e2' }]}>
            <Text style={[s.activePillText, { color: student.is_active ? '#059669' : '#dc2626' }]}>
              {student.is_active ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        <View style={s.body}>
          {/* ── Stats Row ──────────────────────────────────────── */}
          <View style={s.statsRow}>
            <View style={[s.statBox, { borderColor: attColor }]}>
              <Text style={[s.statVal, { color: attColor }]}>{pct}%</Text>
              <Text style={[s.statLbl, { color: colors.textSecondary }]}>Attendance</Text>
              <Text style={[s.statSub, { color: colors.textSecondary }]}>
                {attendance?.present ?? 0}P / {attendance?.absent ?? 0}A
              </Text>
            </View>
            <View style={[s.statBox, { borderColor: balColor }]}>
              <Text style={[s.statVal, { color: balColor }]}>
                ₹{(fees?.balance ?? 0).toLocaleString('en-IN')}
              </Text>
              <Text style={[s.statLbl, { color: colors.textSecondary }]}>Fee Balance</Text>
              <Text style={[s.statSub, { color: colors.textSecondary }]}>
                Paid ₹{(fees?.total_paid ?? 0).toLocaleString('en-IN')}
              </Text>
            </View>
          </View>

          {/* ── Personal Info ─────────────────────────────────── */}
          <PremiumCard style={s.card}>
            <SectionHeader title="Personal Information" />
            {info('Gender',        student.gender)}
            {info('Date of Birth', student.dob ? new Date(student.dob).toLocaleDateString('en-IN') : null)}
            {info('Blood Group',   student.blood_group)}
            {info('Mobile',        student.mobile)}
            {info('Email',         student.email)}
            {info('Address',       student.address)}
            {info('Admission',     student.admission_date ? new Date(student.admission_date).toLocaleDateString('en-IN') : null)}
          </PremiumCard>

          {/* ── Guardian Info ────────────────────────────────── */}
          {(student.guardian_name || student.guardian_mobile) && (
            <PremiumCard style={s.card}>
              <SectionHeader title="Guardian" />
              {info('Name',   student.guardian_name)}
              {info('Mobile', student.guardian_mobile)}
            </PremiumCard>
          )}

          {/* ── Quick Actions ─────────────────────────────────── */}
          <PremiumCard style={s.card}>
            <SectionHeader title="Quick Actions" />
            <View style={s.actionsRow}>
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: '#ede9fe' }]}
                onPress={() => navigation?.navigate('ExamResults', { studentId: student.id })}
              >
                <Icon name="chart-bar" size={18} color="#7c3aed" />
                <Text style={[s.actionText, { color: '#7c3aed' }]}>Results</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: '#d1fae5' }]}
                onPress={() => navigation?.navigate('Leave', { studentId: student.id })}
              >
                <Icon name="calendar-times" size={18} color="#059669" />
                <Text style={[s.actionText, { color: '#059669' }]}>Leave</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: '#fef3c7' }]}
                onPress={() => navigation?.navigate('BehaviourLog', { studentId: student.id })}
              >
                <Icon name="clipboard-list" size={18} color="#d97706" />
                <Text style={[s.actionText, { color: '#d97706' }]}>Behaviour</Text>
              </TouchableOpacity>
            </View>
          </PremiumCard>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { fontSize: 14, textAlign: 'center', lineHeight: 22, paddingHorizontal: 32 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10, marginTop: 4 },
  retryText: { color: '#fff', fontWeight: '700' },
  // Hero
  hero: { padding: 24, paddingTop: Platform.OS === 'ios' ? 56 : 36, flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatarCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
  avatarText: { fontSize: 24, fontWeight: '900', color: '#fff' },
  heroInfo: { flex: 1 },
  heroName: { fontSize: 18, fontWeight: '900', color: '#fff' },
  heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  heroGR: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  activePill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  activePillText: { fontSize: 11, fontWeight: '700' },
  // Body
  body: { padding: 16, gap: 12 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statBox: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 2, ...shadows.sm },
  statVal: { fontSize: 22, fontWeight: '900' },
  statLbl: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  statSub: { fontSize: 10, marginTop: 2 },
  card: { marginBottom: 0 },
  // Info rows
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e7eb' },
  infoLabel: { fontSize: 12, fontWeight: '600' },
  infoValue: { fontSize: 13, fontWeight: '700', maxWidth: '60%', textAlign: 'right' },
  // Actions
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  actionBtn: { flex: 1, alignItems: 'center', padding: 14, borderRadius: 14, gap: 6 },
  actionText: { fontSize: 11, fontWeight: '700' },
});
