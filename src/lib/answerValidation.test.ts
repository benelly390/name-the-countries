import { describe, expect, it } from 'vitest'
import { GAME_COUNTRIES } from '../data/countries'
import { normalizeAnswer } from './normalizeAnswer'
import { validateAnswer } from './validateAnswer'

const byName = (name: string) => {
  const country = GAME_COUNTRIES.find((item) => item.displayName === name)
  if (!country) throw new Error(`Missing country ${name}`)
  return country
}

describe('normalizeAnswer', () => {
  it('normalizes case, punctuation, and spacing', () => {
    expect(normalizeAnswer('  UNITED-States,  of America ')).toBe('united states of america')
  })
})

describe('validateAnswer', () => {
  it('accepts required aliases', () => {
    expect(validateAnswer('UK', byName('United Kingdom')).ok).toBe(true)
    expect(validateAnswer('South Korea', byName('South Korea')).ok).toBe(true)
    expect(validateAnswer('Republic of Korea', byName('South Korea')).ok).toBe(true)
    expect(validateAnswer('USA', byName('United States')).ok).toBe(true)
    expect(validateAnswer('US', byName('United States')).ok).toBe(true)
    expect(validateAnswer('United States of America', byName('United States')).ok).toBe(true)
    expect(validateAnswer('UAE', byName('United Arab Emirates')).ok).toBe(true)
    expect(validateAnswer('Czech Republic', byName('Czechia')).ok).toBe(true)
    expect(validateAnswer('Russian Federation', byName('Russia')).ok).toBe(true)
    expect(validateAnswer('Congo-Kinshasa', byName('Democratic Republic of the Congo')).ok).toBe(true)
    expect(validateAnswer('Congo-Brazzaville', byName('Republic of the Congo')).ok).toBe(true)
  })

  it('rejects ambiguous or disallowed aliases', () => {
    expect(validateAnswer('Korea', byName('South Korea'))).toMatchObject({ ok: false })
    expect(validateAnswer('SK', byName('South Korea'))).toMatchObject({ ok: false })
    expect(validateAnswer('Congo', byName('Democratic Republic of the Congo'))).toMatchObject({ ok: false })
    expect(validateAnswer('Congo', byName('Republic of the Congo'))).toMatchObject({ ok: false })
  })

  it('rejects empty answers', () => {
    expect(validateAnswer('   ', byName('France'))).toMatchObject({ ok: false, reason: 'empty' })
  })
})
