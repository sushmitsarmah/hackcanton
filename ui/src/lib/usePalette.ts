import { useState } from 'react'
import { activePalette, getStoredPalette, type PaletteName } from '../theme.ts'

/** The palette the app booted with: VITE_THEME → saved choice → default. */
export function initialPalette(): PaletteName {
  const fromEnv = (import.meta.env.VITE_THEME ?? '').trim() as PaletteName
  if (fromEnv) return fromEnv
  return getStoredPalette() ?? activePalette
}

/** Palette state shared by a page + its ThemeSwitcher. */
export function usePalette(): [PaletteName, (name: PaletteName) => void] {
  const [palette, setPalette] = useState<PaletteName>(initialPalette)
  return [palette, setPalette]
}
