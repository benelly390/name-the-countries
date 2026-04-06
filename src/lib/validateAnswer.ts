import { GAME_COUNTRIES } from '../data/countries'
import type { CountryDefinition } from '../types/country'
import { normalizeAnswer } from './normalizeAnswer'

const MIN_SHORT_ALIAS_LENGTH = 2

const aliasToCountryIds = new Map<string, Set<string>>()
const normalizedCountries = new Map<string, { accepted: Set<string>; rejected: Set<string> }>()

for (const country of GAME_COUNTRIES) {
  const id = country.id
  const accepted = new Set(country.acceptedAnswers.map((a) => normalizeAnswer(a)))
  const rejected = new Set(country.rejectedCommonAmbiguities.map((a) => normalizeAnswer(a)))
  normalizedCountries.set(id, { accepted, rejected })

  for (const alias of accepted) {
    if (!aliasToCountryIds.has(alias)) {
      aliasToCountryIds.set(alias, new Set())
    }
    aliasToCountryIds.get(alias)!.add(id)
  }
}

export type ValidationResult =
  | { ok: true; normalizedInput: string }
  | { ok: false; normalizedInput: string; reason: 'empty' | 'ambiguous' | 'rejected' | 'incorrect' }

function isAmbiguousAlias(alias: string): boolean {
  const owners = aliasToCountryIds.get(alias)
  if (!owners) return false
  return owners.size > 1
}

function isTooShortAlias(alias: string): boolean {
  return alias.length < MIN_SHORT_ALIAS_LENGTH
}

export function validateAnswer(rawInput: string, country: CountryDefinition): ValidationResult {
  const normalizedInput = normalizeAnswer(rawInput)
  if (!normalizedInput) return { ok: false, normalizedInput, reason: 'empty' }

  if (isTooShortAlias(normalizedInput)) {
    return { ok: false, normalizedInput, reason: 'incorrect' }
  }

  const normalizedCountry = normalizedCountries.get(country.id)
  if (!normalizedCountry) {
    return { ok: false, normalizedInput, reason: 'incorrect' }
  }

  if (normalizedCountry.rejected.has(normalizedInput)) {
    return { ok: false, normalizedInput, reason: 'rejected' }
  }

  if (isAmbiguousAlias(normalizedInput)) {
    return { ok: false, normalizedInput, reason: 'ambiguous' }
  }

  if (!normalizedCountry.accepted.has(normalizedInput)) {
    return { ok: false, normalizedInput, reason: 'incorrect' }
  }

  return { ok: true, normalizedInput }
}
