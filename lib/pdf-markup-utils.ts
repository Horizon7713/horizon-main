// ============================================================================
// Markup Rendering & Hit-Testing Utilities
// Measurements are formatted at render time via inchesPerPixel — never stored.
// ============================================================================

import { Markup, MarkupStyle, Point } from './pdf-viewer-types'
import { getDistanceLabel, getAreaLabel, getPolygonCentroid } from './pdf-measurement-utils'

// ---------------------------------------------------------------------------
// Public render entry point
// ---------------------------------------------------------------------------

/**
 * Draw a single markup to the canvas.
 * The caller is expected to have *not* applied ctx.scale/translate —
 * this function applies `ctx.translate(panX, panY); ctx.scale(scale, scale);`
 * internally so all markup coordinates are in PDF space.
 *
 * @param inchesPerPixel Current page calibration (null = uncalibrated).
 */
export function drawMarkup(
  ctx: CanvasRenderingContext2D,
  markup: Markup,
  scale: number,
  panX: number,
  panY: number,
  isSelected: boolean,
  inchesPerPixel: number | null = null,
) {
  ctx.save()
  ctx.translate(panX, panY)
  ctx.scale(scale, scale)

  const style = markup.style
  ctx.strokeStyle = style.strokeColor
  ctx.lineWidth = style.strokeWidth
  ctx.globalAlpha = style.opacity
  ctx.fillStyle = style.fillColor || 'transparent'

  switch (markup.type) {
    case 'line': {
      ctx.beginPath()
      ctx.moveTo(markup.startPoint.x, markup.startPoint.y)
      ctx.lineTo(markup.endPoint.x, markup.endPoint.y)
      ctx.stroke()
      break
    }

    case 'rectangle': {
      ctx.fillRect(markup.x, markup.y, markup.width, markup.height)
      ctx.strokeRect(markup.x, markup.y, markup.width, markup.height)
      break
    }

    case 'ellipse': {
      ctx.beginPath()
      ctx.ellipse(markup.cx, markup.cy, markup.rx, markup.ry, markup.rotation || 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      break
    }

    case 'text': {
      const fontSize = markup.style.fontSize || 14
      const fontFamily = markup.style.fontFamily || 'Arial'
      ctx.fillStyle = style.strokeColor
      ctx.font = `${fontSize}px ${fontFamily}`
      ctx.fillText(markup.text, markup.x, markup.y, markup.maxWidth)
      break
    }

    case 'polyline': {
      if (markup.points.length > 0) {
        ctx.beginPath()
        ctx.moveTo(markup.points[0].x, markup.points[0].y)
        for (let i = 1; i < markup.points.length; i++) {
          ctx.lineTo(markup.points[i].x, markup.points[i].y)
        }
        if (markup.closed) {
          ctx.closePath()
          ctx.fill()
        }
        ctx.stroke()
      }
      break
    }

    case 'distance': {
      drawDistanceMarkup(ctx, markup, scale, style, inchesPerPixel)
      break
    }

    case 'area': {
      drawAreaMarkup(ctx, markup, scale, style, inchesPerPixel)
      break
    }
  }

  if (isSelected) {
    ctx.strokeStyle = '#00FF00'
    ctx.lineWidth = 1 / scale
    ctx.setLineDash([5 / scale, 5 / scale])
    drawSelectionBounds(ctx, markup)
    ctx.setLineDash([])
  }

  ctx.restore()
}

// ---------------------------------------------------------------------------
// Distance rendering
// ---------------------------------------------------------------------------

function drawDistanceMarkup(
  ctx: CanvasRenderingContext2D,
  dist: Extract<Markup, { type: 'distance' }>,
  scale: number,
  style: MarkupStyle,
  inchesPerPixel: number | null,
) {
  const dx = dist.endPoint.x - dist.startPoint.x
  const dy = dist.endPoint.y - dist.startPoint.y
  const angle = Math.atan2(dy, dx)
  const perpAngle = angle + Math.PI / 2
  const tickLen = 8 / scale

  ctx.beginPath()
  ctx.moveTo(dist.startPoint.x, dist.startPoint.y)
  ctx.lineTo(dist.endPoint.x, dist.endPoint.y)
  ctx.stroke()

  const drawTick = (pt: Point) => {
    ctx.beginPath()
    ctx.moveTo(pt.x + Math.cos(perpAngle) * tickLen, pt.y + Math.sin(perpAngle) * tickLen)
    ctx.lineTo(pt.x - Math.cos(perpAngle) * tickLen, pt.y - Math.sin(perpAngle) * tickLen)
    ctx.stroke()
  }

  drawTick(dist.startPoint)
  drawTick(dist.endPoint)

  const dotRadius = 3 / scale
  ctx.fillStyle = style.strokeColor

  ctx.beginPath()
  ctx.arc(dist.startPoint.x, dist.startPoint.y, dotRadius, 0, Math.PI * 2)
  ctx.fill()

  ctx.beginPath()
  ctx.arc(dist.endPoint.x, dist.endPoint.y, dotRadius, 0, Math.PI * 2)
  ctx.fill()

  const midX = (dist.startPoint.x + dist.endPoint.x) / 2
  const midY = (dist.startPoint.y + dist.endPoint.y) / 2
  const fontSize = (style.fontSize || 14) / scale
  ctx.font = `bold ${fontSize}px ${style.fontFamily || 'Arial'}`

  const label = getDistanceLabel(dist.pixelDistance, inchesPerPixel)
  renderLabelPill(ctx, label, midX, midY, fontSize, scale, style.strokeColor)
}

// ---------------------------------------------------------------------------
// Area rendering
// ---------------------------------------------------------------------------

function drawAreaMarkup(
  ctx: CanvasRenderingContext2D,
  area: Extract<Markup, { type: 'area' }>,
  scale: number,
  style: MarkupStyle,
  inchesPerPixel: number | null,
) {
  if (area.points.length === 0) return

  ctx.beginPath()
  ctx.moveTo(area.points[0].x, area.points[0].y)
  for (let i = 1; i < area.points.length; i++) {
    ctx.lineTo(area.points[i].x, area.points[i].y)
  }
  ctx.closePath()
  ctx.fill()

  ctx.setLineDash([6 / scale, 4 / scale])
  ctx.stroke()
  ctx.setLineDash([])

  const vertexRadius = 3 / scale
  ctx.fillStyle = style.strokeColor
  for (const pt of area.points) {
    ctx.beginPath()
    ctx.arc(pt.x, pt.y, vertexRadius, 0, Math.PI * 2)
    ctx.fill()
  }

  const centroid = getPolygonCentroid(area.points)
  const fontSize = (style.fontSize || 14) / scale
  ctx.font = `bold ${fontSize}px ${style.fontFamily || 'Arial'}`
  const label = getAreaLabel(area.pixelArea, inchesPerPixel)

  renderLabelPill(ctx, label, centroid.x, centroid.y, fontSize, scale, style.strokeColor)
}

// ---------------------------------------------------------------------------
// Shared label pill
// ---------------------------------------------------------------------------

function renderLabelPill(
  ctx: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
  fontSize: number,
  scale: number,
  textColor: string,
) {
  const metrics = ctx.measureText(label)
  const pad = 3 / scale
  const lineHeight = fontSize * 1.2

  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.fillRect(
    x - metrics.width / 2 - pad,
    y - lineHeight / 2 - pad,
    metrics.width + pad * 2,
    lineHeight + pad * 2,
  )

  ctx.fillStyle = textColor
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, x, y)
  ctx.textAlign = 'start'
  ctx.textBaseline = 'alphabetic'
}

// ---------------------------------------------------------------------------
// Selection bounds
// ---------------------------------------------------------------------------

function drawSelectionBounds(ctx: CanvasRenderingContext2D, markup: Markup) {
  switch (markup.type) {
    case 'rectangle': {
      ctx.strokeRect(markup.x, markup.y, markup.width, markup.height)
      return
    }

    case 'ellipse': {
      ctx.beginPath()
      ctx.ellipse(markup.cx, markup.cy, markup.rx, markup.ry, markup.rotation || 0, 0, Math.PI * 2)
      ctx.stroke()
      return
    }

    default: {
      const bounds = getMarkupBounds(markup)
      ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height)
    }
  }
}

// ---------------------------------------------------------------------------
// Bounding box
// ---------------------------------------------------------------------------

export function getMarkupBounds(markup: Markup): { x: number; y: number; width: number; height: number } {
  switch (markup.type) {
    case 'line': {
      const minX = Math.min(markup.startPoint.x, markup.endPoint.x)
      const maxX = Math.max(markup.startPoint.x, markup.endPoint.x)
      const minY = Math.min(markup.startPoint.y, markup.endPoint.y)
      const maxY = Math.max(markup.startPoint.y, markup.endPoint.y)
      return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
    }

    case 'rectangle': {
      const x = Math.min(markup.x, markup.x + markup.width)
      const y = Math.min(markup.y, markup.y + markup.height)
      const width = Math.abs(markup.width)
      const height = Math.abs(markup.height)
      return { x, y, width, height }
    }

    case 'text': {
      const width = markup.maxWidth || estimateTextWidth(markup.text, markup.style.fontSize || 14)
      const height = markup.style.fontSize || 14
      return { x: markup.x, y: markup.y - height, width, height }
    }

    case 'ellipse': {
      return {
        x: markup.cx - markup.rx,
        y: markup.cy - markup.ry,
        width: markup.rx * 2,
        height: markup.ry * 2,
      }
    }

    case 'polyline': {
      return pointsBounds(markup.points)
    }

    case 'distance': {
      const minX = Math.min(markup.startPoint.x, markup.endPoint.x)
      const maxX = Math.max(markup.startPoint.x, markup.endPoint.x)
      const minY = Math.min(markup.startPoint.y, markup.endPoint.y)
      const maxY = Math.max(markup.startPoint.y, markup.endPoint.y)
      return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
    }

    case 'area': {
      return pointsBounds(markup.points)
    }

    default:
      return { x: 0, y: 0, width: 0, height: 0 }
  }
}

function pointsBounds(points: Point[]): { x: number; y: number; width: number; height: number } {
  if (points.length === 0) return { x: 0, y: 0, width: 0, height: 0 }

  let minX = points[0].x
  let maxX = points[0].x
  let minY = points[0].y
  let maxY = points[0].y

  for (let i = 1; i < points.length; i++) {
    minX = Math.min(minX, points[i].x)
    maxX = Math.max(maxX, points[i].x)
    minY = Math.min(minY, points[i].y)
    maxY = Math.max(maxY, points[i].y)
  }

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

// ---------------------------------------------------------------------------
// Hit testing
// ---------------------------------------------------------------------------

export function isPointInMarkup(point: Point, markup: Markup, tolerance = 10): boolean {
  switch (markup.type) {
    case 'line':
      return isPointNearSegment(point, markup.startPoint, markup.endPoint, tolerance)

    case 'distance':
      return isPointNearSegment(point, markup.startPoint, markup.endPoint, tolerance)

    case 'rectangle':
      return isPointNearRectangle(point, markup.x, markup.y, markup.width, markup.height, tolerance)

    case 'ellipse':
      return isPointNearEllipse(point, markup.cx, markup.cy, markup.rx, markup.ry, tolerance)

    case 'text': {
      const bounds = getMarkupBounds(markup)
      return isPointInBounds(point, expandBounds(bounds, tolerance))
    }

    case 'polyline':
      return isPointInPolyline(point, markup.points, tolerance, !!markup.closed)

    case 'area':
      return isPointInPolygon(point, markup.points) || isPointNearPolygonEdges(point, markup.points, tolerance)

    default: {
      const bounds = getMarkupBounds(markup)
      return isPointInBounds(point, expandBounds(bounds, tolerance))
    }
  }
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

function isPointInBounds(
  point: Point,
  bounds: { x: number; y: number; width: number; height: number },
): boolean {
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  )
}

function expandBounds(
  bounds: { x: number; y: number; width: number; height: number },
  amount: number,
): { x: number; y: number; width: number; height: number } {
  return {
    x: bounds.x - amount,
    y: bounds.y - amount,
    width: bounds.width + amount * 2,
    height: bounds.height + amount * 2,
  }
}

function isPointNearSegment(point: Point, start: Point, end: Point, tolerance: number): boolean {
  const lengthSq = squaredDistance(start, end)
  if (lengthSq === 0) return calculateDistance(point, start) <= tolerance

  const t =
    ((point.x - start.x) * (end.x - start.x) + (point.y - start.y) * (end.y - start.y)) / lengthSq

  const clampedT = Math.max(0, Math.min(1, t))
  const projection = {
    x: start.x + clampedT * (end.x - start.x),
    y: start.y + clampedT * (end.y - start.y),
  }

  return calculateDistance(point, projection) <= tolerance
}

function isPointNearRectangle(
  point: Point,
  x: number,
  y: number,
  width: number,
  height: number,
  tolerance: number,
): boolean {
  const left = Math.min(x, x + width)
  const right = Math.max(x, x + width)
  const top = Math.min(y, y + height)
  const bottom = Math.max(y, y + height)

  const insideExpanded =
    point.x >= left - tolerance &&
    point.x <= right + tolerance &&
    point.y >= top - tolerance &&
    point.y <= bottom + tolerance

  if (!insideExpanded) return false

  const insideCore =
    point.x >= left + tolerance &&
    point.x <= right - tolerance &&
    point.y >= top + tolerance &&
    point.y <= bottom - tolerance

  return !insideCore || (right - left <= tolerance * 2 || bottom - top <= tolerance * 2)
}

function isPointNearEllipse(
  point: Point,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  tolerance: number,
): boolean {
  if (rx <= 0 || ry <= 0) return false

  const outer =
    ((point.x - cx) * (point.x - cx)) / ((rx + tolerance) * (rx + tolerance)) +
      ((point.y - cy) * (point.y - cy)) / ((ry + tolerance) * (ry + tolerance)) <=
    1

  if (!outer) return false

  const innerRx = Math.max(rx - tolerance, 0.0001)
  const innerRy = Math.max(ry - tolerance, 0.0001)

  const inner =
    ((point.x - cx) * (point.x - cx)) / (innerRx * innerRx) +
      ((point.y - cy) * (point.y - cy)) / (innerRy * innerRy) <=
    1

  return !inner
}

function isPointInPolyline(point: Point, points: Point[], tolerance: number, closed: boolean): boolean {
  if (points.length === 0) return false
  if (points.length === 1) return calculateDistance(point, points[0]) <= tolerance

  for (let i = 0; i < points.length - 1; i++) {
    if (isPointNearSegment(point, points[i], points[i + 1], tolerance)) {
      return true
    }
  }

  if (closed && points.length > 2) {
    return isPointNearSegment(point, points[points.length - 1], points[0], tolerance)
  }

  return false
}

function isPointNearPolygonEdges(point: Point, points: Point[], tolerance: number): boolean {
  if (points.length < 2) return false

  for (let i = 0; i < points.length; i++) {
    const start = points[i]
    const end = points[(i + 1) % points.length]
    if (isPointNearSegment(point, start, end, tolerance)) {
      return true
    }
  }

  return false
}

function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  if (polygon.length < 3) return false

  let inside = false

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x
    const yi = polygon[i].y
    const xj = polygon[j].x
    const yj = polygon[j].y

    const intersects =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / ((yj - yi) || Number.EPSILON) + xi

    if (intersects) {
      inside = !inside
    }
  }

  return inside
}

function squaredDistance(a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  return dx * dx + dy * dy
}

function calculateDistance(a: Point, b: Point): number {
  return Math.sqrt(squaredDistance(a, b))
}

function estimateTextWidth(text: string, fontSize: number): number {
  return text.length * fontSize * 0.6
}

// ---------------------------------------------------------------------------
// ID generation — use crypto.randomUUID() for database compatibility
// ---------------------------------------------------------------------------

export function generateMarkupId(): string {
  return crypto.randomUUID()
}
