// ============================================================================
// useMeasurementTool — React hook for drawing & editing measurements
//
// Encapsulates the drawing interaction state machine (distance, area, calibrate)
// and the drag-editing system for existing markups. Designed to be consumed by
// PDFCanvasViewer while keeping that component's body lean.
// ============================================================================

import { useCallback, useEffect, useState } from 'react'
import {
  Markup,
  MarkupType,
  Point,
  DistanceMarkup,
  AreaMarkup,
  DEFAULT_STYLE,
  PageScale,
} from '@/lib/pdf-viewer-types'
import {
  calculateDistance,
  calculatePolygonArea,
  screenToPdf,
} from '@/lib/pdf-measurement-utils'
import { generateMarkupId } from '@/lib/pdf-markup-utils'
import {
  DrawingState,
  EditingState,
  DragHandle,
  ToolMode,
  INITIAL_DRAWING,
  HANDLE_RADIUS,
  resolveToolMode,
} from '@/lib/tool-state-machine'

// ---------------------------------------------------------------------------
// Hook options
// ---------------------------------------------------------------------------
interface UseMeasurementToolOptions {
  markups: Markup[]
  onMarkupsChange: (markups: Markup[]) => void
  activeTool: MarkupType | null
  selectedMarkupId: string | null
  onMarkupSelect: (id: string | null) => void
  currentPage: number
  zoom: number
  /** Fires when user completes a calibration line (pixel distance) */
  onCalibrate?: (pixelDistance: number) => void
}

// ---------------------------------------------------------------------------
// Hook return
// ---------------------------------------------------------------------------
interface UseMeasurementToolReturn {
  drawing: DrawingState
  editing: EditingState | null
  toolMode: ToolMode
  /** Convert a screen-space mouse event to a PDF-space point */
  getCanvasPoint: (clientX: number, clientY: number, canvasRect: DOMRect) => Point
  /** Call on canvas mousedown */
  handleMouseDown: (pt: Point) => void
  /** Call on canvas click */
  handleClick: (pt: Point) => void
  /** Call on canvas double-click */
  handleDoubleClick: (pt: Point) => void
  /** Call on canvas mousemove */
  handleMouseMove: (pt: Point) => void
  /** Call on canvas mouseup / mouseleave */
  handleMouseUp: () => void
  /** Test if a PDF-space point hits a drag handle */
  hitTestHandles: (pt: Point) => DragHandle | null
}

// ---------------------------------------------------------------------------
// Hook implementation
// ---------------------------------------------------------------------------
export function useMeasurementTool({
  markups,
  onMarkupsChange,
  activeTool,
  selectedMarkupId,
  onMarkupSelect,
  currentPage,
  zoom,
  onCalibrate,
}: UseMeasurementToolOptions): UseMeasurementToolReturn {
  const [drawing, setDrawing] = useState<DrawingState>(INITIAL_DRAWING)
  const [editing, setEditing] = useState<EditingState | null>(null)

  const toolMode = resolveToolMode(activeTool, !!editing)

  // Reset on tool change
  useEffect(() => {
    setDrawing(INITIAL_DRAWING)
    setEditing(null)
  }, [activeTool])

  // Escape to cancel
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editing) {
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

  // Coordinate helper
  const getCanvasPoint = useCallback(
    (clientX: number, clientY: number, canvasRect: DOMRect): Point =>
      screenToPdf(clientX - canvasRect.left, clientY - canvasRect.top, zoom),
    [zoom],
  )

  // Handle hit test
  const hitTestHandles = useCallback(
    (pt: Point): DragHandle | null => {
      if (!selectedMarkupId) return null
      const markup = markups.find((m) => m.id === selectedMarkupId && m.pageNumber === currentPage)
      if (!markup) return null
      const hitR = HANDLE_RADIUS / zoom

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

  // -----------------------------------------------------------------------
  // Interaction handlers
  // -----------------------------------------------------------------------
  const handleMouseDown = useCallback(
    (pt: Point) => {
      if (toolMode !== 'select') return
      const handle = hitTestHandles(pt)
      if (handle) {
        const original = markups.find((m) => m.id === handle.markupId)!
        setEditing({ dragHandle: handle, originalMarkup: JSON.parse(JSON.stringify(original)) })
      }
    },
    [toolMode, hitTestHandles, markups],
  )

  const handleClick = useCallback(
    (pt: Point) => {
      if (editing) return

      // Select
      if (toolMode === 'select') {
        const { isPointInMarkup } = require('@/lib/pdf-markup-utils')
        const hit = [...markups]
          .reverse()
          .find((m: Markup) => m.pageNumber === currentPage && isPointInMarkup(pt, m, 10 / zoom))
        onMarkupSelect(hit?.id ?? null)
        return
      }

      // Distance / Calibrate
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

      // Area
      if (toolMode === 'drawing-area') {
        setDrawing((prev) => ({
          mode: 'drawing-area',
          points: [...prev.points, pt],
          currentMouse: pt,
        }))
      }
    },
    [editing, toolMode, drawing, markups, currentPage, zoom, onMarkupsChange, onMarkupSelect, onCalibrate],
  )

  const handleDoubleClick = useCallback(
    (pt: Point) => {
      if (toolMode !== 'drawing-area' || drawing.points.length < 3) return
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

  const handleMouseMove = useCallback(
    (pt: Point) => {
      // Editing drag
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

      // Drawing preview
      if (drawing.points.length > 0) {
        setDrawing((prev) => ({ ...prev, currentMouse: pt }))
      }
    },
    [editing, drawing.points.length, markups, onMarkupsChange],
  )

  const handleMouseUp = useCallback(() => {
    if (editing) setEditing(null)
  }, [editing])

  return {
    drawing,
    editing,
    toolMode,
    getCanvasPoint,
    handleMouseDown,
    handleClick,
    handleDoubleClick,
    handleMouseMove,
    handleMouseUp,
    hitTestHandles,
  }
}
