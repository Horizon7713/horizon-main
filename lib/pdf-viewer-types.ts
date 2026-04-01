// ============================================================================
// PDF Viewer Types — Production Measurement System
// All coordinates stored in PDF space. Formatted strings computed at render time.
// ============================================================================

export type MarkupType =
  | 'select'
  | 'line'
  | 'rectangle'
  | 'ellipse'
  | 'text'
  | 'polyline'
  | 'distance'
  | 'area'
  | 'calibrate'

export interface Point {
  x: number
  y: number
}

// ---------------------------------------------------------------------------
// Per-page calibration scale — single source of truth for measurements
// ---------------------------------------------------------------------------
export interface PageScale {
  pageNumber: number
  inchesPerPixel: number // real-world inches per PDF-space pixel
  label?: string // e.g. '1/4" = 1\'-0"'
}

// ---------------------------------------------------------------------------
// Markup style
// ---------------------------------------------------------------------------
export interface MarkupStyle {
  strokeColor: string
  strokeWidth: number
  fillColor?: string
  fontFamily?: string
  fontSize?: number
  opacity: number
}

export const DEFAULT_STYLE: MarkupStyle = {
  strokeColor: '#FF0000',
  strokeWidth: 2,
  fillColor: 'rgba(255, 0, 0, 0.1)',
  fontFamily: 'Arial',
  fontSize: 14,
  opacity: 1,
}

// ---------------------------------------------------------------------------
// Base markup — shared fields
// ---------------------------------------------------------------------------
export interface BaseMarkup {
  id: string
  type: MarkupType
  pageNumber: number
  style: MarkupStyle
  createdAt: string
  updatedAt: string
  userId: string
  author: string
  status?: 'draft' | 'completed' | 'review' | 'approved'
}

// ---------------------------------------------------------------------------
// Geometry-only markups (no formatted strings stored)
// ---------------------------------------------------------------------------
export interface LineMarkup extends BaseMarkup {
  type: 'line'
  startPoint: Point
  endPoint: Point
}

export interface RectangleMarkup extends BaseMarkup {
  type: 'rectangle'
  x: number
  y: number
  width: number
  height: number
  rotation?: number
}

export interface EllipseMarkup extends BaseMarkup {
  type: 'ellipse'
  cx: number
  cy: number
  rx: number
  ry: number
  rotation?: number
}

export interface TextMarkup extends BaseMarkup {
  type: 'text'
  x: number
  y: number
  text: string
  maxWidth?: number
}

export interface PolylineMarkup extends BaseMarkup {
  type: 'polyline'
  points: Point[]
  closed?: boolean
}

/**
 * Distance markup — stores only geometry + pixel measurement.
 * Real-world values are derived at render time via `inchesPerPixel`.
 */
export interface DistanceMarkup extends BaseMarkup {
  type: 'distance'
  startPoint: Point
  endPoint: Point
  pixelDistance: number
}

/**
 * Area markup — stores only geometry + pixel area.
 * Real-world values are derived at render time via `inchesPerPixel`.
 */
export interface AreaMarkup extends BaseMarkup {
  type: 'area'
  points: Point[]
  pixelArea: number
}

export type Markup =
  | LineMarkup
  | RectangleMarkup
  | EllipseMarkup
  | TextMarkup
  | PolylineMarkup
  | DistanceMarkup
  | AreaMarkup

// ---------------------------------------------------------------------------
// Legacy DrawingScale kept for context reducer compatibility during migration
// Maps to PageScale internally. Will be removed in future cleanup.
// ---------------------------------------------------------------------------
export interface DrawingScale {
  pixelDistance: number
  realWorldDistance: number
  unit: string
  inchesPerPixel: number
}

// ---------------------------------------------------------------------------
// Viewer state
// ---------------------------------------------------------------------------
export interface PDFViewerState {
  currentPage: number
  totalPages: number
  zoom: number
  panX: number
  panY: number
  selectedMarkupId: string | null
  markups: Markup[]
  activeTool: MarkupType | null
  isDrawing: boolean
  drawingScale: DrawingScale | null
  pageScales: PageScale[]
}

export interface PDFFile {
  id: string
  name: string
  url: string
  projectId: string
  uploadedBy: string
  uploadedAt: string
  size: number
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
export const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2]
export const DEFAULT_ZOOM = 1
export const ZOOM_STEP = 0.1
