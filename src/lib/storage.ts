import type { PersistedGameState } from '../types/game'

const STORAGE_KEY = 'name-the-countries-v1'
const CURRENT_VERSION = 1

export function saveGameState(state: Omit<PersistedGameState, 'version'>) {
  const payload: PersistedGameState = {
    version: CURRENT_VERSION,
    ...state
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

export function loadGameState(): PersistedGameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PersistedGameState
    if (parsed.version !== CURRENT_VERSION) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    if (!Array.isArray(parsed.countries)) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }

    return parsed
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

export function clearGameState() {
  localStorage.removeItem(STORAGE_KEY)
}
