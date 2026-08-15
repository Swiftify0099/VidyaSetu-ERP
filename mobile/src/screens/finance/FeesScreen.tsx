/**
 * VidyaSetu Mobile — Fee Collection Screen (Premium Redesign)
 * =============================================================
 * Student GR balance lookup, multi-mode fee collection (Cash, UPI, Cheque, Bank Transfer),
 * quick preset amounts, and instant receipt recording.
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from '../../theme/ThemeContext';
import { financeAPI } from '../../services/api';
import { spacing, radius, typography, shadows } from '../../theme';
import { formatCurrency, getErrorMessage } from '../../utils/formatters';
import {
  AppCard,
  AppButton,
  AppBadge,
  AppChip,
  AppSectionHeader,
  AppInput,
} from '../../components/ui';
import Toast from 'react-native-toast-message';

interface StudentFee {
  student_id: number;
  full_name: string;
  gr_number: string;
  balance: number;
  standard?: string;
  division?: string;
}

const PAYMENT_MODES = [
  { id: 'cash',          label: 'Cash',          icon: 'money-bill-wave' },
  { id: 'upi',           label: 'UPI / QR',      icon: 'mobile-alt' },
  { id: 'cheque',        label: 'Cheque',        icon: 'money-check' },
  { id: 'bank_transfer', label: 'Bank Transfer', icon: 'university' },
];

export default function FeesScreen() {
  const { colors, roleAccent } = useTheme();
  const [grInput, setGrInput] = useState('');
  const [student, setStudent] = useState<StudentFee | null>(null);
  const [amount, setAmount] = useState('');
  const [payMode, setPayMode] = useState('cash');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const searchStudent = useCallback(async () => {
    if (!grInput.trim()) return;
    setLoading(true);
    setStudent(null);
    try {
      const res = await financeAPI.getStudentBalance(grInput.trim());
      const data = res.data?.data;
      if (data) {
        setStudent(data);
        setAmount(String(data.balance ?? ''));
      } else {
        Toast.show({ type: 'error', text1: 'No student found with this GR Number' });
      }
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Student lookup failed', text2: getErrorMessage(e) });
    } finally {
      setLoading(false);
    }
  }, [grInput]);

  const collectFee = async () => {
    if (!student || !amount) {
      Toast.show({ type: 'error', text1: 'Enter GR Number and collection amount' });
      return;
    }
    const amtNum = Number(amount);
    if (isNaN(amtNum) || amtNum <= 0) {
      Toast.show({ type: 'error', text1: 'Enter a valid payment amount' });
      return;
    }
    setSaving(true);
    try {
      await financeAPI.collectFee({
        student_id: student.student_id,
        amount: amtNum,
        payment_mode: payMode,
        academic_year: '2025-2026',
      });
      Toast.show({
        type: 'success',
        text1: 'Payment Collected Successfully!',
        text2: `${formatCurrency(amtNum)} recorded for ${student.full_name}`,
      });
      setGrInput('');
      setStudent(null);
      setAmount('');
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Fee Collection Failed', text2: getErrorMessage(e) });
    } finally {
      setSaving(false);
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
            <Text style={styles.headerTitle}>Collect Student Fees</Text>
            <Text style={styles.headerSub}>
              Search student by GR Number to verify outstanding dues & record receipts
            </Text>
          </View>
          <View style={styles.headerIconWrap}>
            <Icon name="receipt" size={22} color="#fff" solid />
          </View>
        </View>
      </LinearGradient>

      <View style={{ padding: spacing.base, gap: spacing.base }}>
        {/* GR Lookup Card */}
        <AppCard variant="bordered" padding={16}>
          <AppSectionHeader title="Lookup Student Record" icon="search" />
          <View style={styles.lookupRow}>
            <View style={{ flex: 1 }}>
              <AppInput
                label="Student GR Number"
                value={grInput}
                onChangeText={setGrInput}
                icon="id-card"
                placeholder="e.g. GR-2025-001"
                autoCapitalize="characters"
                onSubmitEditing={searchStudent}
                containerStyle={{ marginBottom: 0 }}
              />
            </View>
            <AppButton
              label="Search"
              iconLeft="search"
              onPress={searchStudent}
              loading={loading}
              style={{ marginTop: 20 }}
            />
          </View>
        </AppCard>

        {/* Student Balance Card */}
        {student && (
          <AppCard
            variant="default"
            padding={18}
            style={{ borderLeftWidth: 4, borderLeftColor: colors.primary }}
          >
            <View style={styles.studentTitleRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.studentName, { color: colors.text }]}>{student.full_name}</Text>
                <Text style={[styles.studentGR, { color: colors.textSecondary }]}>
                  GR: {student.gr_number} {student.standard ? `• Std ${student.standard}-${student.division || 'A'}` : ''}
                </Text>
              </View>
              <AppBadge
                label={student.balance > 0 ? 'Dues Pending' : 'Fully Paid'}
                variant={student.balance > 0 ? 'danger' : 'success'}
                size="sm"
                rounded
              />
            </View>

            {/* Outstanding Balance Banner */}
            <View style={[styles.balanceBox, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
              <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>Outstanding Balance</Text>
              <Text
                style={[
                  styles.balanceValue,
                  { color: student.balance > 0 ? colors.danger : colors.success },
                ]}
              >
                {formatCurrency(student.balance)}
              </Text>
            </View>

            {/* Collection Amount Input */}
            <View style={{ marginTop: spacing.md }}>
              <AppInput
                label="Amount to Collect (₹)"
                value={amount}
                onChangeText={setAmount}
                icon="rupee-sign"
                placeholder="0.00"
                keyboardType="numeric"
              />

              {/* Quick Amount Chips */}
              <View style={styles.quickAmounts}>
                {student.balance > 0 && (
                  <AppChip
                    label={`Full Due (${formatCurrency(student.balance)})`}
                    selected={amount === String(student.balance)}
                    onPress={() => setAmount(String(student.balance))}
                  />
                )}
                {[1000, 2000, 5000].map(val => (
                  <AppChip
                    key={val}
                    label={`₹${val.toLocaleString('en-IN')}`}
                    selected={amount === String(val)}
                    onPress={() => setAmount(String(val))}
                  />
                ))}
              </View>
            </View>

            {/* Payment Mode Selector */}
            <View style={{ marginTop: spacing.base }}>
              <Text style={[styles.modeHeading, { color: colors.textSecondary }]}>Payment Mode</Text>
              <View style={styles.modeGrid}>
                {PAYMENT_MODES.map(m => {
                  const isSelected = payMode === m.id;
                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={[
                        styles.modeBtn,
                        isSelected
                          ? { backgroundColor: colors.primary, borderColor: colors.primary }
                          : { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
                      ]}
                      onPress={() => setPayMode(m.id)}
                      activeOpacity={0.8}
                    >
                      <Icon
                        name={m.icon}
                        size={14}
                        color={isSelected ? colors.textOnPrimary : colors.textSecondary}
                        solid
                      />
                      <Text
                        style={[
                          styles.modeText,
                          {
                            color: isSelected ? colors.textOnPrimary : colors.textSecondary,
                            fontWeight: isSelected ? typography.weight.bold : typography.weight.medium,
                          },
                        ]}
                      >
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Confirm Submit Button */}
            <AppButton
              label={`Collect ${formatCurrency(amount || 0)} & Issue Receipt`}
              iconLeft="check-circle"
              variant="success"
              size="lg"
              onPress={collectFee}
              loading={saving}
              fullWidth
              style={{ marginTop: spacing.xl }}
            />
          </AppCard>
        )}
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
  lookupRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  studentTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  studentName: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
  },
  studentGR: {
    fontSize: typography.size.xs,
    marginTop: 2,
  },
  balanceBox: {
    padding: spacing.base,
    borderRadius: radius.lg,
    marginTop: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  balanceLabel: {
    fontSize: typography.size['2xs'],
    fontWeight: typography.weight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  balanceValue: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.black,
    marginTop: 2,
  },
  quickAmounts: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
    flexWrap: 'wrap',
  },
  modeHeading: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  modeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  modeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  modeText: {
    fontSize: typography.size.xs,
  },
});
