export type Point2D = {
  x: number
  y: number
}

export type RoofType = "gable" | "hip" | "shed" | "flat"
export type FoundationType = "slab" | "crawlspace" | "basement"

export type Opening = {
  id: string
  wall: "north" | "south" | "east" | "west"
  x: number
  y: number
  width: number
  height: number
}

export type HouseModelSchema = {
  footprint: Point2D[]
  levels: number
  wallHeight: number
  roof: {
    type: RoofType
    pitch?: number
    ridgeDirection?: "x" | "y"
    overhang?: number
  }
  foundation: {
    type: FoundationType
    footingDepth?: number
    footingWidth?: number
    stemWallHeight?: number
    slabThickness?: number
  }
  openings: {
    windows: Opening[]
    doors: Opening[]
  }
  style?: {
    roofColor?: string
    wallColor?: string
    foundationColor?: string
    frameColor?: string
    floorColor?: string
    glassColor?: string
  }
  metadata?: {
    name?: string
    source?: "manual" | "plan_generated" | "ai_generated"
    createdAt?: string
    updatedAt?: string
  }
}

export type HouseDimensions = {
  minX: number
  maxX: number
  minY: number
  maxY: number
  width: number
  depth: number
  centerX: number
  centerY: number
}

export const DEFAULT_HOUSE_SCHEMA: HouseModelSchema = {
  footprint: [
    { x: -16, y: -12 },
    { x: 16, y: -12 },
    { x: 16, y: 12 },
    { x: -16, y: 12 },
  ],
  levels: 1,
  wallHeight: 10,
  roof: {
    type: "gable",
    pitch: 6,
    ridgeDirection: "x",
    overhang: 1,
  },
  foundation: {
    type: "slab",
    footingDepth: 2,
    footingWidth: 1.5,
    stemWallHeight: 2.5,
    slabThickness: 0.5,
  },
  openings: {
    windows: [
      {
        id: "w-front-1",
        wall: "north",
        x: -8,
        y: 0,
        width: 4,
        height: 3,
      },
      {
        id: "w-front-2",
        wall: "north",
        x: 8,
        y: 0,
        width: 4,
        height: 3,
      },
      {
        id: "w-rear-1",
        wall: "south",
        x: 0,
        y: 0,
        width: 6,
        height: 4,
      },
    ],
    doors: [
      {
        id: "d-front-1",
        wall: "north",
        x: 0,
        y: 0,
        width: 3,
        height: 7,
      },
    ],
  },
  style: {
    roofColor: "#7c3aed",
    wallColor: "#d4d4d8",
    foundationColor: "#71717a",
    frameColor: "#93c5fd",
    floorColor: "#a16207",
    glassColor: "#7dd3fc",
  },
  metadata: {
    source: "manual",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
}

export function getHouseDimensions(schema: HouseModelSchema): HouseDimensions {
  const xs = schema.footprint.map((p) => p.x)
  const ys = schema.footprint.map((p) => p.y)

  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    depth: maxY - minY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  }
}

export function normalizeHouseSchema(
  input?: Partial<HouseModelSchema> | null,
): HouseModelSchema {
  const schema: HouseModelSchema = {
    ...DEFAULT_HOUSE_SCHEMA,
    ...input,
    roof: {
      ...DEFAULT_HOUSE_SCHEMA.roof,
      ...(input?.roof || {}),
    },
    foundation: {
      ...DEFAULT_HOUSE_SCHEMA.foundation,
      ...(input?.foundation || {}),
    },
    openings: {
      windows: input?.openings?.windows || DEFAULT_HOUSE_SCHEMA.openings.windows,
      doors: input?.openings?.doors || DEFAULT_HOUSE_SCHEMA.openings.doors,
    },
    style: {
      ...DEFAULT_HOUSE_SCHEMA.style,
      ...(input?.style || {}),
    },
    metadata: {
      ...DEFAULT_HOUSE_SCHEMA.metadata,
      ...(input?.metadata || {}),
    },
    footprint:
      input?.footprint && input.footprint.length >= 4
        ? input.footprint
        : DEFAULT_HOUSE_SCHEMA.footprint,
  }

  return schema
}

export function createSimpleRectHouseSchema({
  width = 36,
  depth = 28,
  levels = 1,
  wallHeight = 10,
  roofType = "gable",
  foundationType = "slab",
}: {
  width?: number
  depth?: number
  levels?: number
  wallHeight?: number
  roofType?: RoofType
  foundationType?: FoundationType
} = {}): HouseModelSchema {
  const halfW = width / 2
  const halfD = depth / 2

  return normalizeHouseSchema({
    footprint: [
      { x: -halfW, y: -halfD },
      { x: halfW, y: -halfD },
      { x: halfW, y: halfD },
      { x: -halfW, y: halfD },
    ],
    levels,
    wallHeight,
    roof: {
      type: roofType,
      pitch: 6,
      ridgeDirection: width >= depth ? "x" : "y",
      overhang: 1,
    },
    foundation: {
      type: foundationType,
      footingDepth: 2,
      footingWidth: 1.5,
      stemWallHeight: 2.5,
      slabThickness: 0.5,
    },
  })
}