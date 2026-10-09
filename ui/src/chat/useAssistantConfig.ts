import { useCallback, useEffect, useState } from 'react'

export interface CatalogModel {
  id: string
  label: string
  free: boolean
  tools: boolean
}
export interface AssistantConfig {
  configured: boolean
  providers: { key: string; name: string; summary: string }[]
  available: string[]
  models: Record<string, CatalogModel[]>
  defaults: Record<string, string>
}

/** Read which providers/models the assistant can use on this deployment. */
export function useAssistantConfig(): AssistantConfig | null {
  const [config, setConfig] = useState<AssistantConfig | null>(null)

  useEffect(() => {
    let alive = true
    fetch('/api/ai/config')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (alive && data) setConfig(data as AssistantConfig)
      })
      .catch(() => {
        /* assistant off */
      })
    return () => {
      alive = false
    }
  }, [])

  return config
}

/** Persisted provider/model choice (per browser). */
export interface AiSelection {
  provider: string
  model: string
}
const KEY = 'cbtc-desk-ai'

export function loadSelection(): AiSelection {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as AiSelection
  } catch {
    /* ignore */
  }
  return { provider: '', model: '' }
}

export function useAiSelection(): [AiSelection, (s: AiSelection) => void] {
  const [sel, setSel] = useState<AiSelection>(loadSelection)
  const update = useCallback((s: AiSelection) => {
    setSel(s)
    try {
      localStorage.setItem(KEY, JSON.stringify(s))
    } catch {
      /* ignore */
    }
  }, [])
  return [sel, update]
}
