/**
 * Design tokens — a direct port of `design_handoff_spice_route_app/tokens/*.css`.
 * Values are copied verbatim from the handoff; do not "improve" them here.
 */
import { Platform, type TextStyle, type ViewStyle } from 'react-native';

/* ---------------------------------------------------------------- colors -- */

export const palette = {
  paprika700: '#A63A0C',
  paprika600: '#C1440E',
  paprika500: '#D9531A',
  paprika100: '#FBE3D6',
  paprika50: '#FDF1EA',

  turmeric600: '#D18A22',
  turmeric500: '#E8A33D',
  turmeric100: '#FAEBD2',
  turmeric50: '#FDF6EA',

  cocoa900: '#2B1D12',
  cocoa700: '#5C3A21',
  cocoa500: '#8A6A50',
  cocoa300: '#C4AD9A',

  cream0: '#FFFFFF',
  cream50: '#FFFCF8',
  cream100: '#FFF8F0',
  cream200: '#F7EDE0',
  cream300: '#EFDFCC',

  mint600: '#1F7A4D',
  mint100: '#DCF2E6',

  chili600: '#C62828',
  chili100: '#FBE0E0',

  sky600: '#1565A7',
  sky100: '#DFEEFA',
} as const;

/** Semantic aliases — mirrors the `--surface-*` / `--text-*` layer in colors.css. */
export const colors = {
  surfacePage: palette.cream100,
  surfaceCard: palette.cream0,
  surfaceSunken: palette.cream200,
  surfaceBrand: palette.paprika600,
  surfaceBrandSoft: palette.paprika50,
  surfaceAccentSoft: palette.turmeric50,

  textBody: palette.cocoa900,
  textMuted: palette.cocoa500,
  textFaint: palette.cocoa300,
  textOnBrand: '#FFFFFF',
  textBrand: palette.paprika600,

  borderSubtle: palette.cream300,
  borderStrong: palette.cocoa300,
  borderFocus: palette.paprika500,

  actionPrimary: palette.paprika600,
  actionPrimaryHover: palette.paprika700,
  actionAccent: palette.turmeric500,
  actionAccentHover: palette.turmeric600,

  statusSuccess: palette.mint600,
  statusSuccessBg: palette.mint100,
  statusDanger: palette.chili600,
  statusDangerBg: palette.chili100,
  statusInfo: palette.sky600,
  statusInfoBg: palette.sky100,
  statusWarn: palette.turmeric600,
  statusWarnBg: palette.turmeric100,
} as const;

/* --------------------------------------------------------------- spacing -- */

/** 4px base scale — `--space-1..10`. */
export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
} as const;

/** Screen gutter, card padding, and section gap per the brand guide. */
export const layout = {
  gutter: 16,
  cardPadding: 16,
  sectionGap: 24,
  /** Design frames are authored at 390pt width. */
  frameWidth: 390,
} as const;

/* ---------------------------------------------------------------- shape --- */

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

/**
 * Warm, cocoa-tinted shadows. CSS defines two layers for `card`; RN takes a
 * single shadow per view, so we approximate with the larger, softer layer and
 * pair it with a matching Android elevation.
 */
export const shadow = {
  card: Platform.select<ViewStyle>({
    ios: {
      shadowColor: 'rgb(92,58,33)',
      shadowOpacity: 0.1,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
    },
    android: { elevation: 2, shadowColor: 'rgb(92,58,33)' },
    default: {
      shadowColor: 'rgb(92,58,33)',
      shadowOpacity: 0.1,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
    },
  })!,
  raised: Platform.select<ViewStyle>({
    ios: {
      shadowColor: 'rgb(92,58,33)',
      shadowOpacity: 0.14,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 4 },
    },
    android: { elevation: 6, shadowColor: 'rgb(92,58,33)' },
    default: {
      shadowColor: 'rgb(92,58,33)',
      shadowOpacity: 0.14,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 4 },
    },
  })!,
  overlay: Platform.select<ViewStyle>({
    ios: {
      shadowColor: 'rgb(43,29,18)',
      shadowOpacity: 0.22,
      shadowRadius: 40,
      shadowOffset: { width: 0, height: 12 },
    },
    android: { elevation: 16, shadowColor: 'rgb(43,29,18)' },
    default: {
      shadowColor: 'rgb(43,29,18)',
      shadowOpacity: 0.22,
      shadowRadius: 40,
      shadowOffset: { width: 0, height: 12 },
    },
  })!,
} as const;

/* ---------------------------------------------------------------- motion -- */

export const motion = {
  /** cubic-bezier(.22,.9,.35,1) — the brand's only easing curve. */
  easeOut: { x1: 0.22, y1: 0.9, x2: 0.35, y2: 1 },
  durFast: 120,
  durBase: 200,
  /** Press feedback: darken fill + scale(.98). No bounces, no springs. */
  pressScale: 0.98,
  /** Disabled controls sit at .45 opacity. */
  disabledOpacity: 0.45,
} as const;

/* ------------------------------------------------------------ typography -- */

/**
 * Font family names as registered with `expo-font` in `src/theme/fonts.ts`.
 *
 * The CSS stacks list Latin, Devanagari, and Tamil faces together and let the
 * browser fall through per-glyph. React Native has no font fallback chain, so
 * the active script is resolved at runtime instead — see `useFonts()` in
 * `src/theme/fonts.ts` and `fontsFor(language)` below.
 */
export const fontFamilies = {
  display: {
    latin: { 500: 'Baloo2_500Medium', 600: 'Baloo2_600SemiBold', 700: 'Baloo2_700Bold', 800: 'Baloo2_800ExtraBold' },
    tamil: {
      500: 'BalooThambi2_500Medium',
      600: 'BalooThambi2_600SemiBold',
      700: 'BalooThambi2_700Bold',
      800: 'BalooThambi2_800ExtraBold',
    },
    /** Baloo 2 covers Devanagari, so Hindi reuses the Latin display face. */
    devanagari: { 500: 'Baloo2_500Medium', 600: 'Baloo2_600SemiBold', 700: 'Baloo2_700Bold', 800: 'Baloo2_800ExtraBold' },
  },
  body: {
    latin: { 400: 'Nunito_400Regular', 600: 'Nunito_600SemiBold', 700: 'Nunito_700Bold', 800: 'Nunito_800ExtraBold' },
    tamil: { 400: 'MuktaMalar_400Regular', 600: 'MuktaMalar_600SemiBold', 700: 'MuktaMalar_700Bold', 800: 'MuktaMalar_700Bold' },
    devanagari: { 400: 'Mukta_400Regular', 600: 'Mukta_600SemiBold', 700: 'Mukta_700Bold', 800: 'Mukta_700Bold' },
  },
} as const;

export type Script = 'latin' | 'tamil' | 'devanagari';
export type DisplayWeight = 500 | 600 | 700 | 800;
export type BodyWeight = 400 | 600 | 700 | 800;

/** Mobile-first type scale. */
export const fontSize = {
  hero: 28,
  title: 22,
  heading: 18,
  body: 15,
  small: 13,
  tiny: 11,
} as const;

export const lineHeight = {
  tight: 1.15,
  snug: 1.3,
  body: 1.5,
} as const;

/** Resolve a display-font family for a script + weight. */
export function displayFont(weight: DisplayWeight, script: Script = 'latin'): string {
  return fontFamilies.display[script][weight];
}

/** Resolve a body-font family for a script + weight. */
export function bodyFont(weight: BodyWeight, script: Script = 'latin'): string {
  return fontFamilies.body[script][weight];
}

/**
 * Build a display text style. Line height follows `--lh-tight` unless told
 * otherwise, matching the `h1..h4` rule in typography.css.
 */
export function display(size: number, weight: DisplayWeight = 700, script: Script = 'latin'): TextStyle {
  return {
    fontFamily: displayFont(weight, script),
    fontSize: size,
    lineHeight: Math.round(size * lineHeight.tight),
    color: colors.textBody,
  };
}

/** Build a body text style (`--lh-body`). */
export function body(size: number = fontSize.body, weight: BodyWeight = 400, script: Script = 'latin'): TextStyle {
  return {
    fontFamily: bodyFont(weight, script),
    fontSize: size,
    lineHeight: Math.round(size * lineHeight.body),
    color: colors.textBody,
  };
}

/* ------------------------------------------------------------- overlays --- */

/** Sticky headers and tab bars: cream at 92–96% + backdrop blur. */
export const overlays = {
  stickyHeader: 'rgba(255,248,240,0.92)',
  tabBar: 'rgba(255,252,248,0.96)',
  /** Bottom scrim on the kitchen hero — the only place text sits on a photo. */
  heroScrim: ['transparent', 'rgba(43,29,18,0.75)'] as const,
  /** Dialog backdrop. */
  scrim: 'rgba(43,29,18,0.45)',
  blurIntensity: 24,
} as const;
