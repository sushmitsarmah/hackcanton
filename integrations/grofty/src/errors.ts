/**
 * Clear, user-facing Grofty / CIP-103 errors for the browser path.
 */

export const GROFTY_INSTALL_URL = 'https://grofty.cc/download'
export const GROFTY_QUICKSTART_URL = 'https://grofty.cc/docs/quick-start'
export const GROFTY_INSTALL_DOCS_URL = 'https://grofty.cc/docs/installation'
/** Official Chrome/Edge extension id */
export const GROFTY_EXTENSION_ID = 'ojlgdkgfbpkjceancgnniegbgadgmhig'

export class GroftyError extends Error {
  readonly code: string
  readonly helpUrl?: string

  constructor(code: string, message: string, helpUrl?: string) {
    super(message)
    this.name = 'GroftyError'
    this.code = code
    this.helpUrl = helpUrl
  }
}

export class GroftyExtensionMissingError extends GroftyError {
  constructor(detail?: string) {
    super(
      'EXTENSION_MISSING',
      [
        'Grofty browser extension not detected (CIP-103 provider missing).',
        detail ? `Detail: ${detail}` : undefined,
        `Install: ${GROFTY_INSTALL_URL}`,
        `Extension id: ${GROFTY_EXTENSION_ID}`,
        `Then complete whitelist onboarding: ${GROFTY_QUICKSTART_URL}`,
        'Until whitelisted, MainNet connect/sign may be blocked by Grofty.',
        'Tip: switch the UI to GROFTY_MODE=mock to continue offline.',
      ]
        .filter(Boolean)
        .join(' '),
      GROFTY_INSTALL_URL,
    )
    this.name = 'GroftyExtensionMissingError'
  }
}

export class GroftyNotInBrowserError extends GroftyError {
  constructor() {
    super(
      'NOT_BROWSER',
      'Live Grofty requires a browser window. Use GROFTY_MODE=mock in Node, or open the operator UI and select Live.',
    )
    this.name = 'GroftyNotInBrowserError'
  }
}

export class GroftyConnectFailedError extends GroftyError {
  constructor(detail: string) {
    super(
      'CONNECT_FAILED',
      [
        `Grofty / CIP-103 connect failed: ${detail}`,
        `If the extension is installed but blocked, finish whitelist: ${GROFTY_QUICKSTART_URL}`,
        'Or switch UI to mock mode for offline demo.',
      ].join(' '),
      GROFTY_QUICKSTART_URL,
    )
    this.name = 'GroftyConnectFailedError'
  }
}

export function formatGroftyError(err: unknown): string {
  if (err instanceof GroftyError) return err.message
  if (err instanceof Error) return err.message
  return String(err)
}
