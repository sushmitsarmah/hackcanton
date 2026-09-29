/**
 * Browser- and Node-safe id helper.
 * Avoids `node:crypto` so Vite can bundle this package without polyfills.
 */
export function newCorrelationId(prefix: string): string {
  return `${prefix}-${newId()}`
}

export function newId(): string {
  const c = globalThis.crypto
  if (c && typeof c.randomUUID === 'function') {
    return c.randomUUID()
  }
  // Extremely old environments — not cryptographic, fine for mock correlation ids.
  return `id-${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`
}
