'use server'

import { createClient } from '@/lib/supabase/server'
import type { PdfMarkup as Markup } from '@/lib/pdf-viewer-types'

type PageScale = {
  pageNumber: number
  inchesPerPixel: number
  label?: string
}

// ---------------------------------------------------------------------------
// Event types — must match document_event_type enum in Postgres
// ---------------------------------------------------------------------------
export type DocumentEventType =
  | 'MARKUP_CREATED'
  | 'MARKUP_UPDATED'
  | 'MARKUP_DELETED'
  | 'SCALE_SET'
  | 'COMMENT_ADDED'

// ---------------------------------------------------------------------------
// Core: append a single event (reusable by all actions)
// ---------------------------------------------------------------------------
async function appendEventInternal(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  documentId: string,
  eventType: DocumentEventType,
  payload: Record<string, unknown>,
  opts?: { markupId?: string; pageNumber?: number },
): Promise<number | null> {
  const { data, error } = await supabase.from('document_events').insert({
    document_id: documentId,
    event_type: eventType,
    payload,
    markup_id: opts?.markupId ?? null,
    page_number: opts?.pageNumber ?? null,
    user_id: userId,
  }).select('seq').single()
  if (error) throw error
  return data?.seq ?? null
}

// ---------------------------------------------------------------------------
// Public: append event (creates its own client + auth check)
// ---------------------------------------------------------------------------
export async function appendEvent(
  documentId: string,
  eventType: DocumentEventType,
  payload: Record<string, unknown>,
  opts?: { markupId?: string; pageNumber?: number },
): Promise<number | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return appendEventInternal(supabase, user.id, documentId, eventType, payload, opts)
}

// ---------------------------------------------------------------------------
// Read events since a given seq (incremental replay)
// ---------------------------------------------------------------------------
export async function getEventsSince(documentId: string, afterSeq = 0, limit = 1000) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('document_events')
    .select('*')
    .eq('document_id', documentId)
    .gt('seq', afterSeq)
    .order('seq', { ascending: true })
    .limit(limit)
  if (error) throw error
  return data ?? []
}

// ---------------------------------------------------------------------------
// Snapshot: save materialized state
// ---------------------------------------------------------------------------
export async function saveSnapshot(
  documentId: string,
  markups: Markup[],
  pageScales: PageScale[],
  lastSeq: number,
  metadata: Record<string, unknown> = {},
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase.from('document_snapshots').insert({
    document_id: documentId,
    last_seq: lastSeq,
    markups,
    page_scales: pageScales,
    metadata: { ...metadata, markupCount: markups.length },
    created_by: user.id,
  })
  if (error) throw error
}

// ---------------------------------------------------------------------------
// Snapshot: load the latest snapshot
// ---------------------------------------------------------------------------
export async function getLatestSnapshot(documentId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('document_snapshots')
    .select('*')
    .eq('document_id', documentId)
    .order('last_seq', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

// ---------------------------------------------------------------------------
// Reconstruct: latest snapshot + replay events since
// ---------------------------------------------------------------------------
export async function reconstructState(documentId: string) {
  const snapshot = await getLatestSnapshot(documentId)
  const afterSeq = snapshot?.last_seq ?? 0
  const events = await getEventsSince(documentId, afterSeq)
  return {
    snapshot,
    events,
    latestSeq: events.length > 0 ? events[events.length - 1].seq : afterSeq,
  }
}

// ---------------------------------------------------------------------------
// Get latest seq for a document (for snapshot decisions)
// ---------------------------------------------------------------------------
export async function getLatestSeq(documentId: string): Promise<number> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('document_events')
    .select('seq')
    .eq('document_id', documentId)
    .order('seq', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data?.seq ?? 0
}

// ---------------------------------------------------------------------------
// Internal helper exposed for actions that share a client
// ---------------------------------------------------------------------------
export { appendEventInternal }
