import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

import { cloudflare } from "@cloudflare/vite-plugin";

const root = path.dirname(fileURLToPath(import.meta.url))
const groftySrc = path.resolve(root, '../integrations/grofty/src')

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), cloudflare()],
  resolve: {
    alias: {
      // Prefer TypeScript source so Vite picks up browser-safe id helper
      // without requiring a rebuild of integrations/grofty/dist for every edit.
      '@cbtc-collateral-desk/grofty/browser': path.join(groftySrc, 'browser.ts'),
      '@cbtc-collateral-desk/grofty': path.join(groftySrc, 'index.ts'),
      // dapp-sdk statically imports this optional peer dep; this desk uses the
      // Grofty extension only, so stub it instead of shipping the WC relay client.
      '@walletconnect/sign-client': path.join(root, 'src/lib/walletconnect-stub.ts'),
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
    // The Canton JSON Ledger API has no CORS headers; proxy it for the console.
    // Point VITE_LEDGER_PROXY at a running Path A sandbox (default :7575).
    proxy: {
      '/ledger': {
        target: process.env.VITE_LEDGER_PROXY || 'http://localhost:7575',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/ledger/, ''),
      },
    },
  },
})