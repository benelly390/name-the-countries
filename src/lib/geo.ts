import { feature } from 'topojson-client'
import countries110 from 'world-atlas/countries-110m.json'
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import { COUNTRY_BY_ID } from '../data/countries'

export type CountryGeometryFeature = Feature<Polygon | MultiPolygon, { id: string }>

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

function normalizeId(id: string | number): string {
  return String(Number(id))
}

export function getGameCountryFeatures(): CountryGeometryFeature[] {
  const fc = feature(
    countries110 as never,
    (countries110 as any).objects.countries
  ) as FeatureCollection<Polygon | MultiPolygon, { name: string }>

  return fc.features
    .filter((item) => item.id !== undefined && COUNTRY_BY_ID.has(normalizeId(item.id as string | number)))
    .map((item) => ({
      ...item,
      properties: { id: normalizeId(item.id as string | number) }
    }))
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
