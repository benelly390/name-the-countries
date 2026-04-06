import type { CountryStatus } from './country'

export type CountryProgress = {
  id: string
  status: CountryStatus
}

export type PersistedGameState = {
  version: number
  countries: CountryProgress[]
  selectedCountryId: string | null
}
