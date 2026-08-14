/**
 * VidyaSetu Mobile — AppSelect Component
 * =======================================
 * Premium modal picker with searchable options, checkmark selection,
 * clean trigger button, and error state handling.
 */
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  StyleSheet,
  StyleProp,
  ViewStyle,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, radius, typography, shadows } from '../../theme';

export interface SelectOption {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
}

export interface AppSelectProps {
  label: string;
  value: string | number | null | undefined;
  options: SelectOption[];
  onSelect: (value: any) => void;
  placeholder?: string;
  icon?: string;
  error?: string;
  disabled?: boolean;
  searchable?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

export default function AppSelect({
  label,
  value,
  options,
  onSelect,
  placeholder = 'Select option...',
  icon,
  error,
  disabled = false,
  searchable = true,
  containerStyle,
}: AppSelectProps) {
  const { colors } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState('');

  const selectedOption = useMemo(() => {
    return options.find(o => String(o.value) === String(value));
  }, [options, value]);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(
      o => o.label.toLowerCase().includes(q) || (o.subtitle && o.subtitle.toLowerCase().includes(q))
    );
  }, [options, search]);

  const handleSelect = (val: any) => {
    onSelect(val);
    setModalVisible(false);
    setSearch('');
  };

  const showSearch = searchable && options.length > 5;

  return (
    <View style={[styles.container, containerStyle]}>
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
        accessibilityLabel={`${label}: ${selectedOption?.label || placeholder}`}
      >
        {icon && (
          <Icon
            name={icon}
            size={14}
            color={error ? colors.danger : colors.textTertiary}
            style={styles.leftIcon}
          />
        )}
        <Text
          style={[
            styles.triggerText,
            {
              color: selectedOption ? colors.text : colors.placeholder,
              fontWeight: selectedOption ? typography.weight.medium : typography.weight.regular,
            },
          ]}
          numberOfLines={1}
        >
          {selectedOption ? selectedOption.label : placeholder}
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

      {/* Selection Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <SafeAreaView style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            {/* Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{label || 'Select Option'}</Text>
              <TouchableOpacity
                onPress={() => { setModalVisible(false); setSearch(''); }}
                style={styles.closeBtn}
                accessibilityLabel="Close"
              >
                <Icon name="times" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            {showSearch && (
              <View style={[styles.searchWrapper, { borderBottomColor: colors.border }]}>
                <View style={[styles.modalSearchBox, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                  <Icon name="search" size={13} color={colors.textTertiary} />
                  <TextInput
                    style={[styles.modalSearchInput, { color: colors.text }]}
                    placeholder="Search options..."
                    placeholderTextColor={colors.placeholder}
                    value={search}
                    onChangeText={setSearch}
                    autoCapitalize="none"
                    clearButtonMode="while-editing"
                  />
                </View>
              </View>
            )}

            {/* Options List */}
            <FlatList
              data={filteredOptions}
              keyExtractor={item => String(item.value)}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingVertical: spacing.sm }}
              renderItem={({ item }) => {
                const isSelected = String(item.value) === String(value);
                return (
                  <TouchableOpacity
                    style={[
                      styles.optionItem,
                      isSelected && { backgroundColor: colors.primaryBg },
                    ]}
                    onPress={() => handleSelect(item.value)}
                    activeOpacity={0.7}
                  >
                    {item.icon && (
                      <Icon
                        name={item.icon}
                        size={14}
                        color={isSelected ? colors.primary : colors.textTertiary}
                        style={{ marginRight: spacing.md }}
                      />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.optionLabel,
                          {
                            color: isSelected ? colors.primary : colors.text,
                            fontWeight: isSelected ? typography.weight.bold : typography.weight.medium,
                          },
                        ]}
                      >
                        {item.label}
                      </Text>
                      {item.subtitle && (
                        <Text style={[styles.optionSubtitle, { color: colors.textSecondary }]}>
                          {item.subtitle}
                        </Text>
                      )}
                    </View>
                    {isSelected && (
                      <Icon name="check" size={14} color={colors.primary} solid />
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                    No matching options found
                  </Text>
                </View>
              }
            />
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
  modalContent: {
    maxHeight: '75%',
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    paddingBottom: spacing.lg,
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
  closeBtn: {
    padding: spacing.xs,
  },
  searchWrapper: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: typography.size.sm,
    marginLeft: spacing.sm,
    paddingVertical: 0,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  optionLabel: {
    fontSize: typography.size.base,
  },
  optionSubtitle: {
    fontSize: typography.size.xs,
    marginTop: 2,
  },
  emptyWrap: {
    padding: spacing['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: typography.size.sm,
  },
});
