// ============================================================================
// Measurement Utilities — Production-Quality
// All formatting is computed at render time. No formatted strings stored.
// ============================================================================

import { Point, PageScale } from './pdf-viewer-types'

// ---------------------------------------------------------------------------
// 1. Distance
// ---------------------------------------------------------------------------

/** Euclidean distance between two PDF-space points. */
export function calculateDistance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  return Math.sqrt(dx * dx + dy * dy)
}

/** Convert pixel distance to real-world inches. */
export function pixelsToInches(pixelDist: number, inchesPerPixel: number): number {
  return pixelDist * inchesPerPixel
}

// ---------------------------------------------------------------------------
// 2. Feet-Inches Formatting  (1/16" precision)
// ---------------------------------------------------------------------------

/**
 * Format a total-inches value as `7' 2-3/16"`.
 * Rounds to the nearest 1/16 of an inch.
 */
export function formatFeetInches(totalInches: number): string {
  if (totalInches <= 0) return '0"'

  const feet = Math.floor(totalInches / 12)
  const remaining = totalInches - feet * 12
  const wholeIn = Math.floor(remaining)
  const frac = remaining - wholeIn

  // Round to nearest 1/16
  const sixteenths = Math.round(frac * 16)
  const fracStr = sixteenths === 16
    ? '' // carries into whole inches — handled below
    : simplifyFraction(sixteenths, 16)
  const carry = sixteenths === 16 ? 1 : 0
  const adjWholeIn = wholeIn + carry

  const inParts: string[] = []
  if (adjWholeIn > 0 || !fracStr) inParts.push(String(adjWholeIn))
  if (fracStr) {
    if (adjWholeIn > 0) inParts.push(`-${fracStr}`)
    else inParts.push(fracStr)
  }

  const inStr = inParts.join('') + '"'

  if (feet === 0) return inStr
  return `${feet}' ${inStr}`
}

function simplifyFraction(num: number, den: number): string {
  if (num === 0) return ''
  const g = gcd(num, den)
  return `${num / g}/${den / g}`
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}

// ---------------------------------------------------------------------------
// 3. Area (Shoelace formula)
// ---------------------------------------------------------------------------

/** Signed area via Shoelace — returns absolute value in PDF-space sq-pixels. */
export function calculatePolygonArea(points: Point[]): number {
  if (points.length < 3) return 0
  let area = 0
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i]
    const p2 = points[(i + 1) % points.length]
    area += p1.x * p2.y - p2.x * p1.y
  }
  return Math.abs(area / 2)
}

/** Convert pixel area to square feet. */
export function pixelAreaToSquareFeet(pixelArea: number, inchesPerPixel: number): number {
  const sqInches = pixelArea * inchesPerPixel * inchesPerPixel
  return sqInches / 144
}

/** Format square-feet for display. */
export function formatArea(sqFt: number): string {
  if (sqFt < 1) {
    const sqIn = sqFt * 144
    return `${sqIn.toFixed(1)} sq in`
  }
  return `${sqFt.toFixed(2)} sq ft`
}

// ---------------------------------------------------------------------------
// 4. Centroid (area-weighted)
// ---------------------------------------------------------------------------

/**
 * Area-weighted centroid of a simple polygon.
 * Falls back to simple average for degenerate cases.
 */
export function getPolygonCentroid(points: Point[]): Point {
  if (points.length === 0) return { x: 0, y: 0 }
  if (points.length < 3) {
    // Simple average for lines / 2 pts
    return {
      x: points.reduce((s, p) => s + p.x, 0) / points.length,
      y: points.reduce((s, p) => s + p.y, 0) / points.length,
    }
  }

  let cx = 0
  let cy = 0
  let signedArea = 0

  for (let i = 0; i < points.length; i++) {
    const p0 = points[i]
    const p1 = points[(i + 1) % points.length]
    const cross = p0.x * p1.y - p1.x * p0.y
    signedArea += cross
    cx += (p0.x + p1.x) * cross
    cy += (p0.y + p1.y) * cross
  }

  signedArea /= 2
  if (Math.abs(signedArea) < 1e-10) {
    // Degenerate polygon — fall back to simple avg
    return {
      x: points.reduce((s, p) => s + p.x, 0) / points.length,
      y: points.reduce((s, p) => s + p.y, 0) / points.length,
    }
  }

  cx /= 6 * signedArea
  cy /= 6 * signedArea
  return { x: cx, y: cy }
}

// ---------------------------------------------------------------------------
// 5. Coordinate transforms  (PDF <-> Screen)
// ---------------------------------------------------------------------------

/** Screen pixels -> PDF space (no pan support yet; add panX/panY when needed). */
export function screenToPdf(screenX: number, screenY: number, zoom: number, panX = 0, panY = 0): Point {
  return {
    x: (screenX - panX) / zoom,
    y: (screenY - panY) / zoom,
  }
}

/** PDF space -> screen pixels. */
export function pdfToScreen(pdfX: number, pdfY: number, zoom: number, panX = 0, panY = 0): Point {
  return {
    x: pdfX * zoom + panX,
    y: pdfY * zoom + panY,
  }
}

// ---------------------------------------------------------------------------
// 6. Render-time label builders (never stored in markup)
// ---------------------------------------------------------------------------

/** Build a distance label at render time. */
export function getDistanceLabel(pixelDistance: number, inchesPerPixel: number | null): string {
  if (!inchesPerPixel || inchesPerPixel <= 0) return `${pixelDistance.toFixed(1)} px`
  const totalInches = pixelsToInches(pixelDistance, inchesPerPixel)
  return formatFeetInches(totalInches)
}

/** Build an area label at render time. */
export function getAreaLabel(pixelArea: number, inchesPerPixel: number | null): string {
  if (!inchesPerPixel || inchesPerPixel <= 0) return `${pixelArea.toFixed(0)} sq px`
  const sqFt = pixelAreaToSquareFeet(pixelArea, inchesPerPixel)
  return formatArea(sqFt)
}

// ---------------------------------------------------------------------------
// 7. Page scale helpers
// ---------------------------------------------------------------------------

/** Look up calibration for a given page. Returns inchesPerPixel or null. */
export function getPageInchesPerPixel(pageScales: PageScale[], pageNumber: number): number | null {
  const ps = pageScales.find((s) => s.pageNumber === pageNumber)
  return ps ? ps.inchesPerPixel : null
}

/** Get the numeric real-world value for sorting — returns inches for distance, sq ft for area. */
export function getRealWorldValue(
  markup: { type: string; pixelDistance?: number; pixelArea?: number; pageNumber: number },
  pageScales: PageScale[],
): number {
  const ipp = getPageInchesPerPixel(pageScales, markup.pageNumber)
  if (markup.type === 'distance' && markup.pixelDistance != null) {
    return ipp ? pixelsToInches(markup.pixelDistance, ipp) : markup.pixelDistance
  }
  if (markup.type === 'area' && markup.pixelArea != null) {
    return ipp ? pixelAreaToSquareFeet(markup.pixelArea, ipp) : markup.pixelArea
  }
  return 0
}
