import { loadDecManConfig } from './config.js'
import {
  describePartyOnboardingGovernance,
  describeProductParamGovernance,
  scaffoldAppGovernanceEvidence,
} from './app-governance.js'
import {
  describeDeskTopologyOnboarding,
  scaffoldTopologyEvidence,
} from './topology.js'
import {
  listTxConfirmationHooks,
  scaffoldTxConfirmationEvidence,
} from './tx-confirmation.js'
import type {
  DecManClientConfig,
  DecManEvidencePayload,
  NodeConfigSnapshot,
} from './types.js'

/**
 * Desk-side DecMan client.
 * scaffold: prints/returns expected workflows — never invents live topology.
 * http: probes GET /node-config on a real DecMan instance.
 */
export class DecManDeskClient {
  readonly config: DecManClientConfig

  constructor(overrides: Partial<DecManClientConfig> = {}) {
    this.config = loadDecManConfig(overrides)
  }

  deskPartyHint(): string {
    return this.config.deskPartyId ?? 'DeskCustody::<UNSET — fill after topology>'
  }

  describeThreeControls() {
    const prefix = this.config.evidencePrefix ?? 'desk'
    return {
      mode: this.config.mode,
      topology: describeDeskTopologyOnboarding(this.deskPartyHint()),
      txConfirmation: listTxConfirmationHooks(),
      appGovernance: [
        describeProductParamGovernance(),
        describePartyOnboardingGovernance(),
      ],
      scaffoldEvidence: [
        scaffoldTopologyEvidence(prefix, this.deskPartyHint()),
        scaffoldTxConfirmationEvidence(prefix, 'lock'),
        scaffoldAppGovernanceEvidence(prefix, 'product-params'),
      ] satisfies DecManEvidencePayload[],
      warning:
        'Scaffold / offline evidence is NOT Gold. Wire DECMAN_MODE=http against a real node.',
    }
  }

  async fetchNodeConfig(): Promise<NodeConfigSnapshot> {
    if (this.config.mode !== 'http') {
      return {
        ok: false,
        mode: this.config.mode,
        error:
          'DECMAN_MODE is not http — refusing to invent node-config. Set DECMAN_MODE=http and DECMAN_URL.',
      }
    }
    const base = this.config.baseUrl
    if (!base) {
      return {
        ok: false,
        mode: 'http',
        error: 'DECMAN_URL is required for http mode',
      }
    }
    const headers: Record<string, string> = {
      Accept: 'application/json',
    }
    if (this.config.token) {
      headers.Authorization = `Bearer ${this.config.token}`
    }
    try {
      const res = await fetch(`${base.replace(/\/$/, '')}/node-config`, {
        headers,
      })
      if (!res.ok) {
        return {
          ok: false,
          mode: 'http',
          error: `GET /node-config → HTTP ${res.status}`,
        }
      }
      const body: unknown = await res.json()
      return { ok: true, mode: 'http', body }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return {
        ok: false,
        mode: 'http',
        error: `GET /node-config failed: ${message}`,
      }
    }
  }
}

export function createDecManClient(
  overrides: Partial<DecManClientConfig> = {},
): DecManDeskClient {
  return new DecManDeskClient(overrides)
}
