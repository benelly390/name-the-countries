export type CountryStatus = 'unattempted' | 'correct' | 'skipped'

export type CountryDefinition = {
  id: string
  displayName: string
  acceptedAnswers: string[]
  rejectedCommonAmbiguities: string[]
}
