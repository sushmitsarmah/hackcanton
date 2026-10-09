import type { ProviderKey } from './types.ts'

/** A provider/transport failure, safe to show to a user (never contains a key). */
export class ProviderError extends Error {
  readonly provider: ProviderKey
  readonly status?: number
  constructor(provider: ProviderKey, message: string, status?: number) {
    super(message)
    this.name = 'ProviderError'
    this.provider = provider
    this.status = status
  }
}

/** The provider answered but the payload was not usable. */
export class ProviderResponseError extends ProviderError {
  constructor(provider: ProviderKey, message: string) {
    super(provider, `${message}`, undefined)
    this.name = 'ProviderResponseError'
  }
}
