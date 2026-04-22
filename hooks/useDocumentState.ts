'use client'

// ============================================================================
// useDocumentState — multi-user event-sourced document state
//
// Architecture:
//   1. Load latest snapshot + tail events → replay into Map-based state
//   2. Supabase Realtime postgres_changes subscription on document_events
//   3. Optimistic local apply with dedup when server event arrives
//   4. Per-user undo/redo stacks (never undo another user's action)
//   5. Seq-gap detection with automatic catchup fetch
//   6. Designed for 10k+ markups: Map lookups, no array scans in hot paths
// ============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { PdfMarkup as Markup } from '@/lib/pdf-viewer-types'

type PageScale = {
  pageNumber: number
  inchesPerPixel: number
  label?: string
}

import {
  type DocumentEvent,
  type DocumentState,
  type Snapshot,
  stateFromSnapshot,
  replayEvents,
  applyEvent,
  reverseEvent,
  markupsArray,
  pageScalesArray,
} from '@/lib/document-event-replay'
import {
  createMarkup as serverCreateMarkup,
  updateMarkup as serverUpdateMarkup,
  deleteMarkup as serverDeleteMarkup,
  savePageScale as serverSavePageScale,
  createSnapshotIfNeeded,
  fetchLatestSnapshot,
  fetchEventsSince,
} from '@/app/plan-viewer/actions'

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export interface UseDocumentStateReturn {
  markups: Markup[]
  pageScales: PageScale[]
  lastSeq: number
  loading: boolean
  error: string | null

  addMarkup: (markup: Markup) => Promise<void>
  editMarkup: (markup: Markup) => Promise<void>
  removeMarkup: (markupId: string, pageNumber?: number) => Promise<void>
  setPageScale: (scale: PageScale) => Promise<void>

  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const MAX_UNDO = 100
const SNAPSHOT_THRESHOLD = 50
const SEQ_GAP_CATCHUP_DELAY = 200

// ---------------------------------------------------------------------------
// Optimistic event tracking — dedup when confirmed event arrives from Realtime
// ---------------------------------------------------------------------------
interface OptimisticEntry {
  localId: string       // client-generated UUID
  markupId: string | null
  eventType: string
  appliedAt: number     // Date.now()
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useDocumentState(documentId: string | null): UseDocumentStateReturn {
  const stateRef = useRef<DocumentState>({ markups: new Map(), pageScales: new Map(), lastSeq: 0 })
  const [renderTick, setRenderTick] = useState(0)
  const bump = useCallback(() => setRenderTick((t) => t + 1), [])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Per-user undo/redo (only events this client created)
  const undoStack = useRef<DocumentEvent[]>([])
  const redoStack = useRef<DocumentEvent[]>([])

  // Optimistic event tracking for dedup
  const optimistic = useRef<OptimisticEntry[]>([])
  const eventCounter = useRef(0)

  // Catchup timer for seq gaps
  const catchupTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------
  const isOptimistic = useCallback((event: DocumentEvent): boolean => {
    const idx = optimistic.current.findIndex(
      (o) =>
        o.eventType === event.event_type &&
        o.markupId === event.markup_id &&
        Date.now() - o.appliedAt < 10_000, // expire after 10s
    )
    if (idx >= 0) {
      optimistic.current.splice(idx, 1)
      return true
    }
    return false
  }, [])

  const catchupIfNeeded = useCallback(async (expectedSeq: number) => {
    if (!documentId) return
    const currentSeq = stateRef.current.lastSeq
    if (expectedSeq <= currentSeq + 1) return // no gap

    // Debounce: wait a bit in case out-of-order events arrive
    if (catchupTimer.current) clearTimeout(catchupTimer.current)
    catchupTimer.current = setTimeout(async () => {
      const result = await fetchEventsSince(documentId, currentSeq)
      if (result.success && result.data) {
        const events = result.data as DocumentEvent[]
        for (const e of events) {
          if (e.seq > stateRef.current.lastSeq) {
            if (!isOptimistic(e)) {
              stateRef.current = applyEvent(stateRef.current, e)
            } else {
              // Already applied optimistically — just advance seq
              stateRef.current = { ...stateRef.current, lastSeq: e.seq }
            }
          }
        }
        bump()
      }
    }, SEQ_GAP_CATCHUP_DELAY)
  }, [documentId, bump, isOptimistic])

  // ------------------------------------------------------------------
  // 1. Initial hydration: snapshot + tail events
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!documentId) {
      stateRef.current = { markups: new Map(), pageScales: new Map(), lastSeq: 0 }
      setLoading(false)
      bump()
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    undoStack.current = []
    redoStack.current = []
    optimistic.current = []

    ;(async () => {
      try {
        const snapResult = await fetchLatestSnapshot(documentId)
        const snapshot: Snapshot | null = snapResult.success ? (snapResult.data as Snapshot | null) : null
        const base = stateFromSnapshot(snapshot)
        const eventsResult = await fetchEventsSince(documentId, base.lastSeq)
        const events: DocumentEvent[] = eventsResult.success ? ((eventsResult.data as DocumentEvent[]) ?? []) : []

        if (cancelled) return
        stateRef.current = replayEvents(base, events)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      } finally {
        if (!cancelled) {
          setLoading(false)
          bump()
        }
      }
    })()

    return () => { cancelled = true }
  }, [documentId, bump])

  // ------------------------------------------------------------------
  // 2. Supabase Realtime subscription — guaranteed ordering via seq
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!documentId) return

    const channel = supabase
      .channel(`doc-events:${documentId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'document_events',
          filter: `document_id=eq.${documentId}`,
        },
        (payload: { new: DocumentEvent }) => {
          const event = payload.new as DocumentEvent

          // Detect seq gap (events arrived out of order or we missed one)
          if (event.seq > stateRef.current.lastSeq + 1) {
            catchupIfNeeded(event.seq)
            return
          }

          // Skip if already processed
          if (event.seq <= stateRef.current.lastSeq) return

          // Check if this is our own optimistic event
          if (isOptimistic(event)) {
            // Already applied — just advance the confirmed seq
            stateRef.current = { ...stateRef.current, lastSeq: event.seq }
          } else {
            // Remote event — apply it
            stateRef.current = applyEvent(stateRef.current, event)
          }
          bump()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [documentId, bump, isOptimistic, catchupIfNeeded])

  // ------------------------------------------------------------------
  // 3. Optimistic apply helper
  // ------------------------------------------------------------------
  const optimisticApply = useCallback(
    (event: DocumentEvent): void => {
      // Track for dedup
      optimistic.current.push({
        localId: event.id,
        markupId: event.markup_id,
        eventType: event.event_type,
        appliedAt: Date.now(),
      })

      // Apply to local state immediately
      stateRef.current = applyEvent(stateRef.current, event)

      // Push to per-user undo stack
      undoStack.current = [...undoStack.current.slice(-(MAX_UNDO - 1)), event]
      redoStack.current = []

      // Bump render
      bump()

      // Auto-snapshot every N events
      eventCounter.current++
      if (eventCounter.current >= SNAPSHOT_THRESHOLD && documentId) {
        eventCounter.current = 0
        createSnapshotIfNeeded(documentId, SNAPSHOT_THRESHOLD).catch(() => {})
      }
    },
    [documentId, bump],
  )

  // ------------------------------------------------------------------
  // 4. CRUD actions — optimistic apply + fire-and-forget persist
  // ------------------------------------------------------------------
  const addMarkup = useCallback(async (markup: Markup) => {
    if (!documentId) return

    const event: DocumentEvent = {
      id: crypto.randomUUID(),
      seq: stateRef.current.lastSeq + 0.01, // fractional — real seq from DB
      document_id: documentId,
      event_type: 'MARKUP_CREATED',
      payload: { markup },
      markup_id: markup.id,
      page_number: markup.pageIndex,
      user_id: null,
      created_at: new Date().toISOString(),
    }
    optimisticApply(event)
    await serverCreateMarkup(documentId, markup).catch(() => {})
  }, [documentId, optimisticApply])

  const editMarkup = useCallback(async (markup: Markup) => {
    if (!documentId) return

    const previous = stateRef.current.markups.get(markup.id) ?? null
    const event: DocumentEvent = {
      id: crypto.randomUUID(),
      seq: stateRef.current.lastSeq + 0.01,
      document_id: documentId,
      event_type: 'MARKUP_UPDATED',
      payload: { markupId: markup.id, previous, current: markup },
      markup_id: markup.id,
      page_number: markup.pageIndex,
      user_id: null,
      created_at: new Date().toISOString(),
    }
    optimisticApply(event)
    await serverUpdateMarkup(documentId, markup).catch(() => {})
  }, [documentId, optimisticApply])

  const removeMarkup = useCallback(async (markupId: string, pageNumber?: number) => {
    if (!documentId) return

    const deleted = stateRef.current.markups.get(markupId) ?? null
    const event: DocumentEvent = {
      id: crypto.randomUUID(),
      seq: stateRef.current.lastSeq + 0.01,
      document_id: documentId,
      event_type: 'MARKUP_DELETED',
      payload: { markupId, deletedMarkup: deleted },
      markup_id: markupId,
      page_number: pageNumber ?? deleted?.pageIndex ?? null,
      user_id: null,
      created_at: new Date().toISOString(),
    }
    optimisticApply(event)
    await serverDeleteMarkup(documentId, markupId, pageNumber).catch(() => {})
  }, [documentId, optimisticApply])

  const setPageScale = useCallback(async (scale: PageScale) => {
    if (!documentId) return

    const event: DocumentEvent = {
      id: crypto.randomUUID(),
      seq: stateRef.current.lastSeq + 0.01,
      document_id: documentId,
      event_type: 'SCALE_SET',
      payload: {
        pageNumber: scale.pageNumber,
        inchesPerPixel: scale.inchesPerPixel,
        label: scale.label ?? null,
      },
      markup_id: null,
      page_number: scale.pageNumber,
      user_id: null,
      created_at: new Date().toISOString(),
    }
    optimisticApply(event)
    await serverSavePageScale(documentId, scale).catch(() => {})
  }, [documentId, optimisticApply])

  // ------------------------------------------------------------------
  // 5. Per-user undo / redo (local stack only — never undoes remote)
  // ------------------------------------------------------------------
  const undo = useCallback(() => {
    const event = undoStack.current.pop()
    if (!event) return
    stateRef.current = reverseEvent(stateRef.current, event)
    redoStack.current = [...redoStack.current, event]
    bump()

    // Persist the reverse action to the server
    if (documentId) {
      if (event.event_type === 'MARKUP_CREATED') {
        const m = event.payload.markup as Markup | undefined
        if (m) serverDeleteMarkup(documentId, m.id, m.pageIndex).catch(() => {})
      } else if (event.event_type === 'MARKUP_UPDATED') {
        const prev = event.payload.previous as Markup | undefined
        if (prev) serverUpdateMarkup(documentId, prev).catch(() => {})
      } else if (event.event_type === 'MARKUP_DELETED') {
        const del = event.payload.deletedMarkup as Markup | undefined
        if (del) serverCreateMarkup(documentId, del).catch(() => {})
      }
    }
  }, [bump, documentId])

  const redo = useCallback(() => {
    const event = redoStack.current.pop()
    if (!event) return
    stateRef.current = applyEvent(stateRef.current, event)
    undoStack.current = [...undoStack.current, event]
    bump()

    // Persist the redo action to the server
    if (documentId) {
      if (event.event_type === 'MARKUP_CREATED') {
        const m = event.payload.markup as Markup | undefined
        if (m) serverCreateMarkup(documentId, m).catch(() => {})
      } else if (event.event_type === 'MARKUP_UPDATED') {
        const cur = event.payload.current as Markup | undefined
        if (cur) serverUpdateMarkup(documentId, cur).catch(() => {})
      } else if (event.event_type === 'MARKUP_DELETED') {
        const id = event.payload.markupId as string | undefined
        if (id) serverDeleteMarkup(documentId, id).catch(() => {})
      }
    }
  }, [bump, documentId])

  // ------------------------------------------------------------------
  // 6. Derived arrays — memoized to prevent infinite render loops
  //    renderTick is the only trigger; markupsArray/pageScalesArray
  //    produce stable references when the underlying Maps haven't changed.
  // ------------------------------------------------------------------
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const markups = useMemo(() => markupsArray(stateRef.current), [renderTick])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const scales = useMemo(() => pageScalesArray(stateRef.current), [renderTick])

  return useMemo<UseDocumentStateReturn>(() => ({
    markups,
    pageScales: scales,
    lastSeq: stateRef.current.lastSeq,
    loading,
    error,
    addMarkup,
    editMarkup,
    removeMarkup,
    setPageScale,
    undo,
    redo,
    canUndo: undoStack.current.length > 0,
    canRedo: redoStack.current.length > 0,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [markups, scales, loading, error, addMarkup, editMarkup, removeMarkup, setPageScale, undo, redo, renderTick])
}
