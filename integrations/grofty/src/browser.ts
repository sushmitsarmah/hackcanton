/**
 * Browser / Vite entry for @cbtc-collateral-desk/grofty.
 *
 * Prefer this from the operator UI:
 *   import { createGroftyClient, ... } from '@cbtc-collateral-desk/grofty/browser'
 *
 * Same surface as the main entry — mock uses Web Crypto (no node:crypto),
 * live lazy-loads @canton-network/dapp-sdk CIP-0103.
 */
export * from './purposes.js'
export * from './types.js'
export * from './commands.js'
export * from './errors.js'
export * from './client.js'
export { MockGroftyClient } from './mock-adapter.js'
export {
  LiveGroftyClient,
  GROFTY_PROVIDER_ID,
  detectCip103Provider,
  requestAnnouncedProviders,
} from './live-adapter.js'
export type { AnnouncedProvider } from './live-adapter.js'
