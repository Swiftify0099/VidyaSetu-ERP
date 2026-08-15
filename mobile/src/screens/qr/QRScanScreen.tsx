/**
 * VidyaSetu Mobile — QR Center & Digital ID Screen (Premium Redesign)
 * ====================================================================
 * Instant QR-based attendance verification, library barcode scanning,
 * and Student Digital QR ID Card presentation.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from '../../theme/ThemeContext';
import { useAuthStore } from '../../store/authStore';
import { qrAPI } from '../../services/api';
import { spacing, radius, typography, shadows } from '../../theme';
import {
  AppCard,
  AppButton,
  AppBadge,
  AppTabs,
  AppInput,
  AppAvatar,
} from '../../components/ui';
import Toast from 'react-native-toast-message';
import { getErrorMessage } from '../../utils/formatters';

const { width } = Dimensions.get('window');

export default function QRScanScreen({ navigation }: { navigation: any }) {
  const { colors, roleAccent } = useTheme();
  const { user } = useAuthStore();
  const role = user?.roles?.[0]?.code ?? '';
  const isStudent = role === 'student';

  const [activeTab, setActiveTab] = useState<'id_card' | 'quick_scan'>('id_card');
  const [grOrQrInput, setGrOrQrInput] = useState('');
  const [scanType, setScanType] = useState<'attendance' | 'library'>('attendance');
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);

  const studentPayload = JSON.stringify({
    app: 'VidyaSetu',
    id: user?.id ?? 1,
    name: user?.full_name ?? 'Student',
    role: 'student',
    username: user?.username ?? '',
    timestamp: Date.now(),
  });

  const handleManualScan = async () => {
    if (!grOrQrInput.trim()) {
      Toast.show({ type: 'error', text1: 'Enter a valid GR or QR payload' });
      return;
    }
    setLoading(true);
    setScanResult(null);
    try {
      if (scanType === 'attendance') {
        const res = await qrAPI.scanAttendance({
          qr_code: grOrQrInput.trim(),
          att_date: new Date().toISOString().split('T')[0],
          status: 'present',
        });
        setScanResult(res.data?.data ?? { message: 'Attendance recorded successfully!' });
        Toast.show({ type: 'success', text1: 'Attendance Verified & Marked!' });
      } else {
        const res = await qrAPI.scanLibrary({
          barcode: grOrQrInput.trim(),
          action: 'issue',
        });
        setScanResult(res.data?.data ?? { message: 'Library action processed!' });
        Toast.show({ type: 'success', text1: 'Library Book Verified!' });
      }
    } catch (e: any) {
      Toast.show({
        type: 'error',
        text1: 'Verification Failed',
        text2: getErrorMessage(e),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Tab Switcher */}
      {!isStudent && (
        <View style={[styles.tabsWrap, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <AppTabs
            tabs={[
              { key: 'id_card', label: 'Digital ID Pass', icon: 'id-card' },
              { key: 'quick_scan', label: 'QR Scanner', icon: 'qrcode' },
            ]}
            activeTab={activeTab}
            onChangeTab={k => setActiveTab(k as any)}
            variant="segmented"
          />
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'id_card' ? (
          /* Digital ID Card View */
          <View style={styles.cardWrapper}>
            <LinearGradient
              colors={roleAccent.gradient}
              style={styles.idCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {/* Top Bar of ID Card */}
              <View style={styles.idTop}>
                <View>
                  <Text style={styles.schoolTitle}>VIDYASETU ACADEMY</Text>
                  <Text style={styles.schoolSub}>Official Identity Pass</Text>
                </View>
                <AppBadge
                  label={user?.roles?.[0]?.name ?? 'STUDENT'}
                  variant="neutral"
                  size="sm"
                  rounded
                />
              </View>

              {/* User Photo & Info */}
              <View style={styles.idBody}>
                <AppAvatar
                  name={user?.full_name}
                  size="lg"
                  roleColor="#ffffff"
                />
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={styles.studentName}>{user?.full_name ?? 'Student Name'}</Text>
                  <Text style={styles.studentMeta}>User ID: VS-{user?.id ?? '1001'}</Text>
                  <Text style={styles.studentMeta}>Academic Year: 2025-2026</Text>
                </View>
              </View>

              {/* QR Code Container */}
              <View style={styles.qrContainer}>
                <View style={styles.qrWhiteBox}>
                  <QRCode
                    value={studentPayload}
                    size={150}
                    color="#1e1b4b"
                    backgroundColor="#ffffff"
                  />
                </View>
                <Text style={styles.qrHelp}>
                  Scan at campus gates, library checkouts & attendance terminals
                </Text>
              </View>

              {/* Bottom Card Strip */}
              <View style={styles.idFooter}>
                <View style={styles.statusDotRow}>
                  <View style={styles.statusDot} />
                  <Text style={styles.validText}>Valid & Active Student Identity</Text>
                </View>
                <Icon name="shield-alt" size={14} color="rgba(255,255,255,0.7)" />
              </View>
            </LinearGradient>
          </View>
        ) : (
          /* QR Verification Mode */
          <View style={{ gap: spacing.base }}>
            <AppCard variant="bordered" padding={16}>
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
                <TouchableOpacity
                  style={[
                    styles.typeBtn,
                    scanType === 'attendance'
                      ? { backgroundColor: colors.primary, borderColor: colors.primary }
                      : { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
                  ]}
                  onPress={() => setScanType('attendance')}
                  activeOpacity={0.8}
                >
                  <Icon
                    name="clipboard-check"
                    size={13}
                    color={scanType === 'attendance' ? '#fff' : colors.textSecondary}
                    solid
                  />
                  <Text
                    style={[
                      styles.typeBtnText,
                      { color: scanType === 'attendance' ? '#fff' : colors.textSecondary },
                    ]}
                  >
                    Attendance QR
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.typeBtn,
                    scanType === 'library'
                      ? { backgroundColor: colors.primary, borderColor: colors.primary }
                      : { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
                  ]}
                  onPress={() => setScanType('library')}
                  activeOpacity={0.8}
                >
                  <Icon
                    name="book"
                    size={13}
                    color={scanType === 'library' ? '#fff' : colors.textSecondary}
                    solid
                  />
                  <Text
                    style={[
                      styles.typeBtnText,
                      { color: scanType === 'library' ? '#fff' : colors.textSecondary },
                    ]}
                  >
                    Library Barcode
                  </Text>
                </TouchableOpacity>
              </View>

              <AppInput
                label="Student GR / QR Token Code"
                value={grOrQrInput}
                onChangeText={setGrOrQrInput}
                icon="barcode"
                placeholder="Scan or enter code payload..."
                autoCapitalize="characters"
                onSubmitEditing={handleManualScan}
              />

              <AppButton
                label={scanType === 'attendance' ? 'Verify & Mark Present' : 'Process Book Scan'}
                iconLeft="check"
                variant="primary"
                size="lg"
                onPress={handleManualScan}
                loading={loading}
                fullWidth
              />
            </AppCard>

            {/* Scan Verification Result Card */}
            {scanResult && (
              <AppCard
                variant="default"
                padding={16}
                style={{ borderLeftWidth: 4, borderLeftColor: colors.success }}
              >
                <View style={styles.resRow}>
                  <Icon name="check-circle" size={24} color={colors.success} solid />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.resTitle, { color: colors.text }]}>Verified Successfully</Text>
                    <Text style={[styles.resMsg, { color: colors.textSecondary }]}>
                      {scanResult.message ?? JSON.stringify(scanResult)}
                    </Text>
                  </View>
                </View>
              </AppCard>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  tabsWrap: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  content: {
    padding: spacing.base,
    paddingBottom: spacing['3xl'],
  },
  cardWrapper: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  idCard: {
    width: Math.min(width - 32, 360),
    borderRadius: radius['2xl'],
    padding: spacing.xl,
    ...shadows.xl,
  },
  idTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.base,
  },
  schoolTitle: {
    color: '#ffffff',
    fontSize: typography.size.sm,
    fontWeight: typography.weight.extrabold,
    letterSpacing: 1,
  },
  schoolSub: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: typography.size['2xs'],
    marginTop: 1,
  },
  idBody: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  studentName: {
    color: '#ffffff',
    fontSize: typography.size.base,
    fontWeight: typography.weight.extrabold,
  },
  studentMeta: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: typography.size.xs,
    marginTop: 2,
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  qrWhiteBox: {
    padding: spacing.md,
    backgroundColor: '#ffffff',
    borderRadius: radius.xl,
    ...shadows.md,
  },
  qrHelp: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: typography.size['2xs'],
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 16,
    paddingHorizontal: spacing.sm,
  },
  idFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  statusDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: radius.full,
    backgroundColor: '#34d399',
  },
  validText: {
    color: '#ffffff',
    fontSize: typography.size['2xs'],
    fontWeight: typography.weight.bold,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  typeBtnText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
  },
  resRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  resTitle: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
  },
  resMsg: {
    fontSize: typography.size.xs,
    marginTop: 2,
  },
});
