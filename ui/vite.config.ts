import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const root = path.dirname(fileURLToPath(import.meta.url))
const groftySrc = path.resolve(root, '../integrations/grofty/src')

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Prefer TypeScript source so Vite picks up browser-safe id helper
      // without requiring a rebuild of integrations/grofty/dist for every edit.
      '@cbtc-collateral-desk/grofty/browser': path.join(groftySrc, 'browser.ts'),
      '@cbtc-collateral-desk/grofty': path.join(groftySrc, 'index.ts'),
    },
  },
  optimizeDeps: {
    include: ['@canton-network/dapp-sdk'],
  },
  server: {
    fs: {
      // allow importing sibling integrations/grofty
      allow: [root, path.resolve(root, '..')],
    },
  },
})
