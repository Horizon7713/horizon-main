'use client'

// ============================================================================
// PDFCanvasViewer — Production Measurement System
//
// Tool state machine: idle | select | drawing-distance | drawing-area | calibrating | editing
// All geometry stored in PDF space. Labels computed at render time.
// ============================================================================

import React, { useRef, useEffect, useState, useCallback } from 'react'
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import { drawMarkup, generateMarkupId, isPointInMarkup } from '@/lib/pdf-markup-utils'
import {
  calculateDistance,
  calculatePolygonArea,
  getDistanceLabel,
  getAreaLabel,
  getPolygonCentroid,
  screenToPdf,
  pdfToScreen,
} from '@/lib/pdf-measurement-utils'
import {
  Markup,
  MarkupType,
  Point,
  DistanceMarkup,
  AreaMarkup,
  DEFAULT_STYLE,
  PageScale,
} from '@/lib/pdf-viewer-types'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================================
// PDF.js worker
// ============================================================================
if (typeof window !== 'undefined') {
  GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@5.4.624/build/pdf.worker.min.mjs`
}

// ============================================================================
// Types
// ============================================================================
type ToolMode = 'idle' | 'select' | 'drawing-distance' | 'drawing-area' | 'calibrating' | 'editing'

/** Identifies which handle of which markup is being dragged */
interface DragHandle {
  markupId: string
  /** For distance: 'start' | 'end'. For area: vertex index. */
  handle: 'start' | 'end' | number
}

interface DrawingState {
  mode: ToolMode
  points: Point[]
  currentMouse: Point | null
}

interface EditingState {
  dragHandle: DragHandle
  /** Original markup before drag started (for cancellation) */
  originalMarkup: Markup
}

const INITIAL_DRAWING: DrawingState = { mode: 'idle', points: [], currentMouse: null }
const HANDLE_RADIUS = 6 // Screen pixels — hit radius for drag handles

// ============================================================================
// Props
// ============================================================================
interface PDFCanvasViewerProps {
  pdfUrl: string
  markups: Markup[]
  onMarkupsChange: (markups: Markup[]) => void
  activeTool: MarkupType | null
  selectedMarkupId: string | null
  onMarkupSelect: (id: string | null) => void
  zoom: number
  onZoomChange: (zoom: number) => void
  pageScales?: PageScale[]
  onCalibrate?: (pixelDistance: number) => void
}

// ============================================================================
// Component
// ============================================================================

function PDFCanvasViewerComponent(props: PDFCanvasViewerProps) {
  const {
    pdfUrl,
    markups,
    onMarkupsChange,
    activeTool,
    selectedMarkupId,
    onMarkupSelect,
    zoom,
    onZoomChange,
    pageScales = [],
    onCalibrate,
  } = props

  const canvasRef = useRef<HTMLCanvasElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pdf, setPdf] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Drawing state (distance/area/calibrate creation)
  const [drawing, setDrawing] = useState<DrawingState>(INITIAL_DRAWING)

  // Editing state (drag handles)
  const [editing, setEditing] = useState<EditingState | null>(null)

  // Derived
  const currentIpp = pageScales.find((s) => s.pageNumber === currentPage)?.inchesPerPixel ?? null

  // Reset drawing when tool changes
  useEffect(() => {
    setDrawing(INITIAL_DRAWING)
    setEditing(null)
  }, [activeTool])

  // ------------------------------------------------------------------
  // Coordinate helpers
  // ------------------------------------------------------------------
  const getCanvasPoint = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>): Point => {
      const rect = canvasRef.current!.getBoundingClientRect()
      return screenToPdf(e.clientX - rect.left, e.clientY - rect.top, zoom)
    },
    [zoom],
  )

  const toolMode = ((): ToolMode => {
    if (editing) return 'editing'
    if (!activeTool || activeTool === 'select') return 'select'
    if (activeTool === 'distance') return 'drawing-distance'
    if (activeTool === 'area') return 'drawing-area'
    if (activeTool === 'calibrate') return 'calibrating'
    return 'idle'
  })()

  // ------------------------------------------------------------------
  // Handle hit-testing — returns which handle (if any) is under point
  // ------------------------------------------------------------------
  const hitTestHandles = useCallback(
    (pt: Point): DragHandle | null => {
      if (!selectedMarkupId) return null
      const markup = markups.find((m) => m.id === selectedMarkupId && m.pageNumber === currentPage)
      if (!markup) return null
      const hitR = HANDLE_RADIUS / zoom // Convert screen radius to PDF space

      if (markup.type === 'distance') {
        const d = markup as DistanceMarkup
        if (calculateDistance(pt, d.startPoint) <= hitR) return { markupId: d.id, handle: 'start' }
        if (calculateDistance(pt, d.endPoint) <= hitR) return { markupId: d.id, handle: 'end' }
      }

      if (markup.type === 'area') {
        const a = markup as AreaMarkup
        for (let i = 0; i < a.points.length; i++) {
          if (calculateDistance(pt, a.points[i]) <= hitR) return { markupId: a.id, handle: i }
        }
      }

      return null
    },
    [selectedMarkupId, markups, currentPage, zoom],
  )

  // ------------------------------------------------------------------
  // Mouse handlers
  // ------------------------------------------------------------------
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (toolMode !== 'select') return
      const pt = getCanvasPoint(e)

      // Check if clicking a drag handle on the selected markup
      const handle = hitTestHandles(pt)
      if (handle) {
        e.preventDefault()
        const original = markups.find((m) => m.id === handle.markupId)!
        setEditing({ dragHandle: handle, originalMarkup: JSON.parse(JSON.stringify(original)) })
        return
      }
    },
    [toolMode, getCanvasPoint, hitTestHandles, markups],
  )

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      // Don't fire click if we just finished an edit drag
      if (editing) return
      const pt = getCanvasPoint(e)

      // --- Select ---
      if (toolMode === 'select') {
        const hit = [...markups]
          .reverse()
          .find((m) => m.pageNumber === currentPage && isPointInMarkup(pt, m, 10 / zoom))
        onMarkupSelect(hit?.id ?? null)
        return
      }

      // --- Distance / Calibrate (two-click) ---
      if (toolMode === 'drawing-distance' || toolMode === 'calibrating') {
        if (drawing.points.length === 0) {
          setDrawing({ mode: toolMode, points: [pt], currentMouse: pt })
        } else {
          const startPt = drawing.points[0]
          const pixDist = calculateDistance(startPt, pt)
          if (toolMode === 'calibrating') {
            onCalibrate?.(pixDist)
          } else {
            const newMarkup: DistanceMarkup = {
              id: generateMarkupId(),
              type: 'distance',
              pageNumber: currentPage,
              style: { ...DEFAULT_STYLE, strokeColor: '#2563EB', strokeWidth: 2 },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              userId: '',
              author: '',
              startPoint: startPt,
              endPoint: pt,
              pixelDistance: pixDist,
            }
            onMarkupsChange([...markups, newMarkup])
          }
          setDrawing(INITIAL_DRAWING)
        }
        return
      }

      // --- Area (multi-click) ---
      if (toolMode === 'drawing-area') {
        setDrawing((prev) => ({
          mode: 'drawing-area',
          points: [...prev.points, pt],
          currentMouse: pt,
        }))
        return
      }
    },
    [editing, toolMode, drawing, markups, currentPage, zoom, getCanvasPoint, onMarkupsChange, onMarkupSelect, onCalibrate],
  )

  const handleCanvasDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (toolMode !== 'drawing-area' || drawing.points.length < 3) return
      e.preventDefault()
      const pts = drawing.points
      const pixArea = calculatePolygonArea(pts)
      const newMarkup: AreaMarkup = {
        id: generateMarkupId(),
        type: 'area',
        pageNumber: currentPage,
        style: { ...DEFAULT_STYLE, strokeColor: '#16A34A', fillColor: 'rgba(22,163,74,0.12)', strokeWidth: 2 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: '',
        author: '',
        points: pts,
        pixelArea: pixArea,
      }
      onMarkupsChange([...markups, newMarkup])
      setDrawing(INITIAL_DRAWING)
    },
    [toolMode, drawing, markups, currentPage, onMarkupsChange],
  )

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const pt = getCanvasPoint(e)

      // --- Editing drag ---
      if (editing) {
        const { dragHandle } = editing
        const updated = markups.map((m) => {
          if (m.id !== dragHandle.markupId) return m

          if (m.type === 'distance') {
            const d = { ...(m as DistanceMarkup) }
            if (dragHandle.handle === 'start') d.startPoint = pt
            else if (dragHandle.handle === 'end') d.endPoint = pt
            d.pixelDistance = calculateDistance(d.startPoint, d.endPoint)
            d.updatedAt = new Date().toISOString()
            return d
          }

          if (m.type === 'area') {
            const a = { ...(m as AreaMarkup) }
            const idx = dragHandle.handle as number
            a.points = [...a.points]
            a.points[idx] = pt
            a.pixelArea = calculatePolygonArea(a.points)
            a.updatedAt = new Date().toISOString()
            return a
          }

          return m
        })
        onMarkupsChange(updated)
        return
      }

      // --- Drawing preview ---
      if (drawing.points.length > 0) {
        setDrawing((prev) => ({ ...prev, currentMouse: pt }))
      }
    },
    [editing, drawing.points.length, getCanvasPoint, markups, onMarkupsChange],
  )

  const handleMouseUp = useCallback(
    () => {
      if (editing) {
        setEditing(null)
      }
    },
    [editing],
  )

  // Escape to cancel
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editing) {
          // Restore original markup
          const orig = editing.originalMarkup
          onMarkupsChange(markups.map((m) => (m.id === orig.id ? orig : m)))
          setEditing(null)
        } else {
          setDrawing(INITIAL_DRAWING)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editing, markups, onMarkupsChange])

  // ------------------------------------------------------------------
  // PDF Loading
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!pdfUrl) return
    let mounted = true
    setIsLoading(true)
    setError(null)

    ;(async () => {
      try {
        const resp = await fetch(pdfUrl, { headers: { Accept: 'application/pdf' } })
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
        const buf = await resp.arrayBuffer()
        const loaded = await getDocument({ data: new Uint8Array(buf), disableStream: true, disableRange: true, disableAutoFetch: true }).promise
        if (!mounted) return
        setPdf(loaded)
        setTotalPages(loaded.numPages)
        setCurrentPage(1)
      } catch (err) {
        console.error('[PDF] Load error:', err)
        if (mounted) setError('Failed to load PDF.')
      } finally {
        if (mounted) setIsLoading(false)
      }
    })()

    return () => { mounted = false }
  }, [pdfUrl])

  // ------------------------------------------------------------------
  // Render loop
  // ------------------------------------------------------------------
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderTaskRef = useRef<any>(null)

  useEffect(() => {
    if (!pdf || !canvasRef.current) return
    let cancelled = false

    const renderPage = async () => {
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel() } catch { /* noop */ }
        renderTaskRef.current = null
      }

      try {
        const page = await pdf.getPage(currentPage)
        if (cancelled) return
        const viewport = page.getViewport({ scale: zoom })
        const canvas = canvasRef.current
        if (!canvas || cancelled) return

        canvas.width = viewport.width
        canvas.height = viewport.height
        const ctx = canvas.getContext('2d')!
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        const task = page.render({ canvasContext: ctx, viewport })
        renderTaskRef.current = task
        await task.promise
        if (cancelled) return

        // --- Draw committed markups ---
        markups
          .filter((m) => m.pageNumber === currentPage)
          .forEach((m) => {
            drawMarkup(ctx, m, zoom, 0, 0, m.id === selectedMarkupId, currentIpp)
          })

        // --- Draw drag handles for selected markup ---
        const selected = markups.find((m) => m.id === selectedMarkupId && m.pageNumber === currentPage)
        if (selected && (toolMode === 'select' || toolMode === 'editing')) {
          drawDragHandles(ctx, selected, zoom)
        }

        // --- Live drawing preview ---
        if (drawing.points.length > 0 && drawing.currentMouse) {
          ctx.save()
          drawLivePreview(ctx, drawing, zoom, currentIpp)
          ctx.restore()
        }
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'name' in err && (err as { name: string }).name === 'RenderingCancelledException') return
        if (!cancelled) console.error('[PDF] Render error:', err)
      }
    }

    renderPage()

    return () => {
      cancelled = true
      if (renderTaskRef.current) {
        try { (renderTaskRef.current as { cancel: () => void }).cancel() } catch { /* noop */ }
      }
    }
  }, [pdf, currentPage, zoom, markups, selectedMarkupId, drawing, currentIpp, toolMode])

  // ------------------------------------------------------------------
  // Zoom
  // ------------------------------------------------------------------
  const handleZoom = (factor: number) => onZoomChange(Math.max(0.25, Math.min(3, zoom + factor)))

  // ------------------------------------------------------------------
  // Cursor — show grab cursor when hovering over a drag handle
  // ------------------------------------------------------------------
  const [cursorOverride, setCursorOverride] = useState<string | null>(null)

  const handleCursorCheck = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (toolMode !== 'select' && toolMode !== 'editing') {
        setCursorOverride(null)
        return
      }
      const pt = getCanvasPoint(e)
      const handle = hitTestHandles(pt)
      setCursorOverride(handle ? 'cursor-grab' : null)
    },
    [toolMode, getCanvasPoint, hitTestHandles],
  )

  const cursorClass = editing
    ? 'cursor-grabbing'
    : cursorOverride
      ? cursorOverride
      : toolMode === 'select'
        ? 'cursor-pointer'
        : 'cursor-crosshair'

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <div className="flex flex-col h-full bg-background">
      {pdf && (
        <div className="flex items-center justify-between p-2 border-b border-border">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage <= 1} title="Previous page">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm px-3 whitespace-nowrap">Page {currentPage} of {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage >= totalPages} title="Next page">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => handleZoom(-0.1)} title="Zoom out"><ZoomOut className="w-4 h-4" /></Button>
            <span className="text-sm px-2 w-12 text-center">{Math.round(zoom * 100)}%</span>
            <Button variant="outline" size="icon" onClick={() => handleZoom(0.1)} title="Zoom in"><ZoomIn className="w-4 h-4" /></Button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto bg-muted flex items-center justify-center">
        {isLoading ? (
          <p className="text-lg font-medium text-muted-foreground">Loading PDF...</p>
        ) : error ? (
          <p className="text-lg font-medium text-destructive">{error}</p>
        ) : !pdf ? (
          <p className="text-lg font-medium text-muted-foreground">Upload a plan to start marking it up.</p>
        ) : (
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onClick={handleCanvasClick}
            onDoubleClick={handleCanvasDoubleClick}
            onMouseMove={(e) => {
              handleCanvasMouseMove(e)
              handleCursorCheck(e)
            }}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className={cn(cursorClass)}
          />
        )}
      </div>
    </div>
  )
}

export const PDFCanvasViewer = React.memo(PDFCanvasViewerComponent)

// ============================================================================
// Draw drag handles on selected markup
// ============================================================================
function drawDragHandles(ctx: CanvasRenderingContext2D, markup: Markup, zoom: number) {
  const handles: Point[] = []

  if (markup.type === 'distance') {
    const d = markup as DistanceMarkup
    handles.push(d.startPoint, d.endPoint)
  } else if (markup.type === 'area') {
    const a = markup as AreaMarkup
    handles.push(...a.points)
  } else {
    return // Only distance & area have editable handles for now
  }

  for (const pt of handles) {
    const sx = pt.x * zoom
    const sy = pt.y * zoom

    // White circle outline
    ctx.beginPath()
    ctx.arc(sx, sy, HANDLE_RADIUS, 0, Math.PI * 2)
    ctx.fillStyle = 'white'
    ctx.fill()
    ctx.strokeStyle = '#2563EB'
    ctx.lineWidth = 2
    ctx.stroke()

    // Inner dot
    ctx.beginPath()
    ctx.arc(sx, sy, 3, 0, Math.PI * 2)
    ctx.fillStyle = '#2563EB'
    ctx.fill()
  }
}

// ============================================================================
// Live preview
// ============================================================================
function drawLivePreview(
  ctx: CanvasRenderingContext2D,
  ds: DrawingState,
  zoom: number,
  inchesPerPixel: number | null,
) {
  const mouse = ds.currentMouse!

  if ((ds.mode === 'drawing-distance' || ds.mode === 'calibrating') && ds.points.length === 1) {
    const start = pdfToScreen(ds.points[0].x, ds.points[0].y, zoom)
    const end = pdfToScreen(mouse.x, mouse.y, zoom)
    const color = ds.mode === 'calibrating' ? '#F59E0B' : '#2563EB'

    ctx.setLineDash([6, 4])
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(start.x, start.y)
    ctx.lineTo(end.x, end.y)
    ctx.stroke()
    ctx.setLineDash([])

    ctx.fillStyle = color
    for (const p of [start, end]) {
      ctx.beginPath()
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2)
      ctx.fill()
    }

    const pixDist = calculateDistance(ds.points[0], mouse)
    const label = ds.mode === 'calibrating'
      ? `${pixDist.toFixed(1)} px (calibrating)`
      : getDistanceLabel(pixDist, inchesPerPixel)
    drawScreenLabelPill(ctx, label, (start.x + end.x) / 2, (start.y + end.y) / 2, color)
  }

  if (ds.mode === 'drawing-area' && ds.points.length >= 1) {
    const screenPts = ds.points.map((p) => pdfToScreen(p.x, p.y, zoom))
    const screenMouse = pdfToScreen(mouse.x, mouse.y, zoom)
    const color = '#16A34A'

    ctx.fillStyle = 'rgba(22,163,74,0.08)'
    ctx.beginPath()
    ctx.moveTo(screenPts[0].x, screenPts[0].y)
    screenPts.slice(1).forEach((p) => ctx.lineTo(p.x, p.y))
    ctx.lineTo(screenMouse.x, screenMouse.y)
    ctx.closePath()
    ctx.fill()

    ctx.setLineDash([6, 4])
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(screenPts[0].x, screenPts[0].y)
    screenPts.slice(1).forEach((p) => ctx.lineTo(p.x, p.y))
    ctx.lineTo(screenMouse.x, screenMouse.y)
    ctx.closePath()
    ctx.stroke()
    ctx.setLineDash([])

    ctx.fillStyle = color
    for (const sp of screenPts) {
      ctx.beginPath()
      ctx.arc(sp.x, sp.y, 4, 0, Math.PI * 2)
      ctx.fill()
    }

    if (ds.points.length >= 2) {
      const allPts = [...ds.points, mouse]
      const pixArea = calculatePolygonArea(allPts)
      const areaLabel = getAreaLabel(pixArea, inchesPerPixel)
      const centroid = getPolygonCentroid(allPts)
      const sc = pdfToScreen(centroid.x, centroid.y, zoom)
      drawScreenLabelPill(ctx, areaLabel, sc.x, sc.y, color)
    }

    if (ds.points.length < 3) {
      ctx.font = '12px Arial'
      ctx.fillStyle = 'rgba(0,0,0,0.5)'
      ctx.fillText('Click to add points, double-click to close', screenMouse.x + 12, screenMouse.y - 8)
    }
  }
}

function drawScreenLabelPill(ctx: CanvasRenderingContext2D, label: string, x: number, y: number, color: string) {
  ctx.font = 'bold 13px Arial'
  const tm = ctx.measureText(label)
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.fillRect(x - tm.width / 2 - 4, y - 10, tm.width + 8, 20)
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, x, y)
  ctx.textAlign = 'start'
  ctx.textBaseline = 'alphabetic'
}
