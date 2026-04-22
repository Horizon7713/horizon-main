// ============================================================================
// Markup Rendering & Hit-Testing Utilities
// Compatible with current PdfMarkup types from pdf-viewer-types.ts
// ============================================================================

import type {
  PdfMarkup,
  MarkupStyle,
  Point,
  Rect,
  RectangleMarkup,
  EllipseMarkup,
  LineMarkup,
  CountMarkup,
  TextMarkup,
} from "./pdf-viewer-types"

// ---------------------------------------------------------------------------
// Public render entry point
// ---------------------------------------------------------------------------

export function drawMarkup(
  ctx: CanvasRenderingContext2D,
  markup: PdfMarkup,
  scale: number,
  panX: number,
  panY: number,
  isSelected: boolean,
  _inchesPerPixel: number | null = null,
) {
  ctx.save()
  ctx.translate(panX, panY)
  ctx.scale(scale, scale)

  applyStyle(ctx, markup.style)

  switch (markup.type) {
    case "rectangle":
    case "highlight":
    case "takeoff_item":
    case "measure-area":
      drawRectangleMarkup(ctx, markup)
      break

    case "ellipse":
    case "cloud":
      drawEllipseMarkup(ctx, markup)
      break

    case "line":
    case "arrow":
    case "measure-length":
    case "calibrate":
      drawLineMarkup(ctx, markup)
      break

    case "measure-count":
      drawCountMarkup(ctx, markup)
      break

    case "text":
    case "callout":
    case "stamp":
      drawTextMarkup(ctx, markup)
      break

    default:
      exhaustiveCheck(markup)
  }

  if (isSelected) {
    drawSelectionBounds(ctx, markup, scale)
  }

  ctx.restore()
}

// ---------------------------------------------------------------------------
// Styling
// ---------------------------------------------------------------------------

function applyStyle(ctx: CanvasRenderingContext2D, style: MarkupStyle) {
  ctx.strokeStyle = style.strokeColor
  ctx.fillStyle = style.fillColor ?? "transparent"
  ctx.lineWidth = style.strokeWidth
  ctx.globalAlpha = style.opacity

  if (style.dashArray?.length) {
    ctx.setLineDash(style.dashArray)
  } else {
    ctx.setLineDash([])
  }
}

// ---------------------------------------------------------------------------
// Rectangle / Area
// ---------------------------------------------------------------------------

function drawRectangleMarkup(
  ctx: CanvasRenderingContext2D,
  markup: RectangleMarkup,
) {
  const { x, y, width, height } = normalizeRect(markup.bounds)

  ctx.fillRect(x, y, width, height)
  ctx.strokeRect(x, y, width, height)

  if (markup.type === "measure-area") {
    const label = formatMeasurement(
      markup.measurementValue,
      markup.measurementUnit,
      "area",
    )

    if (label) {
      const fontSize = markup.style.fontSize ?? 14
      renderLabelPill(
        ctx,
        label,
        x + width / 2,
        y + height / 2,
        fontSize,
        markup.style.strokeColor,
      )
    }
  }
}

// ---------------------------------------------------------------------------
// Ellipse
// ---------------------------------------------------------------------------

function drawEllipseMarkup(
  ctx: CanvasRenderingContext2D,
  markup: EllipseMarkup,
) {
  const { x, y, width, height } = normalizeRect(markup.bounds)
  const cx = x + width / 2
  const cy = y + height / 2
  const rx = width / 2
  const ry = height / 2

  ctx.beginPath()
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
}

// ---------------------------------------------------------------------------
// Line / Arrow / Distance
// ---------------------------------------------------------------------------

function drawLineMarkup(
  ctx: CanvasRenderingContext2D,
  markup: LineMarkup,
) {
  ctx.beginPath()
  ctx.moveTo(markup.start.x, markup.start.y)
  ctx.lineTo(markup.end.x, markup.end.y)
  ctx.stroke()

  if (markup.type === "arrow") {
    drawArrowHead(ctx, markup.start, markup.end)
  }

  if (markup.type === "measure-length" || markup.type === "calibrate") {
    drawMeasurementEndpoints(ctx, markup)

    const label = formatMeasurement(
      markup.measurementValue,
      markup.measurementUnit,
      "length",
    )

    if (label) {
      const fontSize = markup.style.fontSize ?? 14
      const midX = (markup.start.x + markup.end.x) / 2
      const midY = (markup.start.y + markup.end.y) / 2

      renderLabelPill(
        ctx,
        label,
        midX,
        midY,
        fontSize,
        markup.style.strokeColor,
      )
    }
  }
}

function drawArrowHead(
  ctx: CanvasRenderingContext2D,
  start: Point,
  end: Point,
) {
  const headLength = 10
  const angle = Math.atan2(end.y - start.y, end.x - start.x)

  ctx.beginPath()
  ctx.moveTo(end.x, end.y)
  ctx.lineTo(
    end.x - headLength * Math.cos(angle - Math.PI / 6),
    end.y - headLength * Math.sin(angle - Math.PI / 6),
  )
  ctx.moveTo(end.x, end.y)
  ctx.lineTo(
    end.x - headLength * Math.cos(angle + Math.PI / 6),
    end.y - headLength * Math.sin(angle + Math.PI / 6),
  )
  ctx.stroke()
}

function drawMeasurementEndpoints(
  ctx: CanvasRenderingContext2D,
  markup: LineMarkup,
) {
  const radius = 3

  ctx.save()
  ctx.fillStyle = markup.style.strokeColor

  ctx.beginPath()
  ctx.arc(markup.start.x, markup.start.y, radius, 0, Math.PI * 2)
  ctx.fill()

  ctx.beginPath()
  ctx.arc(markup.end.x, markup.end.y, radius, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

// ---------------------------------------------------------------------------
// Count
// ---------------------------------------------------------------------------

function drawCountMarkup(
  ctx: CanvasRenderingContext2D,
  markup: CountMarkup,
) {
  const radius = 8

  ctx.beginPath()
  ctx.arc(markup.point.x, markup.point.y, radius, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  const label = String(markup.countValue)
  const fontSize = markup.style.fontSize ?? 12

  ctx.save()
  ctx.fillStyle = markup.style.textColor ?? "#ffffff"
  ctx.font = `bold ${fontSize}px Arial`
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(label, markup.point.x, markup.point.y)
  ctx.restore()
}

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

function drawTextMarkup(
  ctx: CanvasRenderingContext2D,
  markup: TextMarkup,
) {
  const { x, y, width, height } = normalizeRect(markup.bounds)
  const fontSize = markup.style.fontSize ?? 14

  ctx.save()
  ctx.fillStyle = markup.style.textColor ?? markup.style.strokeColor
  ctx.font = `${fontSize}px Arial`
  ctx.textAlign = "left"
  ctx.textBaseline = "top"

  const lines = wrapText(ctx, markup.text, width)
  const lineHeight = fontSize * 1.2

  for (let i = 0; i < lines.length; i++) {
    const lineY = y + i * lineHeight
    if (lineY > y + height) break
    ctx.fillText(lines[i], x, lineY)
  }

  ctx.restore()
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
  textColor: string,
) {
  ctx.save()
  ctx.font = `bold ${fontSize}px Arial`

  const metrics = ctx.measureText(label)
  const padX = 6
  const padY = 4
  const width = metrics.width + padX * 2
  const height = fontSize * 1.2 + padY * 2

  ctx.fillStyle = "rgba(255,255,255,0.9)"
  ctx.fillRect(x - width / 2, y - height / 2, width, height)

  ctx.fillStyle = textColor
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(label, x, y)

  ctx.restore()
}

// ---------------------------------------------------------------------------
// Selection bounds
// ---------------------------------------------------------------------------

function drawSelectionBounds(
  ctx: CanvasRenderingContext2D,
  markup: PdfMarkup,
  scale: number,
) {
  const bounds = getMarkupBounds(markup)

  ctx.save()
  ctx.strokeStyle = "#00FF00"
  ctx.lineWidth = 1 / scale
  ctx.setLineDash([5 / scale, 5 / scale])
  ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height)
  ctx.restore()
}

// ---------------------------------------------------------------------------
// Bounding box
// ---------------------------------------------------------------------------

export function getMarkupBounds(
  markup: PdfMarkup,
): { x: number; y: number; width: number; height: number } {
  switch (markup.type) {
    case "rectangle":
    case "highlight":
    case "takeoff_item":
    case "measure-area":
    case "ellipse":
    case "cloud":
    case "text":
    case "callout":
    case "stamp":
      return normalizeRect(markup.bounds)

    case "line":
    case "arrow":
    case "measure-length":
    case "calibrate": {
      const minX = Math.min(markup.start.x, markup.end.x)
      const maxX = Math.max(markup.start.x, markup.end.x)
      const minY = Math.min(markup.start.y, markup.end.y)
      const maxY = Math.max(markup.start.y, markup.end.y)
      return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
    }

    case "measure-count":
      return {
        x: markup.point.x - 8,
        y: markup.point.y - 8,
        width: 16,
        height: 16,
      }

    default:
      return exhaustiveCheck(markup)
  }
}

// ---------------------------------------------------------------------------
// Hit testing
// ---------------------------------------------------------------------------

export function isPointInMarkup(
  point: Point,
  markup: PdfMarkup,
  tolerance = 10,
): boolean {
  switch (markup.type) {
    case "line":
    case "arrow":
    case "measure-length":
    case "calibrate":
      return isPointNearSegment(point, markup.start, markup.end, tolerance)

    case "rectangle":
    case "highlight":
    case "takeoff_item":
    case "measure-area": {
      const { x, y, width, height } = normalizeRect(markup.bounds)
      return isPointNearRectangle(point, x, y, width, height, tolerance)
    }

    case "ellipse":
    case "cloud": {
      const { x, y, width, height } = normalizeRect(markup.bounds)
      return isPointNearEllipse(
        point,
        x + width / 2,
        y + height / 2,
        width / 2,
        height / 2,
        tolerance,
      )
    }

    case "text":
    case "callout":
    case "stamp": {
      const bounds = getMarkupBounds(markup)
      return isPointInBounds(point, expandBounds(bounds, tolerance))
    }

    case "measure-count": {
      const bounds = getMarkupBounds(markup)
      return isPointInBounds(point, expandBounds(bounds, tolerance))
    }

    default: {
      const bounds = getMarkupBounds(markup)
      return isPointInBounds(point, expandBounds(bounds, tolerance))
    }
  }
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

function normalizeRect(bounds: Rect): Rect {
  const x = Math.min(bounds.x, bounds.x + bounds.width)
  const y = Math.min(bounds.y, bounds.y + bounds.height)
  const width = Math.abs(bounds.width)
  const height = Math.abs(bounds.height)

  return { x, y, width, height }
}

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

function isPointNearSegment(
  point: Point,
  start: Point,
  end: Point,
  tolerance: number,
): boolean {
  const lengthSq = squaredDistance(start, end)
  if (lengthSq === 0) return calculateDistance(point, start) <= tolerance

  const t =
    ((point.x - start.x) * (end.x - start.x) +
      (point.y - start.y) * (end.y - start.y)) /
    lengthSq

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

  return !insideCore || right - left <= tolerance * 2 || bottom - top <= tolerance * 2
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

function squaredDistance(a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  return dx * dx + dy * dy
}

function calculateDistance(a: Point, b: Point): number {
  return Math.sqrt(squaredDistance(a, b))
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  if (!text) return [""]

  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ""

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (ctx.measureText(candidate).width <= maxWidth || !current) {
      current = candidate
    } else {
      lines.push(current)
      current = word
    }
  }

  if (current) lines.push(current)
  return lines
}

function formatMeasurement(
  value?: number,
  unit?: string,
  kind?: "length" | "area",
): string | null {
  if (value == null) return null
  if (unit) return `${value} ${unit}`
  if (kind === "area") return `${value}`
  return `${value}`
}

function exhaustiveCheck(x: never): never {
  throw new Error(`Unhandled markup type: ${JSON.stringify(x)}`)
}

// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------

export function generateMarkupId(): string {
  return crypto.randomUUID()
}
