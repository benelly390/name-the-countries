import { feature } from 'topojson-client'
import countries50 from 'world-atlas/countries-50m.json'
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import { COUNTRY_ID_BY_NORMALIZED_NAME, GAME_COUNTRIES } from '../data/countries'

export type CountryGeometryFeature = Feature<Polygon | MultiPolygon, { id: string; geometryName: string }>
export type CountryPolygonRings = { outer: number[][]; holes: number[][][] }

const RADIUS = 2

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
  // world-atlas v2 only ships TopoJSON files (countries-*.json); country-names.tsv is not distributed,
  // so names must be resolved from geometry properties instead of importing a missing package asset.
  const candidates = ['name', 'NAME', 'admin', 'ADMIN', 'sovereignt', 'SOVEREIGNT', 'geounit', 'GEOUNIT']
  for (const key of candidates) {
    const value = item.properties?.[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

let hasLoggedValidation = false

export function getGameCountryFeatures(): CountryGeometryFeature[] {
  const fc = feature(
    countries50 as never,
    (countries50 as any).objects.countries
  ) as unknown as FeatureCollection<Polygon | MultiPolygon, Record<string, unknown>>

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
    const polygonFeatureCount = mapped.filter((item) => item.geometry.type === 'Polygon').length
    const multiPolygonFeatureCount = mapped.length - polygonFeatureCount
    const polygonParts = mapped.flatMap(getFeaturePolygons)
    const holeRingCount = polygonParts.reduce((sum, polygon) => sum + polygon.holes.length, 0)
    const invalidPolygons = polygonParts.filter((polygon) => polygon.outer.length < 3 || approximateLonLatArea(polygon.outer) === 0)

    const featuresWithName = fc.features.filter((featureItem) => Boolean(readFeatureName(featureItem))).length
    const sampleUnmappedByNumericId = fc.features
      .map((featureItem) => {
        const geometryName = readFeatureName(featureItem)
        const numericId = featureItem.id !== undefined ? String(featureItem.id) : '(missing-id)'
        const mappedId = COUNTRY_ID_BY_NORMALIZED_NAME.get(normalizeCountryName(geometryName))
        if (mappedId) return null
        return `${numericId}:${geometryName || '(missing-name)'}`
      })
      .filter((item): item is string => Boolean(item))
      .slice(0, 10)
    const mappedIds = new Set(mapped.map((featureItem) => featureItem.properties.id))
    const missingCountries = GAME_COUNTRIES.filter((country) => !mappedIds.has(country.id)).map((country) => country.displayName)
    console.info(
      `[geo] raw features=${fc.features.length}, features with names=${featuresWithName}, mapped features=${mapped.length}, polygons=${polygonFeatureCount}, multipolygons=${multiPolygonFeatureCount}, polygon parts=${polygonParts.length}, hole rings=${holeRingCount}`
    )
    if (invalidPolygons.length > 0) {
      console.warn(`[geo] invalid polygon rings=${invalidPolygons.length}`, invalidPolygons.slice(0, 5))
    }
    if (sampleUnmappedByNumericId.length > 0) {
      console.info('[geo] sample unmapped geometry entries (numeric-id:name)', sampleUnmappedByNumericId)
    }
    if (missingCountries.length > 0) {
      console.warn(`[geo] missing geometry mapping for ${missingCountries.length} playable countries`, missingCountries)
    }
  }

  return mapped
}

export function getFeaturePolygons(featureItem: CountryGeometryFeature): CountryPolygonRings[] {
  if (featureItem.geometry.type === 'Polygon') {
    const [outer, ...holes] = featureItem.geometry.coordinates as number[][][]
    return outer ? [{ outer, holes }] : []
  }

  return (featureItem.geometry.coordinates as number[][][][])
    .map(([outer, ...holes]) => {
      if (!outer) return null
      return { outer, holes }
    })
    .filter((item): item is CountryPolygonRings => Boolean(item))
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
