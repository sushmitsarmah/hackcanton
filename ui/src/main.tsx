import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { Root } from './Root.tsx'
import { applyTheme, resolveTheme } from './theme.ts'

// Apply the central theme (brand + colours) as CSS variables before first paint.
// Priority: VITE_THEME env → default (activePalette in theme.ts).
// The runtime theme picker is hidden, so we ignore any previously-saved choice.
const { theme } = resolveTheme(import.meta.env.VITE_THEME, { ignoreStored: true })
applyTheme(theme)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
