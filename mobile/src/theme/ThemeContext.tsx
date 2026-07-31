/**
 * EduShakti One ERP — Theme Context
 * ==================================
 * Provides light/dark theme + role-based accent to every component.
 * Auto-follows device system theme with manual override.
 */
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import {
  lightTheme,
  darkTheme,
  roleAccents,
  type Theme,
  type RoleCode,
  type RoleAccent,
} from './index';

// ─────────────────────────────────────────────────────────────────────────────
// Context Shape
// ─────────────────────────────────────────────────────────────────────────────
interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setRoleCode: (code: string) => void;
  roleAccent: RoleAccent;
  colors: Theme['colors'];
}

const ThemeContext = createContext<ThemeContextType>({
  theme: lightTheme,
  isDark: false,
  toggleTheme: () => {},
  setRoleCode: () => {},
  roleAccent: roleAccents.default,
  colors: lightTheme.colors,
});

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [isDark, setIsDark] = useState(systemScheme === 'dark');
  const [roleCode, setRoleCode] = useState<string>('default');
  const [manualOverride, setManualOverride] = useState(false);

  // Follow system theme unless manually overridden
  useEffect(() => {
    if (!manualOverride) {
      setIsDark(systemScheme === 'dark');
    }
  }, [systemScheme, manualOverride]);

  const toggleTheme = () => {
    setManualOverride(true);
    setIsDark(prev => !prev);
  };

  const theme = isDark ? darkTheme : lightTheme;

  const roleAccent = useMemo(() => {
    const key = roleCode as RoleCode;
    return roleAccents[key] ?? roleAccents.default;
  }, [roleCode]);

  const value: ThemeContextType = useMemo(() => ({
    theme,
    isDark,
    toggleTheme,
    setRoleCode,
    roleAccent,
    colors: theme.colors,
  }), [theme, isDark, roleAccent]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────
export function useTheme() {
  return useContext(ThemeContext);
}
