/**
 * VidyaSetu ERP — Mobile Analytics Screen
 * =========================================
 * Admin/Principal analytics dashboard powered by real ERP data.
 * All metrics sourced from the VidyaSetu backend — no hardcoded numbers.
 *
 * Sections:
 *   1. KPI Cards (horizontal scroll)
 *   2. Fee Overview with ring chart
 *   3. Class-wise Attendance (top 8)
 *   4. Academic Performance (if data exists)
 *   5. Insights panel
 *   6. At-risk students summary
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Platform, Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Circle, Text as SvgText, Rect, G } from 'react-native-svg';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { analyticsAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

// ── Types ─────────────────────────────────────────────────────────────────

interface Dashboard {
  total_students: number;
  active_students: number;
  total_teachers: number;
  today_attendance_pct: number;
  fee_collection_pct: number;
  fee_collected: number;
  fee_pending: number;
  books_issued: number;
  active_notices: number;
  low_stock_alerts: number;
  monthly_revenue: { month: number; month_name: string; amount: number }[];
}

interface AttendanceData {
  overall_pct: number;
  defaulters_count: number;
  by_standard: { standard: string; present_pct: number; total: number }[];
}

interface FeeData {
  total_demanded: number;
  total_collected: number;
  total_pending: number;
  collection_pct: number;
  by_fee_type: { category: string; demanded: number; paid: number }[];
}

interface AcademicData {
  status: 'ok' | 'no_data';
  pass_pct: number;
  avg_percentage: number;
  students_appeared: number;
  passed: number;
  failed: number;
  weak_subjects: { subject: string; avg_pct: number }[];
}

interface TeacherData {
  total_teachers: number;
  active_teachers: number;
  teaching_staff: number;
  attendance_pct: number;
}

interface RiskData {
  attendance_risk: number;
  fee_risk: number;
  academic_risk: number;
  multi_risk: number;
  students: { student_id: number; name: string; standard: string; division: string; risk_categories: string[]; risk_count: number }[];
}

interface Insight {
  type: string;
  icon: string;
  title: string;
  body: string;
  severity: 'info' | 'warning' | 'critical';
}

// ── Constants ─────────────────────────────────────────────────────────────

const COLORS = {
  primary:   '#4f46e5',
  primaryDark: '#4338ca',
  success:   '#10b981',
  warning:   '#f59e0b',
  danger:    '#ef4444',
  info:      '#3b82f6',
  purple:    '#8b5cf6',
  surface:   '#ffffff',
  bg:        '#f0f0ff',
  border:    '#e5e7eb',
  text:      '#111827',
  textMuted: '#6b7280',
  textSub:   '#9ca3af',
};

const SCREEN_W = Dimensions.get('window').width;
const ACADEMIC_YEAR_ID = 1;

// ── Helpers ───────────────────────────────────────────────────────────────

const fmtK = (n: number): string => {
  if (!n) return '₹0';
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000)   return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)     return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n.toLocaleString('en-IN')}`;
};

const pctColor = (p: number) =>
  p >= 85 ? COLORS.success : p >= 75 ? COLORS.warning : COLORS.danger;

const feeColor = (p: number) =>
  p >= 80 ? COLORS.success : p >= 60 ? COLORS.warning : COLORS.danger;

// ── Mini SVG Ring Chart ───────────────────────────────────────────────────

function RingChart({
  pct, color, size = 90, label, sub,
}: {
  pct: number; color: string; size?: number; label?: string; sub?: string;
}) {
  const r = size / 2 - 8;
  const circ = 2 * Math.PI * r;
  const dash = Math.min(pct / 100, 1) * circ;
  const cx = size / 2;

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cx} r={r} stroke={COLORS.border} strokeWidth={8} fill="none"/>
        <Circle cx={cx} cy={cx} r={r} stroke={color} strokeWidth={8} fill="none"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeDashoffset={circ * 0.25}
          strokeLinecap="round"
          origin={`${cx},${cx}`} rotation={-90}/>
        <SvgText x={cx} y={cx - 4} textAnchor="middle" fontSize={size > 80 ? 16 : 12}
          fontWeight="bold" fill={COLORS.text}>{pct.toFixed(0)}%</SvgText>
        {label && (
          <SvgText x={cx} y={cx + 12} textAnchor="middle" fontSize={8} fill={COLORS.textMuted}>{label}</SvgText>
        )}
      </Svg>
      {sub && <Text style={styles.ringSub}>{sub}</Text>}
    </View>
  );
}

// ── Mini Bar Chart (SVG-based, no external lib) ───────────────────────────

function MiniBarChart({
  data, height = 80, barColor = COLORS.primary,
}: {
  data: { label: string; value: number }[]; height?: number; barColor?: string;
}) {
  if (!data.length) return null;
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const barW = (SCREEN_W - 64) / data.length - 6;

  return (
    <Svg width={SCREEN_W - 64} height={height + 20}>
      {data.map((d, i) => {
        const bH = (d.value / maxVal) * height;
        const x = i * (barW + 6);
        const y = height - bH;
        return (
          <G key={i}>
            <Rect x={x} y={y} width={barW} height={bH}
              fill={barColor} rx={3} opacity={0.85}/>
            <SvgText x={x + barW / 2} y={height + 14} textAnchor="middle"
              fontSize={8} fill={COLORS.textMuted}>{d.label}</SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────

function KpiScrollCard({
  icon, value, label, sub, color,
}: {
  icon: string; value: string; label: string; sub?: string; color: string;
}) {
  return (
    <View style={[styles.kpiCard, { borderTopColor: color }]}>
      <View style={{ marginBottom: 6 }}>
        <Icon name={icon} size={18} color={color} solid />
      </View>
      <Text style={[styles.kpiValue, { color }]}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
      {sub && <Text style={styles.kpiSub}>{sub}</Text>}
    </View>
  );
}

// ── Section Card ──────────────────────────────────────────────────────────

function SectionCard({
  title, icon, children, accent,
}: {
  title: string; icon?: string; children: React.ReactNode; accent?: string;
}) {
  return (
    <View style={[styles.sectionCard, accent ? { borderLeftColor: accent, borderLeftWidth: 3 } : {}]}>
      <View style={styles.sectionHeader}>
        {icon && (
          <View style={{ marginRight: 8 }}>
            <Icon name={icon} size={14} color={accent || COLORS.primary} solid />
          </View>
        )}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

// ── Progress Bar ──────────────────────────────────────────────────────────

function ProgressRow({
  label, pct, sub, barColor,
}: {
  label: string; pct: number; sub?: string; barColor?: string;
}) {
  const c = barColor || pctColor(pct);
  return (
    <View style={styles.progRow}>
      <View style={styles.progLeft}>
        <Text style={styles.progLabel} numberOfLines={1}>{label}</Text>
        {sub && <Text style={styles.progSub}>{sub}</Text>}
      </View>
      <View style={styles.progTrack}>
        <View style={[styles.progFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: c }]}/>
      </View>
      <Text style={[styles.progPct, { color: c }]}>{pct.toFixed(0)}%</Text>
    </View>
  );
}

// ── Insight Card ──────────────────────────────────────────────────────────

function InsightRow({ ins }: { ins: Insight }) {
  const bg = ins.severity === 'critical' ? '#fff1f2' : ins.severity === 'warning' ? '#fffbeb' : '#f0fdf4';
  const border = ins.severity === 'critical' ? COLORS.danger : ins.severity === 'warning' ? COLORS.warning : COLORS.success;
  return (
    <View style={[styles.insightCard, { backgroundColor: bg, borderLeftColor: border }]}>
      <Text style={styles.insightIcon}>{ins.icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.insightTitle}>{ins.title}</Text>
        <Text style={styles.insightBody}>{ins.body}</Text>
      </View>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────

export default function AnalyticsScreen({ navigation }: { navigation: any }) {
  const { user } = useAuthStore();

  const [dash, setDash]         = useState<Dashboard | null>(null);
  const [attendance, setAtt]    = useState<AttendanceData | null>(null);
  const [fees, setFees]         = useState<FeeData | null>(null);
  const [academic, setAcad]     = useState<AcademicData | null>(null);
  const [teachers, setTeach]    = useState<TeacherData | null>(null);
  const [risk, setRisk]         = useState<RiskData | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const params = { academic_year_id: ACADEMIC_YEAR_ID };

      const [dRes, aRes, fRes, acRes, tRes, rRes, iRes] = await Promise.allSettled([
        analyticsAPI.getDashboard(params),
        analyticsAPI.getAttendance(params),
        analyticsAPI.getFees(params),
        analyticsAPI.getAcademic(params),
        analyticsAPI.getTeachers(params),
        analyticsAPI.getRisk(params),
        analyticsAPI.getInsights(params),
      ]);

      if (dRes.status === 'fulfilled') setDash(dRes.value.data?.data ?? null);
      if (aRes.status === 'fulfilled') setAtt(aRes.value.data?.data ?? null);
      if (fRes.status === 'fulfilled') setFees(fRes.value.data?.data ?? null);
      if (acRes.status === 'fulfilled') setAcad(acRes.value.data?.data ?? null);
      if (tRes.status === 'fulfilled') setTeach(tRes.value.data?.data ?? null);
      if (rRes.status === 'fulfilled') setRisk(rRes.value.data?.data ?? null);
      if (iRes.status === 'fulfilled') setInsights(iRes.value.data?.data?.insights ?? []);
    } catch {/* silently ignore */}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const onRefresh = () => { setRefreshing(true); fetchAll(); };

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={COLORS.primary}/>
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  // Build KPI cards from dashboard data
  const kpiCards = [
    { icon: 'user-graduate', label: 'Total Students', value: dash?.total_students?.toLocaleString('en-IN') ?? '—', color: COLORS.primary },
    { icon: 'chalkboard-teacher', label: 'Teaching Staff', value: teachers?.total_teachers?.toString() ?? '—', color: COLORS.info },
    { icon: 'clipboard-check', label: 'Attendance', value: dash?.today_attendance_pct ? `${dash.today_attendance_pct}%` : '—', color: pctColor(dash?.today_attendance_pct ?? 0) },
    { icon: 'rupee-sign', label: 'Fee Collected', value: dash?.fee_collected ? fmtK(dash.fee_collected) : '—', color: COLORS.success },
    { icon: 'exclamation-triangle', label: 'Fee Pending', value: dash?.fee_pending ? fmtK(dash.fee_pending) : '—', color: COLORS.danger },
    { icon: 'book', label: 'Books Issued', value: dash?.books_issued?.toString() ?? '—', color: COLORS.warning },
    { icon: 'bullhorn', label: 'Active Notices', value: dash?.active_notices?.toString() ?? '—', color: COLORS.purple },
    ...(dash?.low_stock_alerts ? [{ icon: 'boxes', label: 'Low Stock', value: dash.low_stock_alerts.toString(), color: COLORS.danger }] : []),
  ];

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]}/>}
    >
      {/* ── Header ──────────────────────────────────────────── */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        style={styles.header}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Institutional Analytics</Text>
            <Text style={styles.headerSub}>Real-Time Intelligence Dashboard</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{user?.roles?.[0]?.name ?? 'Admin'}</Text>
            </View>
          </View>
        </View>
        <Text style={styles.headerNote}>All data is real-time from your ERP database</Text>
      </LinearGradient>

      {/* ── KPI Scroll Strip ────────────────────────────────── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={styles.kpiScroll} contentContainerStyle={styles.kpiScrollContent}>
        {kpiCards.map((card, i) => (
          <KpiScrollCard key={i} icon={card.icon} value={card.value}
            label={card.label} color={card.color}/>
        ))}
      </ScrollView>

      {/* ── Fee Overview ─────────────────────────────────────── */}
      {fees && (
        <SectionCard title="Fee Collection Overview" icon="credit-card" accent={feeColor(fees.collection_pct)}>
          <View style={styles.feeOverview}>
            <RingChart pct={fees.collection_pct}
              color={feeColor(fees.collection_pct)} size={100}
              label="Collected" sub="Collection Rate"/>
            <View style={styles.feeStats}>
              <View style={styles.feeStat}>
                <Text style={styles.feeStatLabel}>Expected</Text>
                <Text style={styles.feeStatValue}>{fmtK(Number(fees.total_demanded))}</Text>
              </View>
              <View style={styles.feeStat}>
                <Text style={styles.feeStatLabel}>Collected</Text>
                <Text style={[styles.feeStatValue, { color: COLORS.success }]}>{fmtK(Number(fees.total_collected))}</Text>
              </View>
              <View style={styles.feeStat}>
                <Text style={styles.feeStatLabel}>Pending</Text>
                <Text style={[styles.feeStatValue, { color: COLORS.danger }]}>{fmtK(Number(fees.total_pending))}</Text>
              </View>
            </View>
          </View>
          {fees.by_fee_type.length > 0 && (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.subLabel}>By Category</Text>
              {fees.by_fee_type.slice(0, 4).map(ft => (
                <ProgressRow key={ft.category} label={ft.category}
                  pct={ft.demanded > 0 ? ft.paid / ft.demanded * 100 : 0}
                  sub={`${fmtK(ft.paid)} / ${fmtK(ft.demanded)}`}
                  barColor={COLORS.primary}/>
              ))}
            </View>
          )}
        </SectionCard>
      )}

      {/* ── Revenue Bar Chart ─────────────────────────────────── */}
      {dash && dash.monthly_revenue.some(m => m.amount > 0) && (
        <SectionCard title="Monthly Revenue" icon="chart-line">
          <MiniBarChart
            data={dash.monthly_revenue
              .filter(m => m.amount > 0)
              .map(m => ({ label: m.month_name.slice(0, 3), value: m.amount }))}
            barColor={COLORS.success}
          />
        </SectionCard>
      )}

      {/* ── Attendance ───────────────────────────────────────── */}
      {attendance && (
        <SectionCard title="Attendance Summary" icon="calendar-alt" accent={pctColor(attendance.overall_pct)}>
          <View style={styles.attRow}>
            <RingChart pct={attendance.overall_pct}
              color={pctColor(attendance.overall_pct)} size={90}
              label="Overall" sub="School Average"/>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <View style={styles.attStat}>
                <Text style={styles.attStatLabel}>Defaulters (&lt;75%)</Text>
                <Text style={[styles.attStatValue, { color: COLORS.danger }]}>{attendance.defaulters_count}</Text>
              </View>
              <TouchableOpacity style={styles.drillBtn}
                onPress={() => navigation.navigate('Attendance')}>
                <Text style={styles.drillBtnText}>Mark Attendance →</Text>
              </TouchableOpacity>
            </View>
          </View>
          {attendance.by_standard.length > 0 && (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.subLabel}>Class-wise Attendance</Text>
              {attendance.by_standard.slice(0, 8).map(s => (
                <ProgressRow key={s.standard}
                  label={`Standard ${s.standard}`}
                  pct={s.present_pct}
                  sub={s.total > 0 ? `${s.total} students` : undefined}/>
              ))}
            </View>
          )}
          {attendance.by_standard.length === 0 && (
            <Text style={styles.noDataText}>No class-wise data found in monthly summaries.</Text>
          )}
        </SectionCard>
      )}

      {/* ── Academic Performance ──────────────────────────────── */}
      {academic && (
        <SectionCard title="Academic Performance" icon="award"
          accent={academic.status === 'no_data' ? COLORS.textMuted : pctColor(academic.pass_pct)}>
          {academic.status === 'no_data' ? (
            <Text style={styles.noDataText}>No examination data found for this academic year.</Text>
          ) : (
            <>
              <View style={styles.acadRow}>
                <RingChart pct={academic.pass_pct}
                  color={pctColor(academic.pass_pct)} size={90}
                  label="Pass Rate"/>
                <View style={{ flex: 1, marginLeft: 16 }}>
                  <View style={styles.acadStat}>
                    <Text style={styles.acadStatLabel}>Appeared</Text>
                    <Text style={styles.acadStatValue}>{academic.students_appeared}</Text>
                  </View>
                  <View style={styles.acadStat}>
                    <Text style={styles.acadStatLabel}>Passed</Text>
                    <Text style={[styles.acadStatValue, { color: COLORS.success }]}>{academic.passed}</Text>
                  </View>
                  <View style={styles.acadStat}>
                    <Text style={styles.acadStatLabel}>Failed</Text>
                    <Text style={[styles.acadStatValue, { color: COLORS.danger }]}>{academic.failed}</Text>
                  </View>
                  <View style={styles.acadStat}>
                    <Text style={styles.acadStatLabel}>Avg Score</Text>
                    <Text style={[styles.acadStatValue, { color: COLORS.info }]}>{academic.avg_percentage}%</Text>
                  </View>
                </View>
              </View>
              {academic.weak_subjects.length > 0 && (
                <View style={styles.weakSubjBox}>
                  <Text style={styles.weakSubjTitle}>Subjects Needing Attention</Text>
                  {academic.weak_subjects.slice(0, 3).map(ws => (
                    <ProgressRow key={ws.subject} label={ws.subject} pct={ws.avg_pct}
                      barColor={COLORS.danger}/>
                  ))}
                </View>
              )}
            </>
          )}
        </SectionCard>
      )}

      {/* ── Teachers ──────────────────────────────────────────── */}
      {teachers && (
        <SectionCard title="Teaching Staff" icon="chalkboard-teacher">
          <View style={styles.teacherRow}>
            <View style={styles.teacherStat}>
              <Text style={[styles.teacherNum, { color: COLORS.primary }]}>{teachers.total_teachers}</Text>
              <Text style={styles.teacherLabel}>Total Staff</Text>
            </View>
            <View style={styles.teacherStat}>
              <Text style={[styles.teacherNum, { color: COLORS.info }]}>{teachers.teaching_staff}</Text>
              <Text style={styles.teacherLabel}>Teaching</Text>
            </View>
            <View style={styles.teacherStat}>
              <Text style={[styles.teacherNum, { color: COLORS.warning }]}>{teachers.total_teachers - teachers.teaching_staff}</Text>
              <Text style={styles.teacherLabel}>Non-Teaching</Text>
            </View>
            {teachers.attendance_pct > 0 && (
              <View style={styles.teacherStat}>
                <Text style={[styles.teacherNum, { color: pctColor(teachers.attendance_pct) }]}>{teachers.attendance_pct}%</Text>
                <Text style={styles.teacherLabel}>Att. Today</Text>
              </View>
            )}
          </View>
        </SectionCard>
      )}

      {/* ── Risk Indicators ───────────────────────────────────── */}
      {risk && (risk.attendance_risk + risk.fee_risk + risk.academic_risk > 0) && (
        <SectionCard title="Students At Risk" icon="exclamation-triangle" accent={COLORS.danger}>
          <View style={styles.riskRow}>
            <View style={[styles.riskBox, { borderColor: COLORS.warning }]}>
              <Text style={[styles.riskNum, { color: COLORS.warning }]}>{risk.attendance_risk}</Text>
              <Text style={styles.riskLabel}>Low{'\n'}Attendance</Text>
            </View>
            <View style={[styles.riskBox, { borderColor: COLORS.danger }]}>
              <Text style={[styles.riskNum, { color: COLORS.danger }]}>{risk.fee_risk}</Text>
              <Text style={styles.riskLabel}>Fee{'\n'}Pending</Text>
            </View>
            <View style={[styles.riskBox, { borderColor: COLORS.purple }]}>
              <Text style={[styles.riskNum, { color: COLORS.purple }]}>{risk.academic_risk}</Text>
              <Text style={styles.riskLabel}>Academic{'\n'}Fail</Text>
            </View>
            <View style={[styles.riskBox, { borderColor: COLORS.danger, borderWidth: 2 }]}>
              <Text style={[styles.riskNum, { color: COLORS.danger }]}>{risk.multi_risk}</Text>
              <Text style={styles.riskLabel}>Multi{'\n'}Risk</Text>
            </View>
          </View>
          {risk.students.slice(0, 5).map(s => (
            <View key={s.student_id} style={styles.riskStudent}>
              <View style={{ flex: 1 }}>
                <Text style={styles.riskStudentName}>{s.name}</Text>
                <Text style={styles.riskStudentClass}>Std {s.standard}{s.division ? `-${s.division}` : ''}</Text>
              </View>
              <View style={styles.riskTags}>
                {s.risk_categories.map(rc => (
                  <View key={rc} style={[styles.riskTag, {
                    backgroundColor: rc === 'attendance' ? '#fef3c7' : rc === 'fee' ? '#fee2e2' : '#ede9fe',
                  }]}>
                    <Text style={[styles.riskTagText, {
                      color: rc === 'attendance' ? COLORS.warning : rc === 'fee' ? COLORS.danger : COLORS.purple,
                    }]}>{rc}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
          {risk.students.length > 5 && (
            <Text style={styles.moreText}>+{risk.students.length - 5} more students need attention</Text>
          )}
        </SectionCard>
      )}

      {/* ── Insights ─────────────────────────────────────────── */}
      {insights.length > 0 && (
        <SectionCard title="School Intelligence Insights" icon="lightbulb">
          <Text style={styles.insightsMeta}>Based on your actual ERP data</Text>
          {insights.map((ins, i) => <InsightRow key={i} ins={ins}/>)}
        </SectionCard>
      )}

      {/* ── No Data Fallback ──────────────────────────────────── */}
      {!dash && !attendance && !fees && (
        <View style={styles.emptyState}>
          <Icon name="chart-bar" size={44} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>No Analytics Data</Text>
          <Text style={styles.emptySub}>Start recording attendance, fees, and exams in the ERP to see analytics here.</Text>
        </View>
      )}

      <View style={{ height: 32 }}/>
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: COLORS.textMuted, fontSize: 14 },

  // Header
  header: {
    paddingTop: Platform.OS === 'ios' ? 54 : 24,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
  headerRight: { alignItems: 'flex-end' },
  roleBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  roleBadgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  headerNote: { color: 'rgba(255,255,255,0.6)', fontSize: 10, marginTop: 12 },

  // KPI Scroll
  kpiScroll: { marginTop: 16 },
  kpiScrollContent: { paddingHorizontal: 16, gap: 10 },
  kpiCard: {
    width: 110,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    borderTopWidth: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  kpiIcon: { fontSize: 22, marginBottom: 6 },
  kpiValue: { fontSize: 18, fontWeight: '800' },
  kpiLabel: { fontSize: 10, color: COLORS.textMuted, marginTop: 3, fontWeight: '500' },
  kpiSub: { fontSize: 9, color: COLORS.textSub, marginTop: 2 },

  // Section Cards
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionIcon: { fontSize: 18 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  subLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted, marginBottom: 8 },

  // Ring chart
  ringSub: { fontSize: 10, color: COLORS.textMuted, marginTop: 4, textAlign: 'center' },

  // Progress bars
  progRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  progLeft: { flex: 1.2 },
  progLabel: { fontSize: 12, fontWeight: '600', color: COLORS.text },
  progSub: { fontSize: 10, color: COLORS.textMuted },
  progTrack: { flex: 2, height: 7, backgroundColor: COLORS.border, borderRadius: 4, overflow: 'hidden' },
  progFill: { height: '100%', borderRadius: 4 },
  progPct: { fontSize: 11, fontWeight: '700', minWidth: 35, textAlign: 'right' },

  // Fee overview
  feeOverview: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  feeStats: { flex: 1, gap: 10 },
  feeStat: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  feeStatLabel: { fontSize: 12, color: COLORS.textMuted },
  feeStatValue: { fontSize: 15, fontWeight: '700', color: COLORS.text },

  // Attendance
  attRow: { flexDirection: 'row', alignItems: 'flex-start' },
  attStat: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  attStatLabel: { fontSize: 12, color: COLORS.textMuted },
  attStatValue: { fontSize: 18, fontWeight: '800' },
  drillBtn: {
    marginTop: 8, backgroundColor: COLORS.bg,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  drillBtnText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },

  // Academic
  acadRow: { flexDirection: 'row', alignItems: 'flex-start' },
  acadStat: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  acadStatLabel: { fontSize: 12, color: COLORS.textMuted },
  acadStatValue: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  weakSubjBox: {
    marginTop: 12, padding: 10, backgroundColor: '#fff7ed',
    borderRadius: 10, borderLeftWidth: 3, borderLeftColor: COLORS.warning,
  },
  weakSubjTitle: { fontSize: 12, fontWeight: '700', color: COLORS.warning, marginBottom: 8 },

  // Teachers
  teacherRow: { flexDirection: 'row', justifyContent: 'space-around' },
  teacherStat: { alignItems: 'center', flex: 1 },
  teacherNum: { fontSize: 24, fontWeight: '800' },
  teacherLabel: { fontSize: 10, color: COLORS.textMuted, marginTop: 3, textAlign: 'center' },

  // Risk
  riskRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  riskBox: {
    flex: 1, alignItems: 'center', padding: 10,
    borderRadius: 10, borderWidth: 1,
    backgroundColor: COLORS.bg,
  },
  riskNum: { fontSize: 22, fontWeight: '800' },
  riskLabel: { fontSize: 9, color: COLORS.textMuted, textAlign: 'center', marginTop: 2 },
  riskStudent: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  riskStudentName: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  riskStudentClass: { fontSize: 11, color: COLORS.textMuted },
  riskTags: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  riskTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  riskTagText: { fontSize: 9, fontWeight: '700', textTransform: 'capitalize' },
  moreText: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', marginTop: 10, fontStyle: 'italic' },

  // Insights
  insightsMeta: { fontSize: 11, color: COLORS.textMuted, marginBottom: 10 },
  insightCard: {
    flexDirection: 'row', gap: 10, padding: 12,
    borderRadius: 10, borderLeftWidth: 4, marginBottom: 8,
    alignItems: 'flex-start',
  },
  insightIcon: { fontSize: 22, marginTop: 2 },
  insightTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 3 },
  insightBody: { fontSize: 12, color: '#374151', lineHeight: 18 },

  // No data
  noDataText: { fontSize: 13, color: COLORS.textMuted, fontStyle: 'italic', textAlign: 'center', paddingVertical: 12 },

  // Empty state
  emptyState: { alignItems: 'center', paddingHorizontal: 32, paddingTop: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  emptySub: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', marginTop: 8, lineHeight: 20 },
});
