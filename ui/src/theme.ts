/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  CENTRAL THEME — edit this one file to rebrand / recolour the whole app.
 * ─────────────────────────────────────────────────────────────────────────────
 *  Everything (brand name, logo, tagline and every colour) lives here. The
 *  values are written to CSS custom properties by `applyTheme()`, and the
 *  stylesheet (src/index.css) only ever references `var(--...)`.
 *
 *  To experiment: switch `activeTheme` below, or paste new hex values into a
 *  palette and pick it in `main.tsx` (or set VITE_THEME=<preset name>).
 */

export type ThemeColors = {
  /** Page background */
  bg: string
  /** Slightly raised background (topbar, cards) */
  bgElev: string
  /** Second-level raised background (inputs, chips) */
  bgElev2: string
  /** Card / panel surface */
  panel: string
  /** Panel surface variant */
  panelAlt: string
  /** Hairline borders */
  border: string
  /** Stronger borders */
  borderStrong: string
  /** Primary text */
  text: string
  /** Secondary text */
  textMuted: string
  /** Tertiary / faint text */
  textDim: string
  /** Cyan accent (logo, links, active) */
  accent: string
  /** Teal / success accent */
  accent2: string
  /** Primary button top colour (gradient start) */
  primary: string
  /** Primary button bottom colour (gradient end) */
  primary2: string
  /** Primary button hover tint */
  primaryHover: string
  /** Success */
  ok: string
  /** Warning */
  warn: string
  /** Danger text */
  danger: string
  /** Danger surface */
  dangerBg: string
  /** Danger border */
  dangerBorder: string
  /** Ambient glow top-left */
  glowA: string
  /** Ambient glow top-right */
  glowB: string
  /** Corner radius base */
  radius: string
}

export type Brand = {
  /** Full display name, e.g. "CBTC Collateral Desk" */
  name: string
  /** Uppercase wordmark for the nav/topbar */
  nameUpper: string
  /** Short product label for the console */
  product: string
  /** Logo glyph (any unicode / emoji) used when `logoUrl` is empty */
  mark: string
  /** Optional logo image URL — replaces the glyph when set */
  logoUrl?: string
  /** One-line tagline */
  tagline: string
  /** Small footer note */
  footerNote: string
}

export type AppTheme = {
  brand: Brand
  colors: ThemeColors
}

/* ── Shared brand (same across palettes) ─────────────────────────────────── */
export const brand: Brand = {
  name: 'collat.trade',
  nameUpper: 'COLLAT.TRADE',
  product: 'Credit Officer Console',
  mark: '✦',
  // When set, replaces the `mark` glyph in the nav/topbar/footer.
  logoUrl: '/logo.svg',
  tagline: 'Private CBTC Credit on Canton',
  footerNote: 'Built for bilateral lending · Powered by Canton · Governed by DecMan',
}

/* ── Palettes to experiment with ─────────────────────────────────────────── */

/** Default — deep navy with cyan + teal (matches the supplied design). */
export const cantonCyan: ThemeColors = {
  bg: '#06121c',
  bgElev: '#09151f',
  bgElev2: '#101e2a',
  panel: '#101b25',
  panelAlt: '#0c1822',
  border: '#1b3446',
  borderStrong: '#21415a',
  text: '#eaf4fb',
  textMuted: '#91a9b8',
  textDim: '#607c8d',
  accent: '#0fd9ee',
  accent2: '#1ed4b3',
  primary: '#16a8ff',
  primary2: '#147ce5',
  primaryHover: '#23a9ff',
  ok: '#19d6bd',
  warn: '#e2a945',
  danger: '#e98a93',
  dangerBg: '#1b1014',
  dangerBorder: '#6a2a32',
  glowA: 'rgba(17,122,170,0.15)',
  glowB: 'rgba(0,190,164,0.08)',
  radius: '9px',
}

/** Violet / indigo alternative. */
export const violetInk: ThemeColors = {
  ...cantonCyan,
  bg: '#0b0a18',
  bgElev: '#121026',
  bgElev2: '#1a1733',
  panel: '#161331',
  panelAlt: '#110f26',
  border: '#2a2550',
  borderStrong: '#3b3470',
  text: '#f0eefb',
  textMuted: '#a79fc9',
  textDim: '#6f6799',
  accent: '#9d7bff',
  accent2: '#5eead4',
  primary: '#8b5cf6',
  primary2: '#6d28d9',
  primaryHover: '#a78bfa',
  ok: '#34d399',
  glowA: 'rgba(124,58,237,0.20)',
  glowB: 'rgba(45,212,191,0.10)',
}

/** Warm amber / bronze alternative. */
export const amberDesk: ThemeColors = {
  ...cantonCyan,
  bg: '#141009',
  bgElev: '#1c1710',
  bgElev2: '#262017',
  panel: '#201b13',
  panelAlt: '#19140d',
  border: '#3a2f1f',
  borderStrong: '#54452e',
  text: '#f7f1e6',
  textMuted: '#c2b39a',
  textDim: '#8a7a61',
  accent: '#f5b544',
  accent2: '#e8c98a',
  primary: '#f59e0b',
  primary2: '#b45309',
  primaryHover: '#fbbf24',
  ok: '#d9a441',
  glowA: 'rgba(245,158,11,0.16)',
  glowB: 'rgba(232,201,138,0.08)',
}

/** Light theme alternative. */
export const paperBlue: ThemeColors = {
  bg: '#f4f7fb',
  bgElev: '#ffffff',
  bgElev2: '#eef2f8',
  panel: '#ffffff',
  panelAlt: '#f8fafc',
  border: '#d3ddeb',
  borderStrong: '#b6c4d8',
  text: '#0d1b2a',
  textMuted: '#4a5c72',
  textDim: '#7d8ea3',
  accent: '#0b8bd6',
  accent2: '#0d9488',
  primary: '#0ea5e9',
  primary2: '#0284c7',
  primaryHover: '#38bdf8',
  ok: '#0f9d76',
  warn: '#b45309',
  danger: '#b42318',
  dangerBg: '#fef2f2',
  dangerBorder: '#f3b4b0',
  glowA: 'rgba(14,165,233,0.10)',
  glowB: 'rgba(13,148,136,0.08)',
  radius: '9px',
}

export const palettes = {
  cantonCyan,
  violetInk,
  amberDesk,
  paperBlue,
} as const

export type PaletteName = keyof typeof palettes

/** Human labels shown in the theme dropdown. */
export const paletteLabels: Record<PaletteName, string> = {
  cantonCyan: 'Canton Cyan',
  violetInk: 'Violet Ink',
  amberDesk: 'Amber Desk',
  paperBlue: 'Paper Blue',
}

/** All selectable palettes, for the switcher UI. */
export const paletteList = (Object.keys(palettes) as PaletteName[]).map(
  (name) => ({ name, label: paletteLabels[name] }),
)

/** The palette the app boots with. Change this to recolour everything. */
export const activePalette: PaletteName = 'amberDesk'

/** localStorage key for the user-picked palette. */
export const THEME_STORAGE_KEY = 'cbtc-desk-theme'

/** Read the persisted palette choice, if any. */
export function getStoredPalette(): PaletteName | null {
  if (typeof localStorage === 'undefined') return null
  const v = localStorage.getItem(THEME_STORAGE_KEY) as PaletteName | null
  return v && v in palettes ? v : null
}

/** Persist a palette choice. */
export function setStoredPalette(name: PaletteName): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(THEME_STORAGE_KEY, name)
}

/** Build a theme for a named palette (falls back to the active palette). */
export function themeForPalette(name: PaletteName): AppTheme {
  return { brand, colors: palettes[name] ?? palettes[activePalette] }
}

export const defaultTheme: AppTheme = {
  brand,
  colors: palettes[activePalette],
}

/* ── Palettes → CSS custom properties ────────────────────────────────────── */

const COLOR_VARS: Record<keyof ThemeColors, string> = {
  bg: '--bg',
  bgElev: '--bg-elev',
  bgElev2: '--bg-elev-2',
  panel: '--panel',
  panelAlt: '--panel-alt',
  border: '--border',
  borderStrong: '--border-strong',
  text: '--text',
  textMuted: '--muted',
  textDim: '--dim',
  accent: '--accent',
  accent2: '--accent-2',
  primary: '--primary',
  primary2: '--primary-2',
  primaryHover: '--primary-hover',
  ok: '--ok',
  warn: '--warn',
  danger: '--danger',
  dangerBg: '--danger-bg',
  dangerBorder: '--danger-border',
  glowA: '--glow-a',
  glowB: '--glow-b',
  radius: '--radius',
}

/** Write a theme's brand + colours onto the document as CSS variables. */
export function applyTheme(theme: AppTheme = defaultTheme): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  for (const [key, cssVar] of Object.entries(COLOR_VARS)) {
    root.style.setProperty(cssVar, theme.colors[key as keyof ThemeColors])
  }
  // Brand strings exposed for CSS `content` usage / labels
  root.style.setProperty('--brand-name', `"${theme.brand.name}"`)
  root.dataset.theme = theme.brand.name.toLowerCase().replace(/\s+/g, '-')
}

/**
 * Resolve the boot palette, in priority order:
 *   1. VITE_THEME env var
 *   2. previously saved choice (localStorage) — unless `ignoreStored` is set
 *   3. the `activePalette` default
 * Returns both the theme and the chosen palette name.
 */
export function resolveTheme(
  envPalette?: string,
  opts?: { ignoreStored?: boolean },
): {
  theme: AppTheme
  palette: PaletteName
} {
  const env = (envPalette ?? '').trim() as PaletteName
  if (env && env in palettes) return { theme: themeForPalette(env), palette: env }
  if (!opts?.ignoreStored) {
    const stored = getStoredPalette()
    if (stored) return { theme: themeForPalette(stored), palette: stored }
  }
  return { theme: defaultTheme, palette: activePalette }
}
