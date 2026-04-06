import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useMemo, useState } from 'react'
import * as THREE from 'three'
import { COUNTRY_BY_ID } from '../data/countries'
import { approximateLonLatArea, getGameCountryFeatures, getPolygonRings, lonLatToVector3 } from '../lib/geo'
import type { CountryStatus } from '../types/country'

type GlobeCanvasProps = {
  statuses: Record<string, CountryStatus>
  selectedCountryId: string | null
  onSelectCountry: (id: string) => void
}

const COLORS = {
  unattempted: '#4b5d67',
  correct: '#2e9d55',
  skipped: '#bf3f3f',
  hovered: '#6f8190',
  selected: '#34424a',
  ocean: '#0f172a'
}

function CountryShape({
  id,
  rings,
  status,
  hovered,
  selected,
  onSelect
}: {
  id: string
  rings: number[][][]
  status: CountryStatus
  hovered: boolean
  selected: boolean
  onSelect: (id: string) => void
}) {
  const geometries = useMemo(() => {
    return rings.map((ring) => {
      const shape = new THREE.Shape()
      ring.forEach(([lon, lat], idx) => {
        if (idx === 0) {
          shape.moveTo(lon, lat)
        } else {
          shape.lineTo(lon, lat)
        }
      })
      const geo = new THREE.ShapeGeometry(shape)
      const pos = geo.attributes.position
      for (let i = 0; i < pos.count; i += 1) {
        const lon = pos.getX(i)
        const lat = pos.getY(i)
        const sphere = lonLatToVector3(lon, lat, selected ? 2.05 : 2.01)
        pos.setXYZ(i, sphere.x, sphere.y, sphere.z)
      }
      geo.computeVertexNormals()
      return geo
    })
  }, [rings, selected])

  const color = selected
    ? COLORS.selected
    : hovered && status === 'unattempted'
      ? COLORS.hovered
      : COLORS[status]

  return (
    <group>
      {geometries.map((geometry, idx) => (
        <mesh key={`${id}-${idx}`} geometry={geometry} onClick={() => onSelect(id)}>
          <meshStandardMaterial color={color} side={THREE.DoubleSide} roughness={0.85} metalness={0.1} />
        </mesh>
      ))}
    </group>
  )
}

function TinyCountryHotspots({
  tiny,
  statuses,
  selectedCountryId,
  onSelect
}: {
  tiny: { id: string; point: THREE.Vector3 }[]
  statuses: Record<string, CountryStatus>
  selectedCountryId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <group>
      {tiny.map(({ id, point }) => {
        const status = statuses[id]
        const baseColor = status === 'correct' ? COLORS.correct : status === 'skipped' ? COLORS.skipped : '#8aa1b1'
        const color = id === selectedCountryId ? '#c5d6df' : baseColor
        return (
          <mesh key={`hotspot-${id}`} position={point} onClick={() => onSelect(id)}>
            <sphereGeometry args={[0.03, 8, 8]} />
            <meshBasicMaterial color={color} />
          </mesh>
        )
      })}
    </group>
  )
}

export default function GlobeCanvas({ statuses, selectedCountryId, onSelectCountry }: GlobeCanvasProps) {
  const [hoveredCountryId, setHoveredCountryId] = useState<string | null>(null)

  const features = useMemo(() => getGameCountryFeatures(), [])

  const tinyHotspots = useMemo(() => {
    return features
      .map((feature) => {
        const id = feature.properties.id
        const rings = getPolygonRings(feature)
        const largestRing = rings.reduce((acc, ring) => (approximateLonLatArea(ring) > approximateLonLatArea(acc) ? ring : acc), rings[0])
        const area = approximateLonLatArea(largestRing)
        if (area > 20) return null

        const centroid = largestRing.reduce(
          (acc, [lon, lat]) => ({ lon: acc.lon + lon, lat: acc.lat + lat }),
          { lon: 0, lat: 0 }
        )
        const lon = centroid.lon / largestRing.length
        const lat = centroid.lat / largestRing.length
        const vec = lonLatToVector3(lon, lat, 2.08)
        return { id, point: new THREE.Vector3(vec.x, vec.y, vec.z) }
      })
      .filter((item): item is { id: string; point: THREE.Vector3 } => Boolean(item))
  }, [features])

  return (
    <Canvas camera={{ position: [0, 0, 5.3], fov: 45 }}>
      <color attach="background" args={[COLORS.ocean]} />
      <ambientLight intensity={0.75} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <mesh>
        <sphereGeometry args={[2, 64, 64]} />
        <meshStandardMaterial color="#11253f" roughness={0.95} metalness={0.02} />
      </mesh>

      {features.map((feature) => {
        const id = feature.properties.id
        const status = statuses[id]
        if (!status || !COUNTRY_BY_ID.get(id)) {
          return null
        }
        return (
          <group
            key={id}
            onPointerOver={(evt) => {
              evt.stopPropagation()
              if (status === 'unattempted') {
                setHoveredCountryId(id)
                document.body.style.cursor = 'pointer'
              }
            }}
            onPointerOut={() => {
              if (hoveredCountryId === id) {
                setHoveredCountryId(null)
                document.body.style.cursor = 'default'
              }
            }}
          >
            <CountryShape
              id={id}
              rings={getPolygonRings(feature)}
              status={status}
              hovered={hoveredCountryId === id}
              selected={selectedCountryId === id}
              onSelect={onSelectCountry}
            />
          </group>
        )
      })}

      <TinyCountryHotspots tiny={tinyHotspots} statuses={statuses} selectedCountryId={selectedCountryId} onSelect={onSelectCountry} />
      <OrbitControls enablePan={false} minDistance={3.2} maxDistance={8} />
    </Canvas>
  )
}
