/**
 * VidyaSetu Mobile ERP — Premium Design System Tokens
 * ====================================================
 * Single source of truth for all visual tokens:
 * colors, typography scale, spacing, radii, elevations, role accents.
 */

// ─────────────────────────────────────────────────────────────────────────────
// SPACING SYSTEM (4px base unit)
// ─────────────────────────────────────────────────────────────────────────────
export const spacing = {
  none: 0,
  xs:   4,
  sm:   8,
  md:   12,
  base: 16,
  lg:   20,
  xl:   24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
} as const;

export type SpacingKey = keyof typeof spacing;

// ─────────────────────────────────────────────────────────────────────────────
// BORDER RADIUS SYSTEM
// ─────────────────────────────────────────────────────────────────────────────
export const radius = {
  none: 0,
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  '2xl': 28,
  '3xl': 36,
  full: 9999,
} as const;

export type RadiusKey = keyof typeof radius;

// ─────────────────────────────────────────────────────────────────────────────
// TYPOGRAPHY SYSTEM
// ─────────────────────────────────────────────────────────────────────────────
export const typography = {
  size: {
    '2xs': 10,
    xs:   11,
    sm:   13,
    base: 15,
    md:   16,
    lg:   18,
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
    none:    1,
    tight:   1.25,
    normal:  1.5,
    relaxed: 1.75,
  },
  letterSpacing: {
    tighter: -0.8,
    tight:   -0.4,
    normal:   0,
    wide:     0.4,
    wider:    0.8,
    widest:   1.2,
  },
} as const;

// Semantic typography presets for consistent app-wide usage
export const textPresets = {
  display: {
    fontSize: typography.size['4xl'],
    lineHeight: 40,
    fontWeight: typography.weight.extrabold,
    letterSpacing: typography.letterSpacing.tight,
  },
  h1: {
    fontSize: typography.size['2xl'],
    lineHeight: 30,
    fontWeight: typography.weight.bold,
    letterSpacing: typography.letterSpacing.tight,
  },
  h2: {
    fontSize: typography.size.xl,
    lineHeight: 26,
    fontWeight: typography.weight.bold,
    letterSpacing: typography.letterSpacing.normal,
  },
  h3: {
    fontSize: typography.size.lg,
    lineHeight: 24,
    fontWeight: typography.weight.semibold,
    letterSpacing: typography.letterSpacing.normal,
  },
  bodyLarge: {
    fontSize: typography.size.md,
    lineHeight: 22,
    fontWeight: typography.weight.regular,
    letterSpacing: typography.letterSpacing.normal,
  },
  body: {
    fontSize: typography.size.base,
    lineHeight: 20,
    fontWeight: typography.weight.regular,
    letterSpacing: typography.letterSpacing.normal,
  },
  bodySmall: {
    fontSize: typography.size.sm,
    lineHeight: 18,
    fontWeight: typography.weight.regular,
    letterSpacing: typography.letterSpacing.normal,
  },
  caption: {
    fontSize: typography.size.xs,
    lineHeight: 15,
    fontWeight: typography.weight.medium,
    letterSpacing: typography.letterSpacing.wide,
  },
  label: {
    fontSize: typography.size.sm,
    lineHeight: 16,
    fontWeight: typography.weight.semibold,
    letterSpacing: typography.letterSpacing.wide,
  },
  button: {
    fontSize: typography.size.base,
    lineHeight: 20,
    fontWeight: typography.weight.bold,
    letterSpacing: typography.letterSpacing.wide,
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// BASE PALETTE
// ─────────────────────────────────────────────────────────────────────────────
const palette = {
  // Brand Primary (Deep Royal Indigo)
  indigo50:  '#eef2ff',
  indigo100: '#e0e7ff',
  indigo200: '#c7d2fe',
  indigo300: '#a5b4fc',
  indigo400: '#818cf8',
  indigo500: '#6366f1',
  indigo600: '#4f46e5',
  indigo700: '#4338ca',
  indigo800: '#3730a3',
  indigo900: '#312e81',
  indigo950: '#1e1b4b',

  // Emerald (Success & Student identity)
  emerald50:  '#ecfdf5',
  emerald100: '#d1fae5',
  emerald200: '#a7f3d0',
  emerald300: '#6ee7b7',
  emerald400: '#34d399',
  emerald500: '#10b981',
  emerald600: '#059669',
  emerald700: '#047857',
  emerald800: '#065f46',
  emerald900: '#064e3b',

  // Amber (Warning & Parent identity)
  amber50:  '#fffbeb',
  amber100: '#fef3c7',
  amber200: '#fde68a',
  amber300: '#fcd34d',
  amber400: '#fbbf24',
  amber500: '#f59e0b',
  amber600: '#d97706',
  amber700: '#b45309',
  amber800: '#92400e',

  // Cobalt / Blue (Teacher identity & Info)
  blue50:  '#eff6ff',
  blue100: '#dbeafe',
  blue200: '#bfdbfe',
  blue300: '#93c5fd',
  blue400: '#60a5fa',
  blue500: '#3b82f6',
  blue600: '#2563eb',
  blue700: '#1d4ed8',
  blue800: '#1e40af',
  blue900: '#1e3a8a',

  // Cyan / Teal (Office & Library)
  cyan50:  '#ecfeff',
  cyan100: '#cffafe',
  cyan400: '#22d3ee',
  cyan500: '#06b6d4',
  cyan600: '#0891b2',
  cyan700: '#0e7490',

  // Rose / Crimson (Danger / Error / Absent)
  rose50:  '#fff1f2',
  rose100: '#ffe4e6',
  rose200: '#fecdd3',
  rose300: '#fda4af',
  rose400: '#fb7185',
  rose500: '#f43f5e',
  rose600: '#e11d48',
  rose700: '#be123c',
  rose800: '#9f1239',

  // Violet / Purple (Exams / Badges)
  purple50:  '#f5f3ff',
  purple100: '#ede9fe',
  purple400: '#a78bfa',
  purple500: '#8b5cf6',
  purple600: '#7c3aed',
  purple700: '#6d28d9',
  purple800: '#5b21b6',

  // Neutrals / Slate
  white:      '#ffffff',
  black:      '#000000',
  slate25:    '#fafbfc',
  slate50:    '#f8fafc',
  slate100:   '#f1f5f9',
  slate200:   '#e2e8f0',
  slate300:   '#cbd5e1',
  slate400:   '#94a3b8',
  slate500:   '#64748b',
  slate600:   '#475569',
  slate700:   '#334155',
  slate800:   '#1e293b',
  slate900:   '#0f172a',
  slate950:   '#020617',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// ELEVATION & SHADOW SYSTEM
// ─────────────────────────────────────────────────────────────────────────────
export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  xs: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 14,
  },
  colored: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 6,
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

    // Secondary / Accent
    secondary:       palette.blue600,
    secondaryBg:     palette.blue50,
    secondaryBorder: palette.blue200,

    // Semantic Status
    success:       palette.emerald600,
    successLight:  palette.emerald400,
    successBg:     palette.emerald50,
    successBorder: palette.emerald200,

    warning:       palette.amber600,
    warningLight:  palette.amber400,
    warningBg:     palette.amber50,
    warningBorder: palette.amber200,

    danger:       palette.rose600,
    dangerLight:  palette.rose400,
    dangerBg:     palette.rose50,
    dangerBorder: palette.rose200,

    error:        palette.rose600,
    errorBg:      palette.rose50,

    info:         palette.blue600,
    infoLight:    palette.blue400,
    infoBg:       palette.blue50,
    infoBorder:   palette.blue200,

    // Surfaces & Backgrounds
    background:     palette.slate50,
    surface:        palette.white,
    surfaceAlt:     palette.slate100,
    surfaceRaised:  palette.white,
    surfaceSubtle:  palette.slate25,
    border:         palette.slate200,
    borderSubtle:   '#f1f5f9',
    borderFocus:    palette.indigo600,
    divider:        palette.slate200,

    // Typography
    text:           palette.slate900,
    textPrimary:    palette.slate900,
    textSecondary:  palette.slate600,
    textTertiary:   palette.slate400,
    textMuted:      palette.slate500,
    textInverse:    palette.white,
    textOnPrimary:  palette.white,

    // Navigation & Tab Bar
    tabBar:         palette.white,
    tabBarBorder:   palette.slate200,
    tabActive:      palette.indigo600,
    tabInactive:    palette.slate400,

    // Header
    header:         palette.white,
    headerText:     palette.slate900,
    headerBorder:   palette.slate200,

    // Input
    inputBg:        palette.white,
    inputBorder:    palette.slate200,
    placeholder:    palette.slate400,
    disabled:       palette.slate300,
    disabledBg:     palette.slate100,

    // Overlay & Glass
    overlay:        'rgba(15, 23, 42, 0.6)',
    glass:          'rgba(255, 255, 255, 0.92)',
    glassBorder:    'rgba(255, 255, 255, 0.7)',

    // Gradient stops
    gradientPrimary: [palette.indigo600, palette.indigo800] as string[],
    gradientHero:    [palette.indigo600, palette.indigo900, palette.indigo950] as string[],
    gradientCard:    ['rgba(99, 102, 241, 0.07)', 'rgba(99, 102, 241, 0.01)'] as string[],
    gradientSuccess: [palette.emerald500, palette.emerald700] as string[],
    gradientWarning: [palette.amber500, palette.amber700] as string[],
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// DARK THEME
// ─────────────────────────────────────────────────────────────────────────────
export const darkTheme = {
  isDark: true,

  colors: {
    // Brand
    primary:       palette.indigo400,
    primaryLight:  palette.indigo300,
    primaryDark:   palette.indigo600,
    primaryBg:     'rgba(99, 102, 241, 0.14)',
    primaryBorder: 'rgba(99, 102, 241, 0.32)',

    // Secondary / Accent
    secondary:       palette.blue400,
    secondaryBg:     'rgba(59, 130, 246, 0.14)',
    secondaryBorder: 'rgba(59, 130, 246, 0.32)',

    // Semantic Status
    success:       palette.emerald400,
    successLight:  palette.emerald300,
    successBg:     'rgba(16, 185, 129, 0.14)',
    successBorder: 'rgba(16, 185, 129, 0.32)',

    warning:       palette.amber400,
    warningLight:  palette.amber300,
    warningBg:     'rgba(245, 158, 11, 0.14)',
    warningBorder: 'rgba(245, 158, 11, 0.32)',

    danger:       palette.rose400,
    dangerLight:  palette.rose300,
    dangerBg:     'rgba(244, 63, 94, 0.14)',
    dangerBorder: 'rgba(244, 63, 94, 0.32)',

    error:        palette.rose400,
    errorBg:      'rgba(244, 63, 94, 0.14)',

    info:         palette.blue400,
    infoLight:    palette.blue300,
    infoBg:       'rgba(59, 130, 246, 0.14)',
    infoBorder:   'rgba(59, 130, 246, 0.32)',

    // Surfaces & Backgrounds
    background:     '#0b0f19',
    surface:        '#121827',
    surfaceAlt:     '#1e2638',
    surfaceRaised:  '#253046',
    surfaceSubtle:  '#0e1422',
    border:         'rgba(255, 255, 255, 0.09)',
    borderSubtle:   'rgba(255, 255, 255, 0.05)',
    borderFocus:    palette.indigo400,
    divider:        'rgba(255, 255, 255, 0.07)',

    // Typography
    text:           '#f8fafc',
    textPrimary:    '#f8fafc',
    textSecondary:  '#94a3b8',
    textTertiary:   '#64748b',
    textMuted:      '#818cf8',
    textInverse:    palette.slate900,
    textOnPrimary:  palette.white,

    // Navigation & Tab Bar
    tabBar:         '#121827',
    tabBarBorder:   'rgba(255, 255, 255, 0.08)',
    tabActive:      palette.indigo400,
    tabInactive:    '#64748b',

    // Header
    header:         '#121827',
    headerText:     '#f8fafc',
    headerBorder:   'rgba(255, 255, 255, 0.08)',

    // Input
    inputBg:        '#1a2234',
    inputBorder:    'rgba(255, 255, 255, 0.12)',
    placeholder:    '#64748b',
    disabled:       '#475569',
    disabledBg:     '#131a2a',

    // Overlay & Glass
    overlay:        'rgba(0, 0, 0, 0.75)',
    glass:          'rgba(18, 24, 39, 0.92)',
    glassBorder:    'rgba(255, 255, 255, 0.09)',

    // Gradient stops
    gradientPrimary: [palette.indigo500, palette.indigo700] as string[],
    gradientHero:    ['#1e1b4b', '#312e81', palette.indigo700] as string[],
    gradientCard:    ['rgba(99, 102, 241, 0.16)', 'rgba(99, 102, 241, 0.04)'] as string[],
    gradientSuccess: [palette.emerald600, palette.emerald800] as string[],
    gradientWarning: [palette.amber600, palette.amber800] as string[],
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// ROLE-BASED ACCENT PALETTES
// ─────────────────────────────────────────────────────────────────────────────
export const roleAccents = {
  admin:              { primary: palette.indigo600, light: palette.indigo50,  dark: palette.indigo800, gradient: [palette.indigo600, palette.indigo800] as string[] },
  super_admin:        { primary: palette.indigo700, light: palette.indigo50,  dark: palette.indigo900, gradient: [palette.indigo700, palette.indigo950] as string[] },
  principal:          { primary: palette.indigo600, light: palette.indigo50,  dark: palette.indigo800, gradient: [palette.indigo600, palette.indigo800] as string[] },
  vice_principal:     { primary: palette.indigo500, light: palette.indigo50,  dark: palette.indigo700, gradient: [palette.indigo500, palette.indigo700] as string[] },
  teacher:            { primary: palette.blue600,   light: palette.blue50,    dark: palette.blue800,   gradient: [palette.blue600,   palette.blue800]   as string[] },
  class_teacher:      { primary: palette.blue700,   light: palette.blue50,    dark: palette.blue900,   gradient: [palette.blue600,   '#1e40af']         as string[] },
  student:            { primary: palette.emerald600, light: palette.emerald50, dark: palette.emerald800, gradient: [palette.emerald500, palette.emerald700] as string[] },
  parent:             { primary: palette.amber600,  light: palette.amber50,   dark: palette.amber800,  gradient: [palette.amber500,  palette.amber700]  as string[] },
  accountant:         { primary: palette.emerald600, light: palette.emerald50, dark: palette.emerald800, gradient: [palette.emerald600, palette.emerald800] as string[] },
  librarian:          { primary: palette.cyan600,   light: palette.cyan50,    dark: palette.cyan700,   gradient: [palette.cyan500,   palette.cyan700]   as string[] },
  transport_incharge: { primary: palette.amber600,  light: palette.amber50,   dark: palette.amber800,  gradient: [palette.amber500,  palette.amber700]  as string[] },
  exam_coordinator:   { primary: palette.purple600, light: palette.purple50,  dark: palette.purple800, gradient: [palette.purple600, palette.purple800] as string[] },
  clerk:              { primary: palette.cyan600,   light: palette.cyan50,    dark: palette.cyan700,   gradient: [palette.cyan500,   palette.cyan600]   as string[] },
  receptionist:       { primary: palette.cyan600,   light: palette.cyan50,    dark: palette.cyan700,   gradient: [palette.cyan500,   palette.cyan600]   as string[] },
  office_staff:       { primary: palette.cyan600,   light: palette.cyan50,    dark: palette.cyan700,   gradient: [palette.cyan500,   palette.cyan600]   as string[] },
  support_staff:      { primary: palette.slate600,  light: palette.slate100,  dark: palette.slate800,  gradient: [palette.slate600,  palette.slate800]  as string[] },
  default:            { primary: palette.indigo600, light: palette.indigo50,  dark: palette.indigo800, gradient: [palette.indigo600, palette.indigo800] as string[] },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTED TYPES
// ─────────────────────────────────────────────────────────────────────────────
export type Theme = typeof lightTheme;
export type ThemeColors = typeof lightTheme.colors;
export type RoleCode = keyof typeof roleAccents;
export type RoleAccent = typeof roleAccents[RoleCode];
