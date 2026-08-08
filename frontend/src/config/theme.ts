/**
 * VidyaSetu ERP — Centralized Design Tokens & Theme System
 * ===========================================================
 * ALL colors, spacing, typography, shadows → defined here only.
 * Components import from this file — never hardcode values.
 *
 * Usage in React:
 *   import { PALETTE, ROLE_COLORS, applyTheme } from '@/config/theme';
 *
 * CSS Variables are set by ThemeContext on :root dynamically.
 * In CSS Modules, use var(--color-primary) etc.
 */

// ── Palette (brand colors) ────────────────────────────────────
export const PALETTE = {
  indigo:  { 50: '#eef2ff', 100: '#e0e7ff', 400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 900: '#312e81' },
  emerald: { 50: '#d1fae5', 500: '#10b981', 600: '#059669', 700: '#047857' },
  amber:   { 50: '#fef3c7', 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706' },
  red:     { 50: '#fee2e2', 400: '#f87171', 500: '#ef4444', 600: '#dc2626' },
  sky:     { 50: '#e0f2fe', 500: '#0ea5e9', 600: '#0284c7', 700: '#0891b2' },
  purple:  { 50: '#ede9fe', 500: '#8b5cf6', 600: '#7c3aed' },
  gray:    { 50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1', 400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155', 800: '#1e293b', 900: '#0f172a' },
} as const;

// ── Semantic Token Maps ───────────────────────────────────────
export const LIGHT_TOKENS = {
  // Surface
  'bg-base':      '#f8fafc',
  'bg-surface':   '#ffffff',
  'bg-elevated':  '#ffffff',
  'bg-overlay':   'rgba(0,0,0,0.5)',

  // Brand
  'color-primary':   '#4f46e5',
  'color-primary-hover': '#4338ca',
  'color-primary-light': '#eef2ff',

  // Status
  'color-success':  '#059669',
  'color-warning':  '#d97706',
  'color-danger':   '#dc2626',
  'color-info':     '#0891b2',

  // Text
  'text-primary':   '#1e293b',
  'text-secondary': '#475569',
  'text-muted':     '#94a3b8',
  'text-inverse':   '#ffffff',
  'text-link':      '#4f46e5',

  // Border
  'border-color':   '#e2e8f0',
  'border-strong':  '#cbd5e1',

  // Sidebar
  'sidebar-bg':       '#1e293b',
  'sidebar-text':     '#94a3b8',
  'sidebar-text-active': '#ffffff',
  'sidebar-item-hover': 'rgba(255,255,255,0.08)',
  'sidebar-item-active': 'rgba(79,70,229,0.3)',

  // Shadow
  'shadow-sm': '0 1px 3px rgba(0,0,0,0.08)',
  'shadow-md': '0 4px 12px rgba(0,0,0,0.1)',
  'shadow-lg': '0 10px 30px rgba(0,0,0,0.12)',

  // Misc
  'radius-sm': '8px',
  'radius-md': '12px',
  'radius-lg': '16px',
  'radius-xl': '24px',
} as const;

export const DARK_TOKENS: Record<string, string> = {
  'bg-base':      '#0f172a',
  'bg-surface':   '#1e293b',
  'bg-elevated':  '#253347',
  'bg-overlay':   'rgba(0,0,0,0.7)',

  'color-primary':   '#6366f1',
  'color-primary-hover': '#818cf8',
  'color-primary-light': '#312e81',

  'color-success':  '#10b981',
  'color-warning':  '#f59e0b',
  'color-danger':   '#ef4444',
  'color-info':     '#0ea5e9',

  'text-primary':   '#f1f5f9',
  'text-secondary': '#94a3b8',
  'text-muted':     '#64748b',
  'text-inverse':   '#0f172a',
  'text-link':      '#818cf8',

  'border-color':   '#334155',
  'border-strong':  '#475569',

  'sidebar-bg':       '#0f172a',
  'sidebar-text':     '#64748b',
  'sidebar-text-active': '#f1f5f9',
  'sidebar-item-hover': 'rgba(255,255,255,0.06)',
  'sidebar-item-active': 'rgba(99,102,241,0.25)',

  'shadow-sm': '0 1px 3px rgba(0,0,0,0.3)',
  'shadow-md': '0 4px 12px rgba(0,0,0,0.4)',
  'shadow-lg': '0 10px 30px rgba(0,0,0,0.5)',

  'radius-sm': '8px',
  'radius-md': '12px',
  'radius-lg': '16px',
  'radius-xl': '24px',
};

// ── School Branding (can be updated from settings) ───────────
export const SCHOOL_THEME = {
  name:        'Hindkesri Maruti Mane Vidyalay',
  shortName:   'HMMV',
  primaryColor: '#4f46e5',
  accentColor:  '#059669',
  logoUrl:      '/logo.png',
  favicon:      '/favicon.ico',
} as const;

// ── Typography ────────────────────────────────────────────────
export const TYPOGRAPHY = {
  fontFamily:   '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  fontMono:     '"JetBrains Mono", "Fira Code", monospace',
  fontSize: {
    xs:   '11px',
    sm:   '12px',
    base: '14px',
    md:   '15px',
    lg:   '16px',
    xl:   '18px',
    '2xl':'22px',
    '3xl':'28px',
    '4xl':'36px',
  },
  fontWeight: { normal: 400, medium: 500, semibold: 600, bold: 700, extrabold: 800, black: 900 },
  lineHeight: { tight: 1.25, normal: 1.5, relaxed: 1.75 },
} as const;

// ── Spacing ───────────────────────────────────────────────────
export const SPACING = {
  1: '4px', 2: '8px', 3: '12px', 4: '16px', 5: '20px',
  6: '24px', 8: '32px', 10: '40px', 12: '48px', 16: '64px',
} as const;

// ── Z-index ───────────────────────────────────────────────────
export const Z_INDEX = {
  base:    0,
  raised:  10,
  overlay: 100,
  modal:   200,
  toast:   300,
  tooltip: 400,
} as const;

// ── Role color map ────────────────────────────────────────────
export const ROLE_COLORS: Record<string, string> = {
  super_admin:       '#dc2626',
  admin:             '#b91c1c',
  principal:         '#7c3aed',
  vice_principal:    '#6d28d9',
  teacher:           '#2563eb',
  class_teacher:     '#1d4ed8',
  clerk:             '#0891b2',
  accountant:        '#059669',
  librarian:         '#d97706',
  receptionist:      '#ec4899',
  office_staff:      '#6b7280',
  student:           '#10b981',
  parent:            '#f59e0b',
  exam_coordinator:  '#8b5cf6',
  transport_incharge:'#f97316',
  support_staff:     '#9ca3af',
};

// ── Helper: inject CSS vars on root element ───────────────────
export type ThemeMode = 'light' | 'dark';

export function applyTheme(mode: ThemeMode, customBrand?: { primaryColor?: string }) {
  const tokens = mode === 'dark' ? DARK_TOKENS : LIGHT_TOKENS;
  const root = document.documentElement;

  Object.entries(tokens).forEach(([key, value]) => {
    root.style.setProperty(`--${key}`, value);
  });

  if (customBrand?.primaryColor) {
    root.style.setProperty('--color-primary', customBrand.primaryColor);
  }

  root.setAttribute('data-theme', mode);
}
