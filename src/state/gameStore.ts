import { create } from 'zustand'
import { COUNTRY_BY_ID, GAME_COUNTRIES } from '../data/countries'
import { clearGameState, loadGameState, saveGameState } from '../lib/storage'
import { validateAnswer } from '../lib/validateAnswer'
import type { CountryStatus } from '../types/country'

type GuessFeedback =
  | { type: 'idle' }
  | { type: 'incorrect'; message: string }
  | { type: 'correct'; message: string }

type GameState = {
  countryStatuses: Record<string, CountryStatus>
  selectedCountryId: string | null
  answerInput: string
  feedback: GuessFeedback
  isGameComplete: boolean
  selectCountry: (id: string) => void
  closeAnswerPanel: () => void
  setAnswerInput: (value: string) => void
  submitAnswer: () => void
  skipSelectedCountry: () => void
  newGame: () => void
}

const initialStatuses = (): Record<string, CountryStatus> =>
  Object.fromEntries(GAME_COUNTRIES.map((country) => [country.id, 'unattempted' satisfies CountryStatus]))

function computeComplete(statuses: Record<string, CountryStatus>) {
  return Object.values(statuses).every((value) => value !== 'unattempted')
}

function persist(statuses: Record<string, CountryStatus>, selectedCountryId: string | null) {
  saveGameState({
    countries: Object.entries(statuses).map(([id, status]) => ({ id, status })),
    selectedCountryId
  })
}

function getHydratedState() {
  const defaults = initialStatuses()
  const loaded = loadGameState()
  if (!loaded) {
    return {
      countryStatuses: defaults,
      selectedCountryId: null,
      isGameComplete: false
    }
  }

  for (const entry of loaded.countries) {
    if (entry.id in defaults && ['unattempted', 'correct', 'skipped'].includes(entry.status)) {
      defaults[entry.id] = entry.status as CountryStatus
    }
  }

  const selectedCountryId = loaded.selectedCountryId && defaults[loaded.selectedCountryId] === 'unattempted'
    ? loaded.selectedCountryId
    : null

  return {
    countryStatuses: defaults,
    selectedCountryId,
    isGameComplete: computeComplete(defaults)
  }
}

export const useGameStore = create<GameState>((set, get) => ({
  ...getHydratedState(),
  answerInput: '',
  feedback: { type: 'idle' },
  selectCountry: (id) => {
    const status = get().countryStatuses[id]
    if (!status || status !== 'unattempted') return
    if (get().selectedCountryId === id) return

    set({ selectedCountryId: id, feedback: { type: 'idle' }, answerInput: '' })
    persist(get().countryStatuses, id)
  },
  closeAnswerPanel: () => {
    const selected = get().selectedCountryId
    if (!selected) return
    if (get().countryStatuses[selected] !== 'unattempted') return
    set({ selectedCountryId: null, answerInput: '', feedback: { type: 'idle' } })
    persist(get().countryStatuses, null)
  },
  setAnswerInput: (value) => set({ answerInput: value, feedback: { type: 'idle' } }),
  submitAnswer: () => {
    const { selectedCountryId, answerInput, countryStatuses } = get()
    if (!selectedCountryId || countryStatuses[selectedCountryId] !== 'unattempted') return

    const country = COUNTRY_BY_ID.get(selectedCountryId)
    if (!country) return

    const validation = validateAnswer(answerInput, country)
    if (!validation.ok) {
      const message =
        validation.reason === 'empty'
          ? 'Please enter a guess or choose “I don\'t know”.'
          : validation.reason === 'ambiguous'
            ? 'That answer is ambiguous. Please be more specific.'
            : validation.reason === 'rejected'
              ? 'That alias is intentionally not accepted here.'
              : 'Not correct yet. Try again.'
      set({ feedback: { type: 'incorrect', message } })
      return
    }

    const nextStatuses: Record<string, CountryStatus> = { ...countryStatuses, [selectedCountryId]: 'correct' }
    const isGameComplete = computeComplete(nextStatuses)
    set({
      countryStatuses: nextStatuses,
      selectedCountryId: null,
      answerInput: '',
      feedback: { type: 'correct', message: 'Correct!' },
      isGameComplete
    })
    persist(nextStatuses, null)
  },
  skipSelectedCountry: () => {
    const { selectedCountryId, countryStatuses } = get()
    if (!selectedCountryId || countryStatuses[selectedCountryId] !== 'unattempted') return

    const nextStatuses: Record<string, CountryStatus> = { ...countryStatuses, [selectedCountryId]: 'skipped' }
    const isGameComplete = computeComplete(nextStatuses)

    set({
      countryStatuses: nextStatuses,
      selectedCountryId: null,
      answerInput: '',
      feedback: { type: 'idle' },
      isGameComplete
    })
    persist(nextStatuses, null)
  },
  newGame: () => {
    clearGameState()
    set({
      countryStatuses: initialStatuses(),
      selectedCountryId: null,
      answerInput: '',
      feedback: { type: 'idle' },
      isGameComplete: false
    })
  }
}))

export const gameSelectors = {
  total: () => GAME_COUNTRIES.length,
  attempted: (statuses: Record<string, CountryStatus>) => Object.values(statuses).filter((status) => status !== 'unattempted').length,
  correct: (statuses: Record<string, CountryStatus>) => Object.values(statuses).filter((status) => status === 'correct').length,
  skippedCountries: (statuses: Record<string, CountryStatus>) =>
    GAME_COUNTRIES.filter((country) => statuses[country.id] !== 'correct').map((country) => country.displayName)
}
