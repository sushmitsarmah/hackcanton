import { useState } from 'react'
import {
  applyTheme,
  paletteList,
  setStoredPalette,
  themeForPalette,
  type PaletteName,
} from '../theme.ts'

type Props = {
  /** Current palette name (controlled by the parent). */
  value: PaletteName
  /** Called after a new palette is applied. */
  onChange?: (name: PaletteName) => void
  /** Compact styling for the topbar. */
  className?: string
}

/** Dropdown that recolours the whole app at runtime. */
export function ThemeSwitcher({ value, onChange, className }: Props) {
  const [current, setCurrent] = useState<PaletteName>(value)

  const choose = (name: PaletteName) => {
    setCurrent(name)
    applyTheme(themeForPalette(name))
    setStoredPalette(name)
    onChange?.(name)
  }

  return (
    <label className={`theme-switcher ${className ?? ''}`}>
      <span className="theme-switcher-label">Theme</span>
      <select
        aria-label="Colour theme"
        value={current}
        onChange={(e) => choose(e.target.value as PaletteName)}
      >
        {paletteList.map((p) => (
          <option key={p.name} value={p.name}>
            {p.label}
          </option>
        ))}
      </select>
    </label>
  )
}
