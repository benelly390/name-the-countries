import type { CountryDefinition } from '../types/country'

type CountryAliasConfig = {
  accepted?: string[]
  rejected?: string[]
  geometry?: string[]
}

// The previous build hard-coded only 36 entries in GAME_COUNTRIES, so filtering geometry against that list
// truncated the globe to 36 playable countries even though the map dataset had broader coverage.
const UN_COUNTRY_NAMES = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda', 'Argentina', 'Armenia', 'Australia',
  'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin',
  'Bhutan', 'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi',
  'Cabo Verde', 'Cambodia', 'Cameroon', 'Canada', 'Central African Republic', 'Chad', 'Chile', 'China', "Cote d'Ivoire", 'Colombia',
  'Comoros', 'Republic of the Congo', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czechia',
  "Democratic Republic of the Congo", 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'Ecuador', 'Egypt',
  'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia', 'Fiji', 'Finland', 'France', 'Gabon',
  'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana',
  'Haiti', 'Honduras', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy',
  'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'North Korea', 'South Korea', 'Kuwait', 'Kyrgyzstan',
  'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Madagascar',
  'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico',
  'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar', 'Namibia', 'Nauru',
  'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Macedonia', 'Norway', 'Oman', 'Pakistan',
  'Palau', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania',
  'Russia', 'Rwanda', 'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino',
  'Sao Tome and Principe', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia',
  'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname',
  'Sweden', 'Switzerland', 'Syria', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo', 'Tonga',
  'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu', 'Uganda', 'Ukraine', 'United Arab Emirates',
  'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan', 'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam', 'Yemen',
  'Zambia', 'Zimbabwe', 'Palestine'
] as const

const ALIASES: Record<string, CountryAliasConfig> = {
  'United States': { accepted: ['USA', 'US', 'United States of America'], rejected: ['America'], geometry: ['United States of America'] },
  'United Kingdom': { accepted: ['UK', 'Britain', 'Great Britain'], rejected: ['England'] },
  'South Korea': { accepted: ['Republic of Korea'], rejected: ['Korea', 'SK'], geometry: ['Korea, Republic of'] },
  'North Korea': {
    accepted: ["Democratic People's Republic of Korea", 'DPRK'],
    rejected: ['Korea', 'NK'],
    geometry: ["Korea, Democratic People's Republic of"]
  },
  Russia: { accepted: ['Russian Federation'], geometry: ['Russian Federation'] },
  Czechia: { accepted: ['Czech Republic'], geometry: ['Czech Republic'] },
  'United Arab Emirates': { accepted: ['UAE'] },
  'Democratic Republic of the Congo': {
    accepted: ['DRC', 'Congo Kinshasa', 'Congo-Kinshasa', 'DR Congo'],
    rejected: ['Congo'],
    geometry: ['Democratic Republic of Congo', 'Congo, The Democratic Republic of the']
  },
  'Republic of the Congo': { accepted: ['Congo Brazzaville', 'Congo-Brazzaville'], rejected: ['Congo'], geometry: ['Congo'] },
  Turkey: { accepted: ['Turkiye'] },
  Iran: { geometry: ['Iran, Islamic Republic of'] },
  Syria: { geometry: ['Syrian Arab Republic'] },
  Laos: { accepted: ['Lao PDR'], geometry: ["Lao People's Democratic Republic"] },
  Bolivia: { geometry: ['Bolivia, Plurinational State of'] },
  Venezuela: { geometry: ['Venezuela, Bolivarian Republic of'] },
  Moldova: { geometry: ['Moldova, Republic of'] },
  Tanzania: { geometry: ['Tanzania, United Republic of'] },
  Brunei: { geometry: ['Brunei Darussalam'] },
  Vietnam: { accepted: ['Viet Nam'], geometry: ['Viet Nam'] },
  'Cabo Verde': { accepted: ['Cape Verde'] },
  'Timor-Leste': { accepted: ['East Timor', 'Timor Leste'], geometry: ['Timor-Leste'] },
  Eswatini: { accepted: ['Swaziland'] },
  Micronesia: { geometry: ['Micronesia, Federated States of'] },
  Palestine: { accepted: ['State of Palestine'], geometry: ['Palestine, State of'] },
  'Vatican City': { accepted: ['Holy See'], geometry: ['Holy See'] },
  'North Macedonia': { accepted: ['Macedonia'] },
  Myanmar: { accepted: ['Burma'] },
  Bahamas: { geometry: ['Bahamas, The'] },
  Gambia: { geometry: ['Gambia, The'] },
  'Sao Tome and Principe': { accepted: ['São Tomé and Príncipe'] },
  "Cote d'Ivoire": { accepted: ["Côte d'Ivoire", 'Ivory Coast'] }
}

function toId(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export const GAME_COUNTRIES: CountryDefinition[] = UN_COUNTRY_NAMES.map((displayName) => {
  const aliases = ALIASES[displayName] ?? {}
  return {
    id: toId(displayName),
    displayName,
    acceptedAnswers: [displayName, ...(aliases.accepted ?? [])],
    rejectedCommonAmbiguities: aliases.rejected ?? []
  }
})

export const COUNTRY_BY_ID = new Map(GAME_COUNTRIES.map((country) => [country.id, country]))

function normalizeCountryName(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
}

export const COUNTRY_ID_BY_NORMALIZED_NAME = new Map<string, string>()

for (const country of GAME_COUNTRIES) {
  COUNTRY_ID_BY_NORMALIZED_NAME.set(normalizeCountryName(country.displayName), country.id)
  COUNTRY_ID_BY_NORMALIZED_NAME.set(normalizeCountryName(country.acceptedAnswers[0]), country.id)
  for (const alias of ALIASES[country.displayName]?.geometry ?? []) {
    COUNTRY_ID_BY_NORMALIZED_NAME.set(normalizeCountryName(alias), country.id)
  }
}

if (import.meta.env.DEV) {
  console.info(`[countries] curated playable list size: ${GAME_COUNTRIES.length} (target: 195)`)
}
