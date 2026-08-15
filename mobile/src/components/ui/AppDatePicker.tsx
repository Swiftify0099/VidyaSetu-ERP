/**
 * VidyaSetu Mobile — AppDatePicker Component
 * ===========================================
 * Mobile date selection trigger with quick shortcuts (Today, Yesterday, Tomorrow)
 * and formatted date display.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  StyleProp,
  ViewStyle,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, radius, typography, shadows } from '../../theme';
import { formatDateLong } from '../../utils/formatters';
import AppButton from './AppButton';
import AppChip from './AppChip';

export interface AppDatePickerProps {
  label: string;
  value: string; // YYYY-MM-DD
  onChangeDate: (date: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function AppDatePicker({
  label,
  value,
  onChangeDate,
  placeholder = 'Select date...',
  error,
  disabled = false,
  style,
}: AppDatePickerProps) {
  const { colors } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  const getYesterdayStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  };

  const getTomorrowStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  const setPreset = (dt: string) => {
    onChangeDate(dt);
    setModalVisible(false);
  };

  return (
    <View style={[styles.container, style]}>
      {/* Label */}
      {label ? (
        <Text style={[styles.label, { color: error ? colors.danger : colors.textSecondary }]}>
          {label}
        </Text>
      ) : null}

      {/* Trigger Button */}
      <TouchableOpacity
        style={[
          styles.trigger,
          {
            backgroundColor: colors.inputBg,
            borderColor: error ? colors.danger : colors.inputBorder,
            borderRadius: radius.md,
            opacity: disabled ? 0.55 : 1,
          },
        ]}
        onPress={() => !disabled && setModalVisible(true)}
        activeOpacity={0.75}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value ? formatDateLong(value) : placeholder}`}
      >
        <Icon
          name="calendar-alt"
          size={14}
          color={error ? colors.danger : colors.textTertiary}
          style={styles.leftIcon}
          solid
        />
        <Text
          style={[
            styles.triggerText,
            {
              color: value ? colors.text : colors.placeholder,
              fontWeight: value ? typography.weight.medium : typography.weight.regular,
            },
          ]}
        >
          {value ? formatDateLong(value) : placeholder}
        </Text>
        <Icon name="chevron-down" size={12} color={colors.textTertiary} />
      </TouchableOpacity>

      {/* Error Row */}
      {error && (
        <View style={styles.errorRow}>
          <Icon name="exclamation-circle" size={11} color={colors.danger} solid />
          <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
        </View>
      )}

      {/* Quick Select Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <SafeAreaView style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{label || 'Select Date'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Icon name="times" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Quick Select</Text>
              <View style={styles.chipRow}>
                <AppChip
                  label="Yesterday"
                  selected={value === getYesterdayStr()}
                  onPress={() => setPreset(getYesterdayStr())}
                />
                <AppChip
                  label="Today"
                  selected={value === todayStr}
                  onPress={() => setPreset(todayStr)}
                />
                <AppChip
                  label="Tomorrow"
                  selected={value === getTomorrowStr()}
                  onPress={() => setPreset(getTomorrowStr())}
                />
              </View>

              <View style={[styles.currentSelectedBox, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                <Icon name="calendar-check" size={16} color={colors.primary} solid />
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <Text style={[styles.selectedHeading, { color: colors.textSecondary }]}>Selected Date</Text>
                  <Text style={[styles.selectedValue, { color: colors.text }]}>
                    {value ? formatDateLong(value) : 'None'}
                  </Text>
                </View>
              </View>

              <AppButton
                label="Confirm Date"
                variant="primary"
                onPress={() => setModalVisible(false)}
                fullWidth
                style={{ marginTop: spacing.md }}
              />
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.base,
  },
  label: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    marginBottom: spacing.xs,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: spacing.base,
    borderWidth: 1.2,
  },
  leftIcon: {
    marginRight: spacing.sm,
  },
  triggerText: {
    flex: 1,
    fontSize: typography.size.base,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  errorText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    paddingBottom: spacing.xl,
    ...shadows.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.base,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
  },
  modalBody: {
    padding: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  currentSelectedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.base,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginVertical: spacing.sm,
  },
  selectedHeading: {
    fontSize: typography.size['2xs'],
    fontWeight: typography.weight.semibold,
    textTransform: 'uppercase',
  },
  selectedValue: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    marginTop: 1,
  },
});
