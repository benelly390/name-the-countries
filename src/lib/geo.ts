import { feature } from 'topojson-client'
import countries50 from 'world-atlas/countries-50m.json'
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import * as THREE from 'three'
import { ShapeUtils } from 'three'
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

function lonLatToUnitVector(lon: number, lat: number): THREE.Vector3 {
  const v = lonLatToVector3(lon, lat, 1)
  return new THREE.Vector3(v.x, v.y, v.z).normalize()
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
  return ''
}

type LocalProjection = {
  up: THREE.Vector3
  east: THREE.Vector3
  north: THREE.Vector3
}

type ProjectedPoint = {
  x: number
  y: number
}

function createLocalProjection(outer: number[][]): LocalProjection {
  const avg = outer.reduce((acc, [lon, lat]) => acc.add(lonLatToUnitVector(lon, lat)), new THREE.Vector3())
  const up = avg.lengthSq() > 1e-10 ? avg.normalize() : lonLatToUnitVector(outer[0][0], outer[0][1])

  const worldUp = Math.abs(up.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)
  const east = new THREE.Vector3().crossVectors(worldUp, up).normalize()
  const north = new THREE.Vector3().crossVectors(up, east).normalize()

  return { up, east, north }
}

function projectToLocalPlane(lon: number, lat: number, projection: LocalProjection): ProjectedPoint {
  const p = lonLatToUnitVector(lon, lat)
  const denom = Math.max(1e-6, p.dot(projection.up))
  return {
    x: p.dot(projection.east) / denom,
    y: p.dot(projection.north) / denom
  }
}

function projectRingToLocalPlane(ring: number[][], projection: LocalProjection): ProjectedPoint[] {
  const sanitized = sanitizeRing(ring)
  return sanitized.map(([lon, lat]) => projectToLocalPlane(lon, lat, projection))
}

function localPlaneToSphere(point: ProjectedPoint, projection: LocalProjection, radius: number): THREE.Vector3 {
  const rho = Math.sqrt(point.x * point.x + point.y * point.y)
  const c = Math.atan(rho)

  const direction = new THREE.Vector3().copy(projection.up).multiplyScalar(Math.cos(c))
  if (rho > 1e-8) {
    const tangent = new THREE.Vector3()
      .copy(projection.east)
      .multiplyScalar(point.x)
      .add(new THREE.Vector3().copy(projection.north).multiplyScalar(point.y))
      .multiplyScalar(Math.sin(c) / rho)
    direction.add(tangent)
  }

  return direction.normalize().multiplyScalar(radius)
}

function sanitizeRing(ring: number[][]): number[][] {
  if (ring.length < 3) return ring
  const deduped = ring.filter(([lon, lat], idx) => {
    if (idx === 0) return true
    const [prevLon, prevLat] = ring[idx - 1]
    return lon !== prevLon || lat !== prevLat
  })
  if (deduped.length > 1) {
    const [firstLon, firstLat] = deduped[0]
    const [lastLon, lastLat] = deduped[deduped.length - 1]
    if (firstLon === lastLon && firstLat === lastLat) {
      deduped.pop()
    }
  }
  return deduped
}

function toVec2(points: ProjectedPoint[]): THREE.Vector2[] {
  return points.map((point) => new THREE.Vector2(point.x, point.y))
}

function segmentsIntersect(a1: ProjectedPoint, a2: ProjectedPoint, b1: ProjectedPoint, b2: ProjectedPoint): boolean {
  const orient = (p: ProjectedPoint, q: ProjectedPoint, r: ProjectedPoint) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x)
  const o1 = orient(a1, a2, b1)
  const o2 = orient(a1, a2, b2)
  const o3 = orient(b1, b2, a1)
  const o4 = orient(b1, b2, a2)
  return o1 * o2 < 0 && o3 * o4 < 0
}

function isSelfIntersectingRing(points: ProjectedPoint[]): boolean {
  if (points.length < 4) return false
  for (let i = 0; i < points.length; i += 1) {
    const a1 = points[i]
    const a2 = points[(i + 1) % points.length]
    for (let j = i + 1; j < points.length; j += 1) {
      if (Math.abs(i - j) <= 1) continue
      if (i === 0 && j === points.length - 1) continue
      const b1 = points[j]
      const b2 = points[(j + 1) % points.length]
      if (segmentsIntersect(a1, a2, b1, b2)) return true
    }
  }
  return false
}

function countDatelineJumps(ring: number[][]): number {
  const sanitized = sanitizeRing(ring)
  let jumps = 0
  for (let i = 1; i < sanitized.length; i += 1) {
    const prev = sanitized[i - 1][0]
    const cur = sanitized[i][0]
    if (Math.abs(cur - prev) > 180) {
      jumps += 1
    }
  }
  return jumps
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

    const debugTargets = new Set(['canada', 'united states of america', 'russia', 'fiji'])
    mapped
      .filter((item) => debugTargets.has(item.properties.geometryName.toLowerCase()))
      .forEach((item) => {
        const polygons = getFeaturePolygons(item)
        const diagnostics = polygons.map((polygon, idx) => {
          const projection = createLocalProjection(polygon.outer)
          const projectedOuter = projectRingToLocalPlane(polygon.outer, projection)
          return {
            part: idx,
            outerPoints: sanitizeRing(polygon.outer).length,
            holes: polygon.holes.length,
            datelineJumps: countDatelineJumps(polygon.outer),
            holeDatelineJumps: polygon.holes.reduce((sum, ring) => sum + countDatelineJumps(ring), 0),
            selfIntersectOuter: isSelfIntersectingRing(projectedOuter),
            selfIntersectHoles: polygon.holes.some((ring) => isSelfIntersectingRing(projectRingToLocalPlane(ring, projection))),
            maxHoleArea: polygon.holes.reduce((max, ring) => Math.max(max, approximateLonLatArea(ring)), 0)
          }
        })
        console.info(`[geo][diagnostics] ${item.properties.geometryName} polygon-parts=${polygons.length}`, diagnostics)
      })
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

export function buildSphericalPolygonGeometry(polygon: CountryPolygonRings, radius: number): THREE.BufferGeometry | null {
  const cleanOuter = sanitizeRing(polygon.outer)
  if (cleanOuter.length < 3) return null

  const projection = createLocalProjection(cleanOuter)
  const outer2d = projectRingToLocalPlane(cleanOuter, projection)
  if (outer2d.length < 3 || isSelfIntersectingRing(outer2d)) {
    return null
  }

  const holePaths: ProjectedPoint[][] = []
  for (const holeRing of polygon.holes) {
    const cleanHole = sanitizeRing(holeRing)
    if (cleanHole.length < 3) continue
    const projected = projectRingToLocalPlane(cleanHole, projection)
    if (projected.length < 3 || isSelfIntersectingRing(projected)) continue
    holePaths.push(projected)
  }

  const contour = toVec2(outer2d)
  if (!ShapeUtils.isClockWise(contour)) contour.reverse()

  const holes = holePaths.map((ring) => {
    const vec2 = toVec2(ring)
    if (ShapeUtils.isClockWise(vec2)) vec2.reverse()
    return vec2
  })

  const triangles = ShapeUtils.triangulateShape(contour, holes)

  const orientedOuter = contour.map((point) => ({ x: point.x, y: point.y }))
  const orientedHoles = holes.map((ring) => ring.map((point) => ({ x: point.x, y: point.y })))
  const vertexPoints = [...orientedOuter, ...orientedHoles.flat()]
  if (vertexPoints.length === 0 || triangles.length === 0) {
    return null
  }

  const positions = new Float32Array(vertexPoints.length * 3)
  vertexPoints.forEach((point, idx) => {
    const sphere = localPlaneToSphere(point, projection, radius)
    positions[idx * 3] = sphere.x
    positions[idx * 3 + 1] = sphere.y
    positions[idx * 3 + 2] = sphere.z
  })

  const indices = triangles.flat()

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
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
