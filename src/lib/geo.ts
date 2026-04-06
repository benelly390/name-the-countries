import { feature } from 'topojson-client'
import countries50 from 'world-atlas/countries-50m.json'
import countryNamesTsv from 'world-atlas/country-names.tsv?raw'
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import { COUNTRY_ID_BY_NORMALIZED_NAME, GAME_COUNTRIES } from '../data/countries'

export type CountryGeometryFeature = Feature<Polygon | MultiPolygon, { id: string; geometryName: string }>

const RADIUS = 2

const NAME_BY_NUMERIC_ID = new Map<string, string>()
for (const line of countryNamesTsv.trim().split('\n').slice(1)) {
  const [id, name] = line.split('\t')
  if (id && name) NAME_BY_NUMERIC_ID.set(id.trim(), name.trim())
}

export function lonLatToVector3(lon: number, lat: number, radius = RADIUS) {
  const phi = ((90 - lat) * Math.PI) / 180
  const theta = ((lon + 180) * Math.PI) / 180

  return {
    x: -(radius * Math.sin(phi) * Math.cos(theta)),
    y: radius * Math.cos(phi),
    z: radius * Math.sin(phi) * Math.sin(theta)
  }
}

function normalizeCountryName(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
}

function readFeatureName(item: Feature<Polygon | MultiPolygon, Record<string, unknown>>): string {
  const candidates = ['name', 'NAME', 'admin', 'ADMIN', 'sovereignt', 'SOVEREIGNT', 'geounit', 'GEOUNIT']
  for (const key of candidates) {
    const value = item.properties?.[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }

  const numericId = item.id !== undefined ? String(item.id) : ''
  return NAME_BY_NUMERIC_ID.get(numericId) ?? ''
}

let hasLoggedValidation = false

export function getGameCountryFeatures(): CountryGeometryFeature[] {
  const fc = feature(
    countries50 as never,
    (countries50 as any).objects.countries
  ) as FeatureCollection<Polygon | MultiPolygon, Record<string, unknown>>

  const mapped = fc.features
    .map((item) => {
      const geometryName = readFeatureName(item)
      const id = COUNTRY_ID_BY_NORMALIZED_NAME.get(normalizeCountryName(geometryName))
      if (!id) return null
      return {
        ...item,
        properties: { id, geometryName }
      }
    })
    .filter((item): item is CountryGeometryFeature => Boolean(item))

  if (!hasLoggedValidation) {
    hasLoggedValidation = true
    const mappedIds = new Set(mapped.map((featureItem) => featureItem.properties.id))
    const missingCountries = GAME_COUNTRIES.filter((country) => !mappedIds.has(country.id)).map((country) => country.displayName)
    console.info(
      `[geo] raw features=${fc.features.length}, mapped features=${mapped.length}, playable countries mapped=${mappedIds.size}/${GAME_COUNTRIES.length}`
    )
    if (missingCountries.length > 0) {
      console.warn(`[geo] missing geometry mapping for ${missingCountries.length} playable countries`, missingCountries)
    }
  }

  return mapped
}

export function getPolygonRings(featureItem: CountryGeometryFeature): number[][][] {
  if (featureItem.geometry.type === 'Polygon') {
    return featureItem.geometry.coordinates as number[][][]
  }

  return (featureItem.geometry.coordinates as number[][][][]).flat()
}

export function approximateLonLatArea(ring: number[][]): number {
  let sum = 0
  for (let i = 0; i < ring.length; i += 1) {
    const [x1, y1] = ring[i]
    const [x2, y2] = ring[(i + 1) % ring.length]
    sum += x1 * y2 - x2 * y1
  }
  return Math.abs(sum / 2)
}
