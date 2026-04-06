const punctuationRegex = /[.,/#!$%^&*;:{}=_`~()"“”‘’]/g

export function normalizeAnswer(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[-']/g, ' ')
    .replace(punctuationRegex, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}
