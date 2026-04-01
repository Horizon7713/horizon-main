// ============================================================================
// Event Replay Engine — pure, typed, zero side effects
// Replays document_events over a snapshot to reconstruct markup + scale state.
// Optimised for 10k+ markups via Map-based lookup instead of array scans.
// ============================================================================

import type { Markup, PageScale } from '@/lib/pdf-viewer-types'

// ---------------------------------------------------------------------------
// Event types — mirrors the document_event_type Postgres enum
// ---------------------------------------------------------------------------
export type DocumentEventType =
  | 'MARKUP_CREATED'
  | 'MARKUP_UPDATED'
  | 'MARKUP_DELETED'
  | 'SCALE_SET'
  | 'COMMENT_ADDED'

export interface DocumentEvent {
  id: string
  seq: number
  document_id: string
  event_type: DocumentEventType
  payload: Record<string, unknown>
  markup_id: string | null
  page_number: number | null
  user_id: string | null
  created_at: string
}

// ---------------------------------------------------------------------------
// Materialised state — what the UI renders
// ---------------------------------------------------------------------------
export interface DocumentState {
  markups: Map<string, Markup> // id → Markup (O(1) lookup)
  pageScales: Map<number, PageScale> // pageNumber → PageScale
  lastSeq: number
}

// ---------------------------------------------------------------------------
// Snapshot shape (matches document_snapshots table)
// ---------------------------------------------------------------------------
export interface Snapshot {
  id: string
  document_id: string
  last_seq: number
  markups: Markup[]
  page_scales: PageScale[]
  metadata: Record<string, unknown>
  created_at: string
}

// ---------------------------------------------------------------------------
// Build initial state from a snapshot (or empty)
// ---------------------------------------------------------------------------
export function stateFromSnapshot(snapshot: Snapshot | null): DocumentState {
  const markups = new Map<string, Markup>()
  const pageScales = new Map<number, PageScale>()

  if (snapshot) {
    for (const m of snapshot.markups ?? []) markups.set(m.id, m)
    for (const s of snapshot.page_scales ?? []) pageScales.set(s.pageNumber, s)
  }

  return { markups, pageScales, lastSeq: snapshot?.last_seq ?? 0 }
}

// ---------------------------------------------------------------------------
// Apply a single event to state (pure — returns new maps only when changed)
// ---------------------------------------------------------------------------
export function applyEvent(state: DocumentState, event: DocumentEvent): DocumentState {
  const { event_type, payload, seq } = event

  switch (event_type) {
    case 'MARKUP_CREATED': {
      const markup = payload.markup as Markup | undefined
      if (!markup?.id) return { ...state, lastSeq: seq }
      const next = new Map(state.markups)
      next.set(markup.id, markup)
      return { markups: next, pageScales: state.pageScales, lastSeq: seq }
    }

    case 'MARKUP_UPDATED': {
      const current = payload.current as Markup | undefined
      const id = (payload.markupId as string) ?? current?.id
      if (!id || !current) return { ...state, lastSeq: seq }
      const next = new Map(state.markups)
      next.set(id, current)
      return { markups: next, pageScales: state.pageScales, lastSeq: seq }
    }

    case 'MARKUP_DELETED': {
      const id = payload.markupId as string | undefined
      if (!id || !state.markups.has(id)) return { ...state, lastSeq: seq }
      const next = new Map(state.markups)
      next.delete(id)
      return { markups: next, pageScales: state.pageScales, lastSeq: seq }
    }

    case 'SCALE_SET': {
      const pageNumber = payload.pageNumber as number | undefined
      const inchesPerPixel = payload.inchesPerPixel as number | undefined
      if (pageNumber == null || inchesPerPixel == null) return { ...state, lastSeq: seq }
      const next = new Map(state.pageScales)
      next.set(pageNumber, {
        pageNumber,
        inchesPerPixel,
        label: (payload.label as string) ?? undefined,
      })
      return { markups: state.markups, pageScales: next, lastSeq: seq }
    }

    case 'COMMENT_ADDED':
      // Comments don't change markup/scale state — just bump seq
      return { ...state, lastSeq: seq }

    default:
      return { ...state, lastSeq: seq }
  }
}

// ---------------------------------------------------------------------------
// Batch replay — apply N events in order (snapshot + tail)
// ---------------------------------------------------------------------------
export function replayEvents(
  base: DocumentState,
  events: DocumentEvent[],
): DocumentState {
  let state = base
  for (const e of events) {
    state = applyEvent(state, e)
  }
  return state
}

// ---------------------------------------------------------------------------
// Undo: reverse a single event (returns the state before it was applied)
// ---------------------------------------------------------------------------
export function reverseEvent(state: DocumentState, event: DocumentEvent): DocumentState {
  const { event_type, payload } = event

  switch (event_type) {
    case 'MARKUP_CREATED': {
      const markup = payload.markup as Markup | undefined
      if (!markup?.id) return state
      const next = new Map(state.markups)
      next.delete(markup.id)
      return { markups: next, pageScales: state.pageScales, lastSeq: state.lastSeq }
    }

    case 'MARKUP_UPDATED': {
      const previous = payload.previous as Markup | undefined
      const id = (payload.markupId as string) ?? previous?.id
      if (!id || !previous) return state
      const next = new Map(state.markups)
      next.set(id, previous)
      return { markups: next, pageScales: state.pageScales, lastSeq: state.lastSeq }
    }

    case 'MARKUP_DELETED': {
      const deleted = payload.deletedMarkup as Markup | undefined
      if (!deleted?.id) return state
      const next = new Map(state.markups)
      next.set(deleted.id, deleted)
      return { markups: next, pageScales: state.pageScales, lastSeq: state.lastSeq }
    }

    case 'SCALE_SET':
    case 'COMMENT_ADDED':
      // Scale undo would require storing previous scale; skip for now
      return state

    default:
      return state
  }
}

// ---------------------------------------------------------------------------
// Helpers: convert Map state → arrays for the existing context/reducer
// ---------------------------------------------------------------------------
export function markupsArray(state: DocumentState): Markup[] {
  return Array.from(state.markups.values())
}

export function pageScalesArray(state: DocumentState): PageScale[] {
  return Array.from(state.pageScales.values())
}
