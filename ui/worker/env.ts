import type { AiEnv } from './ai/config.ts'

/**
 * Worker environment. AI vars are set with `wrangler secret put` (keys) or as
 * plain vars. Unset AI_PROVIDER means the assistant is off.
 *
 * `AI` is the native Workers AI binding (wrangler.jsonc `ai.binding`). When
 * present it needs no key at all — it runs on this account's Cloudflare.
 */
export interface Env extends AiEnv {
  ENVIRONMENT?: string
  AI?: {
    run: (model: string, inputs: unknown, options?: unknown) => Promise<unknown>
  }
}
