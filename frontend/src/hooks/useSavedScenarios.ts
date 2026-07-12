import { useCallback, useState } from 'react'
import type { SavedScenario, ScenarioParameters } from '../types/Scenario'

const STORAGE_KEY_PREFIX = 'missionos_scenarios_'

function readScenarios(storageKey: string): SavedScenario[] {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function generateId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `scenario-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/** Scenarios are stored per-mission entirely in `localStorage` — never
 * sent to the backend. `missionId` scopes the storage key so scenarios
 * from one mission never leak into another's list. */
export function useSavedScenarios(missionId: string | undefined) {
  const storageKey = missionId ? `${STORAGE_KEY_PREFIX}${missionId}` : null
  const [scenarios, setScenarios] = useState<SavedScenario[]>(() => (storageKey ? readScenarios(storageKey) : []))
  // Tracks which storage key `scenarios` was last loaded from. If the
  // mission changes, re-derive state during render (the pattern React
  // recommends for "adjusting state when a prop changes") instead of a
  // `useEffect` + `setState`, which would cause an extra render pass.
  const [loadedStorageKey, setLoadedStorageKey] = useState(storageKey)

  if (storageKey !== loadedStorageKey) {
    setLoadedStorageKey(storageKey)
    setScenarios(storageKey ? readScenarios(storageKey) : [])
  }

  const persist = useCallback(
    (next: SavedScenario[]) => {
      setScenarios(next)
      if (storageKey) localStorage.setItem(storageKey, JSON.stringify(next))
    },
    [storageKey]
  )

  const create = useCallback(
    (name: string, parameters: ScenarioParameters): SavedScenario => {
      const now = new Date().toISOString()
      const scenario: SavedScenario = { id: generateId(), name, createdAt: now, updatedAt: now, parameters }
      persist([...scenarios, scenario])
      return scenario
    },
    [scenarios, persist]
  )

  const rename = useCallback(
    (id: string, name: string) => {
      persist(scenarios.map((s) => (s.id === id ? { ...s, name, updatedAt: new Date().toISOString() } : s)))
    },
    [scenarios, persist]
  )

  const duplicate = useCallback(
    (id: string) => {
      const source = scenarios.find((s) => s.id === id)
      if (!source) return
      const now = new Date().toISOString()
      persist([...scenarios, { ...source, id: generateId(), name: `${source.name} (Copy)`, createdAt: now, updatedAt: now }])
    },
    [scenarios, persist]
  )

  const remove = useCallback(
    (id: string) => {
      persist(scenarios.filter((s) => s.id !== id))
    },
    [scenarios, persist]
  )

  return { scenarios, create, rename, duplicate, remove }
}
