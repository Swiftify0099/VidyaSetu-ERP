/**
 * VidyaSetu Mobile — AppSearchBar Component
 * ==========================================
 * Interactive search bar with debounce support, animated active ring,
 * clear action, and optional filter drawer/modal trigger.
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, radius, typography, shadows } from '../../theme';

export interface AppSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onDebounceChange?: (text: string) => void;
  debounceMs?: number;
  placeholder?: string;
  onFilterPress?: () => void;
  hasActiveFilters?: boolean;
  loading?: boolean;
  autoFocus?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function AppSearchBar({
  value,
  onChangeText,
  onDebounceChange,
  debounceMs = 300,
  placeholder = 'Search...',
  onFilterPress,
  hasActiveFilters = false,
  loading = false,
  autoFocus = false,
  style,
}: AppSearchBarProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const debounceTimer = useRef<any>(null);

  const handleChange = useCallback((text: string) => {
    onChangeText(text);

    if (onDebounceChange) {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        onDebounceChange(text);
      }, debounceMs);
    }
  }, [onChangeText, onDebounceChange, debounceMs]);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  return (
    <View style={[styles.container, style]}>
      <View
        style={[
          styles.searchBox,
          {
            backgroundColor: colors.inputBg,
            borderColor: focused ? colors.borderFocus : colors.border,
            borderWidth: focused ? 1.5 : 1,
            ...shadows.xs,
          },
        ]}
      >
        {/* Search Icon */}
        <Icon
          name="search"
          size={14}
          color={focused ? colors.primary : colors.textTertiary}
          style={styles.searchIcon}
        />

        {/* Input */}
        <TextInput
          style={[
            styles.input,
            {
              color: colors.text,
            },
          ]}
          value={value}
          onChangeText={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          autoFocus={autoFocus}
          returnKeyType="search"
          clearButtonMode="never"
        />

        {/* Loading Spinner */}
        {loading && (
          <ActivityIndicator size="small" color={colors.primary} style={styles.rightAction} />
        )}

        {/* Clear Button */}
        {!loading && !!value && (
          <TouchableOpacity
            style={styles.rightAction}
            onPress={() => handleChange('')}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
          >
            <Icon name="times-circle" size={14} color={colors.textTertiary} solid />
          </TouchableOpacity>
        )}

        {/* Filter Button */}
        {onFilterPress && (
          <TouchableOpacity
            style={[
              styles.filterBtn,
              {
                backgroundColor: hasActiveFilters ? colors.primaryBg : colors.surfaceAlt,
                borderColor: hasActiveFilters ? colors.primaryBorder : colors.border,
              },
            ]}
            onPress={onFilterPress}
            accessibilityRole="button"
            accessibilityLabel="Toggle filters"
          >
            <Icon
              name="sliders-h"
              size={12}
              color={hasActiveFilters ? colors.primary : colors.textSecondary}
              solid
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.sm,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: typography.size.base,
    paddingVertical: 0,
    fontWeight: typography.weight.medium,
  },
  rightAction: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
  filterBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
    borderWidth: 1,
  },
});
