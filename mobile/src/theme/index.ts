/**
 * EduShakti One ERP — Premium Design System
 * ==========================================
 * Single source of truth for all design tokens.
 * Every component, screen, and style imports from here.
 * NO hardcoded colors, fonts, or spacing anywhere else.
 */

// ─────────────────────────────────────────────────────────────────────────────
// SPACING — 4px base unit
// ─────────────────────────────────────────────────────────────────────────────
export const spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  base: 16,
  lg:  20,
  xl:  24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// BORDER RADIUS
// ─────────────────────────────────────────────────────────────────────────────
export const radius = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  '2xl': 28,
  '3xl': 36,
  full: 9999,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// TYPOGRAPHY
// ─────────────────────────────────────────────────────────────────────────────
export const typography = {
  size: {
    xs:   10,
    sm:   12,
    base: 14,
    md:   15,
    lg:   17,
    xl:   20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 34,
    '5xl': 42,
  },
  weight: {
    regular:   '400' as const,
    medium:    '500' as const,
    semibold:  '600' as const,
    bold:      '700' as const,
    extrabold: '800' as const,
    black:     '900' as const,
  },
  lineHeight: {
    tight:   1.2,
    normal:  1.5,
    relaxed: 1.75,
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// PALETTE — Base colors (not exposed directly, used to build themes)
// ─────────────────────────────────────────────────────────────────────────────
const palette = {
  // Indigo (primary brand)
  indigo50:  '#eef2ff',
  indigo100: '#e0e7ff',
  indigo200: '#c7d2fe',
  indigo400: '#818cf8',
  indigo500: '#6366f1',
  indigo600: '#4f46e5',
  indigo700: '#4338ca',
  indigo800: '#3730a3',
  indigo900: '#312e81',

  // Emerald (student/success)
  emerald50:  '#ecfdf5',
  emerald100: '#d1fae5',
  emerald400: '#34d399',
  emerald500: '#10b981',
  emerald600: '#059669',
  emerald700: '#047857',

  // Amber (parent/warning)
  amber50:  '#fffbeb',
  amber100: '#fef3c7',
  amber400: '#fbbf24',
  amber500: '#f59e0b',
  amber600: '#d97706',
  amber700: '#b45309',

  // Blue (teacher)
  blue50:  '#eff6ff',
  blue100: '#dbeafe',
  blue400: '#60a5fa',
  blue500: '#3b82f6',
  blue600: '#2563eb',
  blue700: '#1d4ed8',

  // Cyan (librarian)
  cyan500: '#06b6d4',
  cyan600: '#0891b2',

  // Rose (danger/error)
  rose50:  '#fff1f2',
  rose100: '#ffe4e6',
  rose400: '#fb7185',
  rose500: '#f43f5e',
  rose600: '#e11d48',

  // Neutral
  white:    '#ffffff',
  black:    '#000000',
  neutral50:  '#f9fafb',
  neutral100: '#f3f4f6',
  neutral200: '#e5e7eb',
  neutral300: '#d1d5db',
  neutral400: '#9ca3af',
  neutral500: '#6b7280',
  neutral600: '#4b5563',
  neutral700: '#374151',
  neutral800: '#1f2937',
  neutral900: '#111827',
  neutral950: '#030712',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// SHADOWS
// ─────────────────────────────────────────────────────────────────────────────
export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 16,
  },
  colored: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  }),
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// LIGHT THEME
// ─────────────────────────────────────────────────────────────────────────────
export const lightTheme = {
  isDark: false,

  colors: {
    // Brand
    primary:       palette.indigo600,
    primaryLight:  palette.indigo400,
    primaryDark:   palette.indigo700,
    primaryBg:     palette.indigo50,
    primaryBorder: palette.indigo200,

    // Semantic
    success:      palette.emerald500,
    successLight: palette.emerald50,
    successBg:    palette.emerald100,

    warning:      palette.amber500,
    warningLight: palette.amber400,
    warningBg:    palette.amber50,

    danger:       palette.rose500,
    dangerLight:  palette.rose400,
    dangerBg:     palette.rose50,

    info:         palette.blue500,
    infoBg:       palette.blue50,

    // Surface
    background:   palette.neutral50,
    surface:      palette.white,
    surfaceAlt:   palette.neutral100,
    surfaceRaised: palette.white,
    border:       palette.neutral200,
    borderFocus:  palette.indigo500,
    divider:      palette.neutral100,

    // Text
    text:          palette.neutral900,
    textSecondary: palette.neutral500,
    textTertiary:  palette.neutral400,
    textInverse:   palette.white,
    textOnPrimary: palette.white,

    // Tab Bar
    tabBar:         palette.white,
    tabBarBorder:   palette.neutral100,
    tabActive:      palette.indigo600,
    tabInactive:    palette.neutral400,

    // Header
    header:         palette.white,
    headerText:     palette.neutral900,

    // Input
    inputBg:        palette.neutral50,
    inputBorder:    palette.neutral200,
    placeholder:    palette.neutral400,

    // Overlay
    overlay:        'rgba(0,0,0,0.5)',
    glass:          'rgba(255,255,255,0.85)',
    glassBorder:    'rgba(255,255,255,0.5)',

    // Gradient stops
    gradientPrimary: [palette.indigo600, palette.indigo800] as string[],
    gradientHero:    [palette.indigo600, palette.indigo900, '#1e1b4b'] as string[],
    gradientCard:    ['rgba(99,102,241,0.08)', 'rgba(99,102,241,0.02)'] as string[],
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// DARK THEME
// ─────────────────────────────────────────────────────────────────────────────
export const darkTheme = {
  isDark: true,

  colors: {
    // Brand
    primary:       palette.indigo500,
    primaryLight:  palette.indigo400,
    primaryDark:   palette.indigo600,
    primaryBg:     'rgba(99,102,241,0.12)',
    primaryBorder: 'rgba(99,102,241,0.3)',

    // Semantic
    success:      palette.emerald400,
    successLight: palette.emerald500,
    successBg:    'rgba(16,185,129,0.12)',

    warning:      palette.amber400,
    warningLight: palette.amber500,
    warningBg:    'rgba(245,158,11,0.12)',

    danger:       palette.rose400,
    dangerLight:  palette.rose500,
    dangerBg:     'rgba(244,63,94,0.12)',

    info:         palette.blue400,
    infoBg:       'rgba(59,130,246,0.12)',

    // Surface
    background:    '#0a0a0f',
    surface:       '#13131a',
    surfaceAlt:    '#1a1a24',
    surfaceRaised: '#1f1f2e',
    border:        'rgba(255,255,255,0.08)',
    borderFocus:   palette.indigo500,
    divider:       'rgba(255,255,255,0.05)',

    // Text
    text:          '#f1f1f5',
    textSecondary: '#9090a8',
    textTertiary:  '#606078',
    textInverse:   palette.neutral900,
    textOnPrimary: palette.white,

    // Tab Bar
    tabBar:         '#13131a',
    tabBarBorder:   'rgba(255,255,255,0.06)',
    tabActive:      palette.indigo400,
    tabInactive:    '#606078',

    // Header
    header:         '#13131a',
    headerText:     '#f1f1f5',

    // Input
    inputBg:        '#1a1a24',
    inputBorder:    'rgba(255,255,255,0.1)',
    placeholder:    '#606078',

    // Overlay
    overlay:        'rgba(0,0,0,0.7)',
    glass:          'rgba(19,19,26,0.9)',
    glassBorder:    'rgba(255,255,255,0.08)',

    // Gradient stops
    gradientPrimary: [palette.indigo500, palette.indigo700] as string[],
    gradientHero:    ['#1e1b4b', '#312e81', palette.indigo700] as string[],
    gradientCard:    ['rgba(99,102,241,0.15)', 'rgba(99,102,241,0.05)'] as string[],
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// ROLE-BASED ACCENTS
// ─────────────────────────────────────────────────────────────────────────────
export const roleAccents = {
  admin:          { primary: palette.indigo600, light: palette.indigo50,  gradient: [palette.indigo600, palette.indigo800] as string[] },
  super_admin:    { primary: palette.indigo700, light: palette.indigo50,  gradient: [palette.indigo700, palette.indigo900] as string[] },
  principal:      { primary: palette.indigo600, light: palette.indigo50,  gradient: [palette.indigo600, palette.indigo800] as string[] },
  vice_principal: { primary: palette.indigo500, light: palette.indigo50,  gradient: [palette.indigo500, palette.indigo700] as string[] },
  teacher:        { primary: palette.blue600,   light: palette.blue50,    gradient: [palette.blue500,   palette.blue700]   as string[] },
  class_teacher:  { primary: palette.blue700,   light: palette.blue50,    gradient: [palette.blue600,   palette.blue800]   as string[] },
  student:        { primary: palette.emerald600, light: palette.emerald50, gradient: [palette.emerald500, palette.emerald700] as string[] },
  parent:         { primary: palette.amber600,  light: palette.amber50,   gradient: [palette.amber500,  palette.amber700]  as string[] },
  accountant:     { primary: palette.emerald600, light: palette.emerald50, gradient: [palette.emerald500, palette.emerald700] as string[] },
  librarian:      { primary: palette.cyan600,   light: '#ecfeff',         gradient: [palette.cyan500,   palette.cyan600]   as string[] },
  clerk:          { primary: palette.cyan600,   light: '#ecfeff',         gradient: [palette.cyan500,   palette.cyan600]   as string[] },
  receptionist:   { primary: palette.cyan600,   light: '#ecfeff',         gradient: [palette.cyan500,   palette.cyan600]   as string[] },
  office_staff:   { primary: palette.cyan600,   light: '#ecfeff',         gradient: [palette.cyan500,   palette.cyan600]   as string[] },
  default:        { primary: palette.indigo600, light: palette.indigo50,  gradient: [palette.indigo600, palette.indigo800] as string[] },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTED TYPES
// ─────────────────────────────────────────────────────────────────────────────
export type Theme = typeof lightTheme;
export type ThemeColors = typeof lightTheme.colors;
export type RoleCode = keyof typeof roleAccents;
export type RoleAccent = typeof roleAccents[RoleCode];
