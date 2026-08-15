/**
 * VidyaSetu Mobile — Reports & Exports Screen (Premium Redesign)
 * ==============================================================
 * Institutional data exports for Students, Fees, Attendance, Marks, Defaulters, and Library.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from '../../theme/ThemeContext';
import { api } from '../../services/api';
import { spacing, radius, typography, shadows } from '../../theme';
import {
  AppCard,
  AppBadge,
  AppSectionHeader,
} from '../../components/ui';
import Toast from 'react-native-toast-message';

interface ReportConfig {
  id: string;
  icon: string;
  label: string;
  sub: string;
  endpoint: string;
  color: string;
  format: string;
}

const REPORTS: ReportConfig[] = [
  { id: 'students',   icon: 'user-graduate',       label: 'Student Directory',   sub: 'Complete demographic & enrollment roster', endpoint: '/exports/students/excel',   color: '#4f46e5', format: 'XLSX' },
  { id: 'fees',       icon: 'rupee-sign',          label: 'Fee Collection',      sub: 'Summary & collection breakdown',           endpoint: '/exports/fees/excel',       color: '#059669', format: 'XLSX' },
  { id: 'attendance', icon: 'clipboard-check',     label: 'Attendance Register', sub: 'Daily & monthly attendance logs',          endpoint: '/exports/attendance/excel', color: '#d97706', format: 'XLSX' },
  { id: 'marks',      icon: 'file-alt',            label: 'Examination Marks',   sub: 'Subject-wise marks and overall grades',     endpoint: '/exports/marks/excel',      color: '#7c3aed', format: 'XLSX' },
  { id: 'defaulters', icon: 'exclamation-triangle',label: 'Defaulters Report',   sub: 'Attendance (<75%) & Fee overdue list',     endpoint: '/exports/defaulters/excel', color: '#dc2626', format: 'XLSX' },
  { id: 'library',    icon: 'book',                label: 'Library Circulation', sub: 'Issued, available & overdue books list',   endpoint: '/exports/library/excel',    color: '#0891b2', format: 'XLSX' },
];

export default function ReportsScreen() {
  const { colors, roleAccent } = useTheme();
  const [downloading, setDownloading] = useState<string | null>(null);

  const downloadReport = async (report: ReportConfig) => {
    setDownloading(report.id);
    try {
      await api.get(report.endpoint, { params: { academic_year: '2025-2026' } });
      Toast.show({
        type: 'success',
        text1: `${report.label} Generated`,
        text2: `Export file prepared successfully for Academic Year 2025-2026.`,
      });
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Export Failed',
        text2: 'Server was unable to generate report. Please try again.',
      });
    } finally {
      setDownloading(null);
    }
  };

  return (
    <ScrollView
      style={[styles.page, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header Banner */}
      <LinearGradient
        colors={roleAccent.gradient}
        style={styles.headerBanner}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Reports & Exports</Text>
            <Text style={styles.headerSub}>
              Generate and export official institutional spreadsheets and audit logs
            </Text>
          </View>
          <View style={styles.headerIconWrap}>
            <Icon name="file-excel" size={24} color="#fff" solid />
          </View>
        </View>
      </LinearGradient>

      <View style={{ padding: spacing.base }}>
        <AppSectionHeader title="Available Datasets" icon="chart-pie" />

        <View style={{ gap: spacing.sm }}>
          {REPORTS.map(r => {
            const isWorking = downloading === r.id;
            return (
              <TouchableOpacity
                key={r.id}
                activeOpacity={0.8}
                onPress={() => downloadReport(r)}
                disabled={isWorking}
              >
                <AppCard
                  variant="bordered"
                  padding={16}
                  style={{ borderLeftWidth: 3.5, borderLeftColor: r.color }}
                >
                  <View style={styles.cardRow}>
                    <View style={[styles.iconBox, { backgroundColor: `${r.color}15` }]}>
                      <Icon name={r.icon} size={18} color={r.color} solid />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.titleRow}>
                        <Text style={[styles.cardLabel, { color: colors.text }]}>{r.label}</Text>
                        <AppBadge label={r.format} variant="primary" size="sm" rounded />
                      </View>
                      <Text style={[styles.cardSub, { color: colors.textSecondary }]}>{r.sub}</Text>
                    </View>
                    <View
                      style={[
                        styles.actionCircle,
                        { backgroundColor: isWorking ? colors.surfaceAlt : colors.primaryBg },
                      ]}
                    >
                      {isWorking ? (
                        <ActivityIndicator size="small" color={r.color} />
                      ) : (
                        <Icon name="download" size={14} color={r.color} solid />
                      )}
                    </View>
                  </View>
                </AppCard>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  content: {
    paddingBottom: spacing['3xl'],
  },
  headerBanner: {
    padding: spacing.xl,
    paddingTop: Platform.OS === 'ios' ? 24 : spacing.xl,
    borderBottomLeftRadius: radius['2xl'],
    borderBottomRightRadius: radius['2xl'],
    ...shadows.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.extrabold,
    color: '#ffffff',
  },
  headerSub: {
    fontSize: typography.size.xs,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
    lineHeight: 18,
  },
  headerIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.md,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLabel: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
  },
  cardSub: {
    fontSize: typography.size.xs,
    marginTop: 3,
  },
  actionCircle: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
