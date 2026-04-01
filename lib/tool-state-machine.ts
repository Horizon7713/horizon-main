// ============================================================================
// Tool State Machine — handles tool modes for the PDF plan viewer
// Extracted as a standalone module per the measurement-system architecture spec.
// ============================================================================

import { MarkupType, Point, Markup } from './pdf-viewer-types'

// ---------------------------------------------------------------------------
// Tool modes — the finite set of states the viewer can be in
// ---------------------------------------------------------------------------
export type ToolMode =
  | 'idle'
  | 'select'
  | 'drawing-distance'
  | 'drawing-area'
  | 'calibrating'
  | 'editing'

// ---------------------------------------------------------------------------
// Drawing state — accumulated clicks / live cursor during creation
// ---------------------------------------------------------------------------
export interface DrawingState {
  mode: ToolMode
  points: Point[]
  currentMouse: Point | null
}

export const INITIAL_DRAWING: DrawingState = {
  mode: 'idle',
  points: [],
  currentMouse: null,
}

// ---------------------------------------------------------------------------
// Editing state — drag-handle manipulation of an existing markup
// ---------------------------------------------------------------------------
export interface DragHandle {
  markupId: string
  /** 'start' | 'end' for distance markups; vertex index (number) for area markups */
  handle: 'start' | 'end' | number
}

export interface EditingState {
  dragHandle: DragHandle
  /** Snapshot of the markup before the drag — used for Escape cancellation */
  originalMarkup: Markup
}

// ---------------------------------------------------------------------------
// Derive tool mode from the active tool + editing state
// ---------------------------------------------------------------------------
export function resolveToolMode(
  activeTool: MarkupType | null,
  isEditing: boolean,
): ToolMode {
  if (isEditing) return 'editing'
  if (!activeTool || activeTool === 'select') return 'select'
  if (activeTool === 'distance') return 'drawing-distance'
  if (activeTool === 'area') return 'drawing-area'
  if (activeTool === 'calibrate') return 'calibrating'
  return 'idle'
}

// ---------------------------------------------------------------------------
// Cursor class based on current state
// ---------------------------------------------------------------------------
export function getCursorClass(
  toolMode: ToolMode,
  isEditing: boolean,
  isOverHandle: boolean,
): string {
  if (isEditing) return 'cursor-grabbing'
  if (isOverHandle) return 'cursor-grab'
  if (toolMode === 'select') return 'cursor-pointer'
  return 'cursor-crosshair'
}

// ---------------------------------------------------------------------------
// Handle radius (screen pixels) for drag-handle hit testing
// ---------------------------------------------------------------------------
export const HANDLE_RADIUS = 6
