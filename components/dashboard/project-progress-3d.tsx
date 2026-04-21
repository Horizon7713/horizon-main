"use client"

import { Canvas } from "@react-three/fiber"
import { OrbitControls, Html, PerspectiveCamera } from "@react-three/drei"
import { useMemo } from "react"
import * as THREE from "three"
import {
  DEFAULT_HOUSE_SCHEMA,
  getHouseDimensions,
  HouseModelSchema,
  normalizeHouseSchema,
} from "@/lib/house-model/schema"
import {
  getStageVisibility,
  getVisualStageLabel,
  VisualStage,
} from "@/lib/house-model/visual-stage"

type ProjectProgress3DProps = {
  stage: VisualStage
  schema?: Partial<HouseModelSchema> | null
  height?: number
  showBadge?: boolean
}

function RoofMesh({
  width,
  depth,
  wallHeight,
  pitch = 6,
  ridgeDirection = "x",
  color = "#7c3aed",
}: {
  width: number
  depth: number
  wallHeight: number
  pitch?: number
  ridgeDirection?: "x" | "y"
  color?: string
}) {
  const roofHeight =
    ridgeDirection === "x" ? Math.max(2, depth * (pitch / 12) * 0.45) : Math.max(2, width * (pitch / 12) * 0.45)

  const shape = useMemo(() => {
    const s = new THREE.Shape()

    if (ridgeDirection === "x") {
      s.moveTo(-width / 2, 0)
      s.lineTo(0, roofHeight)
      s.lineTo(width / 2, 0)
      s.lineTo(-width / 2, 0)
    } else {
      s.moveTo(-depth / 2, 0)
      s.lineTo(0, roofHeight)
      s.lineTo(depth / 2, 0)
      s.lineTo(-depth / 2, 0)
    }

    return s
  }, [ridgeDirection, roofHeight, width, depth])

  const extrudeSettings = useMemo(
    () => ({
      steps: 1,
      depth: ridgeDirection === "x" ? depth : width,
      bevelEnabled: false,
    }),
    [ridgeDirection, depth, width],
  )

  return (
    <group position={[0, wallHeight, 0]}>
      {ridgeDirection === "x" ? (
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -depth / 2]}>
          <extrudeGeometry args={[shape, extrudeSettings]} />
          <meshStandardMaterial color={color} roughness={0.7} metalness={0.08} />
        </mesh>
      ) : (
        <mesh rotation={[Math.PI / 2, Math.PI / 2, 0]} position={[-width / 2, 0, 0]}>
          <extrudeGeometry args={[shape, extrudeSettings]} />
          <meshStandardMaterial color={color} roughness={0.7} metalness={0.08} />
        </mesh>
      )}
    </group>
  )
}

function HouseScene({
  stage,
  schema,
}: {
  stage: VisualStage
  schema: HouseModelSchema
}) {
  const visibility = getStageVisibility(stage)
  const dims = getHouseDimensions(schema)

  const width = dims.width
  const depth = dims.depth
  const wallHeight = schema.wallHeight * schema.levels
  const foundationHeight = schema.foundation.stemWallHeight || 2.5
  const footingDepth = schema.foundation.footingDepth || 2
  const footingWidth = schema.foundation.footingWidth || 1.5
  const slabThickness = schema.foundation.slabThickness || 0.5

  const colors = {
    roof: schema.style?.roofColor || "#7c3aed",
    walls: schema.style?.wallColor || "#d4d4d8",
    foundation: schema.style?.foundationColor || "#71717a",
    frame: schema.style?.frameColor || "#93c5fd",
    floor: schema.style?.floorColor || "#a16207",
    glass: schema.style?.glassColor || "#7dd3fc",
  }

  return (
    <group>
      <ambientLight intensity={0.8} />
      <directionalLight position={[18, 20, 14]} intensity={1.4} castShadow />
      <directionalLight position={[-14, 8, -10]} intensity={0.45} />
      <hemisphereLight groundColor="#111111" intensity={0.45} />

      {visibility.showGround ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
          <planeGeometry args={[140, 140]} />
          <meshStandardMaterial color="#18181b" />
        </mesh>
      ) : null}

      {visibility.showExcavation ? (
        <mesh position={[0, -0.55, 0]} receiveShadow>
          <boxGeometry args={[width + 8, 1, depth + 8]} />
          <meshStandardMaterial color="#4b2e19" roughness={1} />
        </mesh>
      ) : null}

      {visibility.showFootings ? (
        <group position={[0, -footingDepth / 2, 0]}>
          <mesh>
            <boxGeometry args={[width + footingWidth * 2, footingDepth, footingWidth]} />
            <meshStandardMaterial color="#a1a1aa" />
          </mesh>
          <mesh position={[0, 0, depth / 2 + footingWidth / 2]}>
            <boxGeometry args={[width + footingWidth * 2, footingDepth, footingWidth]} />
            <meshStandardMaterial color="#a1a1aa" />
          </mesh>
          <mesh position={[width / 2 + footingWidth / 2, 0, 0]}>
            <boxGeometry args={[footingWidth, footingDepth, depth]} />
            <meshStandardMaterial color="#a1a1aa" />
          </mesh>
          <mesh position={[-(width / 2 + footingWidth / 2), 0, 0]}>
            <boxGeometry args={[footingWidth, footingDepth, depth]} />
            <meshStandardMaterial color="#a1a1aa" />
          </mesh>
        </group>
      ) : null}

      {visibility.showFoundationWalls ? (
        <group position={[0, foundationHeight / 2, 0]}>
          <mesh position={[0, 0, -depth / 2]}>
            <boxGeometry args={[width, foundationHeight, 0.6]} />
            <meshStandardMaterial color={colors.foundation} />
          </mesh>
          <mesh position={[0, 0, depth / 2]}>
            <boxGeometry args={[width, foundationHeight, 0.6]} />
            <meshStandardMaterial color={colors.foundation} />
          </mesh>
          <mesh position={[width / 2, 0, 0]}>
            <boxGeometry args={[0.6, foundationHeight, depth]} />
            <meshStandardMaterial color={colors.foundation} />
          </mesh>
          <mesh position={[-width / 2, 0, 0]}>
            <boxGeometry args={[0.6, foundationHeight, depth]} />
            <meshStandardMaterial color={colors.foundation} />
          </mesh>
        </group>
      ) : null}

      {visibility.showSlab ? (
        <mesh position={[0, foundationHeight + slabThickness / 2, 0]}>
          <boxGeometry args={[width - 0.6, slabThickness, depth - 0.6]} />
          <meshStandardMaterial color="#e4e4e7" />
        </mesh>
      ) : null}

      {visibility.showFloorDeck ? (
        <mesh position={[0, foundationHeight + 0.2, 0]}>
          <boxGeometry args={[width - 0.8, 0.25, depth - 0.8]} />
          <meshStandardMaterial color={colors.floor} />
        </mesh>
      ) : null}

      {visibility.showFraming ? (
        <group position={[0, foundationHeight + wallHeight / 2, 0]}>
          <mesh>
            <boxGeometry args={[width, wallHeight, 0.35]} />
            <meshStandardMaterial color={colors.frame} transparent opacity={0.9} />
          </mesh>
          <mesh position={[0, 0, depth]}>
            <boxGeometry args={[width, wallHeight, 0.35]} />
            <meshStandardMaterial color={colors.frame} transparent opacity={0.9} />
          </mesh>
          <mesh position={[width / 2, 0, depth / 2]}>
            <boxGeometry args={[0.35, wallHeight, depth]} />
            <meshStandardMaterial color={colors.frame} transparent opacity={0.9} />
          </mesh>
          <mesh position={[-width / 2, 0, depth / 2]}>
            <boxGeometry args={[0.35, wallHeight, depth]} />
            <meshStandardMaterial color={colors.frame} transparent opacity={0.9} />
          </mesh>
        </group>
      ) : null}

      {visibility.showRoofShell ? (
        <RoofMesh
          width={width + (schema.roof.overhang || 1) * 2}
          depth={depth + (schema.roof.overhang || 1) * 2}
          wallHeight={foundationHeight + wallHeight}
          pitch={schema.roof.pitch}
          ridgeDirection={schema.roof.ridgeDirection}
          color={colors.roof}
        />
      ) : null}

      {visibility.showExteriorShell ? (
        <group position={[0, foundationHeight + wallHeight / 2, 0]}>
          <mesh>
            <boxGeometry args={[width, wallHeight, 0.45]} />
            <meshStandardMaterial color={colors.walls} />
          </mesh>
          <mesh position={[0, 0, depth]}>
            <boxGeometry args={[width, wallHeight, 0.45]} />
            <meshStandardMaterial color={colors.walls} />
          </mesh>
          <mesh position={[width / 2, 0, depth / 2]}>
            <boxGeometry args={[0.45, wallHeight, depth]} />
            <meshStandardMaterial color={colors.walls} />
          </mesh>
          <mesh position={[-width / 2, 0, depth / 2]}>
            <boxGeometry args={[0.45, wallHeight, depth]} />
            <meshStandardMaterial color={colors.walls} />
          </mesh>
        </group>
      ) : null}

      {visibility.showOpenings ? (
        <group position={[0, foundationHeight + wallHeight * 0.55, -depth / 2 - 0.25]}>
          {schema.openings.windows
            .filter((w) => w.wall === "north")
            .map((window) => (
              <mesh
                key={window.id}
                position={[window.x, 0.5, 0]}
              >
                <boxGeometry args={[window.width, window.height, 0.08]} />
                <meshStandardMaterial color={colors.glass} transparent opacity={0.8} />
              </mesh>
            ))}
        </group>
      ) : null}

      {visibility.showRoughIn ? (
        <group position={[0, foundationHeight + wallHeight * 0.5, 0]}>
          <mesh position={[0, 0.5, 0]}>
            <boxGeometry args={[width * 0.65, 0.18, 0.18]} />
            <meshStandardMaterial color="#f59e0b" />
          </mesh>
          <mesh position={[-width * 0.18, -1.5, 0]}>
            <boxGeometry args={[0.18, 3.6, 0.18]} />
            <meshStandardMaterial color="#38bdf8" />
          </mesh>
          <mesh position={[width * 0.18, -1.2, 0]}>
            <boxGeometry args={[0.18, 2.8, 0.18]} />
            <meshStandardMaterial color="#4ade80" />
          </mesh>
        </group>
      ) : null}

      {visibility.showInsulation ? (
        <mesh position={[0, foundationHeight + wallHeight / 2, 0]}>
          <boxGeometry args={[width - 1, wallHeight - 0.8, depth - 1]} />
          <meshStandardMaterial color="#fde68a" transparent opacity={0.35} />
        </mesh>
      ) : null}

      {visibility.showDrywall ? (
        <mesh position={[0, foundationHeight + wallHeight / 2, 0]}>
          <boxGeometry args={[width - 0.8, wallHeight - 0.6, depth - 0.8]} />
          <meshStandardMaterial color="#fafafa" transparent opacity={0.3} />
        </mesh>
      ) : null}

      {visibility.showInteriorFinish ? (
        <group position={[0, foundationHeight + 1.3, 0]}>
          <mesh>
            <boxGeometry args={[width * 0.45, 0.18, depth * 0.18]} />
            <meshStandardMaterial color="#f5deb3" />
          </mesh>
        </group>
      ) : null}

      {visibility.showCabinetry ? (
        <group position={[0, foundationHeight + 2.2, 0]}>
          <mesh position={[-width * 0.16, 0, -depth * 0.16]}>
            <boxGeometry args={[4, 2.3, 1.4]} />
            <meshStandardMaterial color="#fdba74" />
          </mesh>
          <mesh position={[width * 0.08, 0, -depth * 0.16]}>
            <boxGeometry args={[3.2, 2.3, 1.4]} />
            <meshStandardMaterial color="#fb923c" />
          </mesh>
        </group>
      ) : null}

      {visibility.showFlooring ? (
        <mesh position={[0, foundationHeight + 0.18, 0]}>
          <boxGeometry args={[width - 1, 0.1, depth - 1]} />
          <meshStandardMaterial color="#b45309" />
        </mesh>
      ) : null}

      {visibility.showCompleteBadge ? (
        <Html position={[0, foundationHeight + wallHeight + 9, 0]} center>
          <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-200">
            Complete
          </div>
        </Html>
      ) : null}
    </group>
  )
}

export function ProjectProgress3D({
  stage,
  schema,
  height = 420,
  showBadge = true,
}: ProjectProgress3DProps) {
  const normalized = normalizeHouseSchema(schema || DEFAULT_HOUSE_SCHEMA)

  return (
    <div
      className="relative overflow-hidden rounded-[28px] border border-zinc-800 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_28%),linear-gradient(to_bottom,rgba(24,24,27,1),rgba(9,9,11,1))]"
      style={{ height }}
    >
      {showBadge ? (
        <div className="absolute left-4 top-4 z-10 rounded-full border border-zinc-800 bg-black/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-300 backdrop-blur">
          {getVisualStageLabel(stage)}
        </div>
      ) : null}

      <Canvas shadows dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[42, 28, 42]} fov={38} />
        <HouseScene stage={stage} schema={normalized} />
        <OrbitControls
          enablePan={false}
          minDistance={28}
          maxDistance={92}
          minPolarAngle={0.45}
          maxPolarAngle={1.25}
        />
      </Canvas>
    </div>
  )
}