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
 * @param inchesPerPixel  Current page calibration (null = uncalibrated).
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
      const line = markup
      ctx.beginPath()
      ctx.moveTo(line.startPoint.x, line.startPoint.y)
      ctx.lineTo(line.endPoint.x, line.endPoint.y)
      ctx.stroke()
      break
    }

    case 'rectangle': {
      const rect = markup
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height)
      ctx.strokeRect(rect.x, rect.y, rect.width, rect.height)
      break
    }

    case 'ellipse': {
      const ell = markup
      ctx.beginPath()
      ctx.ellipse(ell.cx, ell.cy, ell.rx, ell.ry, ell.rotation || 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      break
    }

    case 'text': {
      const text = markup
      ctx.fillStyle = style.strokeColor
      ctx.font = `${style.fontSize}px ${style.fontFamily}`
      ctx.fillText(text.text, text.x, text.y, text.maxWidth)
      break
    }

    case 'polyline': {
      const poly = markup
      if (poly.points.length > 0) {
        ctx.beginPath()
        ctx.moveTo(poly.points[0].x, poly.points[0].y)
        for (let i = 1; i < poly.points.length; i++) {
          ctx.lineTo(poly.points[i].x, poly.points[i].y)
        }
        if (poly.closed) {
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

  // Selection highlight
  if (isSelected) {
    ctx.strokeStyle = '#00FF00'
    ctx.lineWidth = 1
    ctx.setLineDash([5, 5])
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

  // Main line
  ctx.beginPath()
  ctx.moveTo(dist.startPoint.x, dist.startPoint.y)
  ctx.lineTo(dist.endPoint.x, dist.endPoint.y)
  ctx.stroke()

  // Tick marks at endpoints
  const drawTick = (pt: Point) => {
    ctx.beginPath()
    ctx.moveTo(pt.x + Math.cos(perpAngle) * tickLen, pt.y + Math.sin(perpAngle) * tickLen)
    ctx.lineTo(pt.x - Math.cos(perpAngle) * tickLen, pt.y - Math.sin(perpAngle) * tickLen)
    ctx.stroke()
  }
  drawTick(dist.startPoint)
  drawTick(dist.endPoint)

  // Endpoint dots
  const dotR = 3 / scale
  ctx.fillStyle = style.strokeColor
  ctx.beginPath()
  ctx.arc(dist.startPoint.x, dist.startPoint.y, dotR, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(dist.endPoint.x, dist.endPoint.y, dotR, 0, Math.PI * 2)
  ctx.fill()

  // Label — computed at render time
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

  // Filled polygon
  ctx.beginPath()
  ctx.moveTo(area.points[0].x, area.points[0].y)
  for (let i = 1; i < area.points.length; i++) {
    ctx.lineTo(area.points[i].x, area.points[i].y)
  }
  ctx.closePath()
  ctx.fill()

  // Dashed outline
  ctx.setLineDash([6 / scale, 4 / scale])
  ctx.stroke()
  ctx.setLineDash([])

  // Vertex dots
  const vertR = 3 / scale
  ctx.fillStyle = style.strokeColor
  for (const pt of area.points) {
    ctx.beginPath()
    ctx.arc(pt.x, pt.y, vertR, 0, Math.PI * 2)
    ctx.fill()
  }

  // Label at area-weighted centroid — computed at render time
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
  const tm = ctx.measureText(label)
  const pad = 3 / scale
  const lh = fontSize * 1.2
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.fillRect(x - tm.width / 2 - pad, y - lh / 2 - pad, tm.width + pad * 2, lh + pad * 2)
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
      const r = markup
      ctx.strokeRect(r.x, r.y, r.width, r.height)
      break
    }
    case 'ellipse': {
      const e = markup
      ctx.beginPath()
      ctx.ellipse(e.cx, e.cy, e.rx, e.ry, e.rotation || 0, 0, Math.PI * 2)
      ctx.stroke()
      break
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
      const l = markup
      const minX = Math.min(l.startPoint.x, l.endPoint.x)
      const maxX = Math.max(l.startPoint.x, l.endPoint.x)
      const minY = Math.min(l.startPoint.y, l.endPoint.y)
      const maxY = Math.max(l.startPoint.y, l.endPoint.y)
      return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
    }
    case 'rectangle':
    case 'text': {
      const r = markup as any
      return { x: r.x, y: r.y, width: r.width || 0, height: r.fontSize || 20 }
    }
    case 'ellipse': {
      const e = markup
      return { x: e.cx - e.rx, y: e.cy - e.ry, width: e.rx * 2, height: e.ry * 2 }
    }
    case 'polyline': {
      const p = markup
      return pointsBounds(p.points)
    }
    case 'distance': {
      const d = markup
      const dMinX = Math.min(d.startPoint.x, d.endPoint.x)
      const dMaxX = Math.max(d.startPoint.x, d.endPoint.x)
      const dMinY = Math.min(d.startPoint.y, d.endPoint.y)
      const dMaxY = Math.max(d.startPoint.y, d.endPoint.y)
      return { x: dMinX, y: dMinY, width: dMaxX - dMinX, height: dMaxY - dMinY }
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
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

// ---------------------------------------------------------------------------
// Hit testing
// ---------------------------------------------------------------------------
export function isPointInMarkup(point: Point, markup: Markup, tolerance = 10): boolean {
  const b = getMarkupBounds(markup)
  return (
    point.x >= b.x - tolerance &&
    point.x <= b.x + b.width + tolerance &&
    point.y >= b.y - tolerance &&
    point.y <= b.y + b.height + tolerance
  )
}

// ---------------------------------------------------------------------------
// ID generation — use crypto.randomUUID() for database compatibility
// ---------------------------------------------------------------------------
export function generateMarkupId(): string {
  // Use a proper UUID v4 so IDs are valid in the database from the start
  return crypto.randomUUID()
}
