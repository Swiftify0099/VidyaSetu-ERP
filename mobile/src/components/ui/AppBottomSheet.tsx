/**
 * VidyaSetu Mobile — AppBottomSheet Component
 * ============================================
 * Modal bottom sheet with drag indicator, title, backdrop dismiss,
 * and responsive scrollable container.
 */
import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StyleProp,
  ViewStyle,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  DimensionValue,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, radius, typography, shadows } from '../../theme';

export interface AppBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  maxHeight?: DimensionValue;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  showClose?: boolean;
}

export default function AppBottomSheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
  maxHeight = '85%',
  style,
  contentStyle,
  showClose = true,
}: AppBottomSheetProps) {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlayWrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity
          style={[styles.backdrop, { backgroundColor: colors.overlay }]}
          activeOpacity={1}
          onPress={onClose}
        />

        <SafeAreaView style={[styles.sheetContainer, { backgroundColor: colors.surface, maxHeight }, style]}>
          {/* Drag Handle */}
          <View style={styles.dragHandleWrap}>
            <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />
          </View>

          {/* Header */}
          {(title || showClose) && (
            <View style={[styles.headerRow, { borderBottomColor: colors.divider }]}>
              <View style={styles.headerTextWrap}>
                {title && (
                  <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                )}
                {subtitle && (
                  <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
                )}
              </View>
              {showClose && (
                <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close">
                  <Icon name="times" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Body Content */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[styles.bodyContent, contentStyle]}
          >
            {children}
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlayWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetContainer: {
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    ...shadows.xl,
  },
  dragHandleWrap: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  dragHandle: {
    width: 38,
    height: 4.5,
    borderRadius: radius.full,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
  },
  subtitle: {
    fontSize: typography.size.xs,
    marginTop: 2,
  },
  closeBtn: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
  bodyContent: {
    padding: spacing.base,
    paddingBottom: spacing['2xl'],
  },
});
