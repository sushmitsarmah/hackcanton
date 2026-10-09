import {
  aiConfig,
  assistantConfigured,
  availableProviders,
  DEFAULT_MODEL,
  type AiEnv,
} from './ai/config.ts'
import { modelsFor } from './ai/models.ts'
import { configuredProvider, PROVIDER_DESCRIPTORS } from './ai/registry.ts'
import { runTurn, type RuntimeEvent } from './ai/runtime.ts'
import type { DeskSnapshot } from './ai/tools/types.ts'
import type { Env } from './env.ts'

/**
 * collat.trade Worker. Serves the SPA from static assets and a small API under
 * /api/*. The AI provider is resolved from the environment — the browser never
 * sees a key. A per-request provider/model override is allowed (it only selects
 * among providers this deployment already has keys for).
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/api/ai/config') {
      return json({
        configured: assistantConfigured(env),
        providers: PROVIDER_DESCRIPTORS,
        available: availableProviders(env),
        models: Object.fromEntries(
          availableProviders(env).map((k) => [k, modelsFor(k)]),
        ),
        defaults: DEFAULT_MODEL,
      })
    }

    if (url.pathname === '/api/chat' && request.method === 'POST') {
      return handleChat(request, env)
    }

    return new Response('Not found', { status: 404 })
  },
} satisfies ExportedHandler<Env>

async function handleChat(request: Request, env: Env): Promise<Response> {
  let body: {
    message?: string
    history?: { role: string; content: string }[]
    desk?: DeskSnapshot
    provider?: string
    model?: string
  }
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400)
  }

  const message = (body.message ?? '').toString().slice(0, 8000)
  if (!message.trim()) return json({ error: 'Empty message.' }, 400)

  // Apply a provider/model override only if that provider is usable here.
  const override: AiEnv = {}
  if (body.provider && availableProviders(env).includes(body.provider as never)) {
    override.AI_PROVIDER = body.provider
  }
  if (body.model) override.AI_MODEL = body.model
  const effective = { ...env, ...override }

  let config
  try {
    config = aiConfig(effective)
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'AI misconfigured.' }, 500)
  }
  if (!config) {
    return json({ error: 'The assistant is not configured on this deployment.' }, 503)
  }

  const provider = configuredProvider(effective)
  if (!provider) return json({ error: 'No provider available.' }, 503)

  const desk: DeskSnapshot = body.desk ?? {
    phase: 'idle',
    step: 'propose',
    terms: null,
    lockedCbtc: 0,
    debt: null,
    markPrice: null,
    healthFactor: null,
    ltv: null,
    grants: 0,
    lastError: null,
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: RuntimeEvent) =>
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`))
      try {
        for await (const event of runTurn({
          provider,
          model: config!.model,
          message,
          history: Array.isArray(body.history) ? body.history.slice(-20) : [],
          desk,
          temperature: config!.temperature,
          maxTokens: config!.maxTokens,
          signal: request.signal,
        })) {
          send(event)
        }
      } catch (err) {
        send({ type: 'error', message: err instanceof Error ? err.message : String(err) })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'content-type': 'application/x-ndjson; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}
