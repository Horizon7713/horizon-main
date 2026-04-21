'use server'

import { createClient } from '@/lib/supabase/server'
import type { Markup, PageScale } from '@/lib/pdf-viewer-types'
import { processEventTriggers } from '@/lib/workflow-engine'
import {
  appendEvent,
  saveSnapshot,
  getLatestSeq,
  getEventsSince,
  reconstructState,
} from '@/lib/document-event-service'

// ============================================================================
// Auth helper — every action reuses this
// ============================================================================
async function authed() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Not authenticated')
  return { supabase, user }
}

type ActionResult<T = undefined> = { success: true; data?: T } | { success: false; error: string }

// ============================================================================
// 1. UPLOAD — save PDF metadata to pdf_files table
// ============================================================================
export async function savePdfMarkupToDatabase(input: {
  fileName: string
  fileSize: number
  blobUrl: string
  uploadTimestamp: string
}): Promise<ActionResult<{ id: string }>> {
  try {
    const { supabase, user } = await authed()
    const pdfFileId = crypto.randomUUID()

    // Insert into pdf_files table
    const { data, error } = await supabase
      .from('pdf_files')
      .insert({
        id: pdfFileId,
        file_name: input.fileName,
        file_path: input.blobUrl,
        file_size_bytes: input.fileSize,
        uploaded_by: null,
        created_at: input.uploadTimestamp,
        updated_at: input.uploadTimestamp,
        // page_count and project_id can be null initially
        page_count: null,
        project_id: null,
      })
      .select('id')
      .single()

    if (error) return { success: false, error: error.message }
    return { success: true, data: { id: pdfFileId } }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

// ============================================================================
// 2. MARKUP CRUD — incremental, each appends the correct event
// ============================================================================

/** Create a single markup row + append MARKUP_CREATED event */
export async function createMarkup(
  documentId: string,
  markup: Markup,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { supabase, user } = await authed()

    const { data, error } = await supabase
      .from('pdf_markups')
      .insert({
        id: markup.id,
        pdf_file_id: documentId,
        markup_type: markup.type,
        page_number: markup.pageNumber,
        markup_data: markup,
        created_by: user.id,
        created_at: markup.createdAt || new Date().toISOString(),
      })
      .select('id')
      .single()

    if (error) return { success: false, error: error.message }

    // Append event + evaluate workflow triggers (non-blocking)
    appendEvent(documentId, 'MARKUP_CREATED', { markup }, {
      markupId: markup.id,
      pageNumber: markup.pageNumber,
    })
      .then((seq) => processEventTriggers({
        seq: seq ?? 0,
        event_type: 'MARKUP_CREATED',
        document_id: documentId,
        page_number: markup.pageNumber,
        user_id: markup.createdBy ?? null,
        payload: { markup },
      }))
      .catch(() => {})

    return { success: true, data: { id: markup.id } }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

/** Update a single markup row + append MARKUP_UPDATED event with diff */
export async function updateMarkup(
  documentId: string,
  markup: Markup,
): Promise<ActionResult> {
  try {
    const { supabase } = await authed()

    // Fetch previous version for the event payload diff
    const { data: prev } = await supabase
      .from('pdf_markups')
      .select('markup_data')
      .eq('id', markup.id)
      .single()

    const { error } = await supabase
      .from('pdf_markups')
      .update({
        markup_type: markup.type,
        page_number: markup.pageNumber,
        markup_data: markup,
        updated_at: new Date().toISOString(),
      })
      .eq('id', markup.id)

    if (error) return { success: false, error: error.message }

    appendEvent(documentId, 'MARKUP_UPDATED', {
      markupId: markup.id,
      previous: prev?.markup_data ?? null,
      current: markup,
    }, {
      markupId: markup.id,
      pageNumber: markup.pageNumber,
    })
      .then((seq) => processEventTriggers({
        seq: seq ?? 0,
        event_type: 'MARKUP_UPDATED',
        document_id: documentId,
        page_number: markup.pageNumber,
        user_id: markup.createdBy ?? null,
        payload: { previous: prev?.markup_data, current: markup },
      }))
      .catch(() => {})

    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

/** Delete a single markup row + append MARKUP_DELETED event */
export async function deleteMarkup(
  documentId: string,
  markupId: string,
  pageNumber?: number,
): Promise<ActionResult> {
  try {
    const { supabase } = await authed()

    // Fetch before delete for the event payload
    const { data: prev } = await supabase
      .from('pdf_markups')
      .select('markup_data, page_number')
      .eq('id', markupId)
      .single()

    const { error } = await supabase
      .from('pdf_markups')
      .delete()
      .eq('id', markupId)

    if (error) return { success: false, error: error.message }

    const pg = pageNumber ?? prev?.page_number ?? undefined
    appendEvent(documentId, 'MARKUP_DELETED', {
      markupId,
      deletedMarkup: prev?.markup_data ?? null,
    }, {
      markupId,
      pageNumber: pg,
    })
      .then((seq) => processEventTriggers({
        seq: seq ?? 0,
        event_type: 'MARKUP_DELETED',
        document_id: documentId,
        page_number: pg ?? null,
        user_id: null,
        payload: { markupId, deletedMarkup: prev?.markup_data },
      }))
      .catch(() => {})

    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

// ============================================================================
// 3. LOAD — fetch all markups for a document
// ============================================================================
export async function loadMarkups(
  documentId: string,
): Promise<ActionResult<Markup[]>> {
  try {
    const { supabase } = await authed()

    const { data, error } = await supabase
      .from('pdf_markups')
      .select('markup_data')
      .eq('pdf_file_id', documentId)
      .order('created_at', { ascending: true })

    if (error) return { success: false, error: error.message }
    return { success: true, data: (data ?? []).map((r) => r.markup_data as Markup) }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

// ============================================================================
// 4. PAGE SCALES — upsert + SCALE_SET event
// ============================================================================
export async function savePageScale(
  documentId: string,
  scale: PageScale,
): Promise<ActionResult> {
  try {
    const { supabase, user } = await authed()

    const { error } = await supabase
      .from('page_scales')
      .upsert(
        {
          document_id: documentId,
          page_number: scale.pageNumber,
          inches_per_pixel: scale.inchesPerPixel,
          scale_label: scale.label ?? null,
          created_by: user.id,
        },
        { onConflict: 'document_id,page_number' },
      )

    if (error) return { success: false, error: error.message }

    appendEvent(documentId, 'SCALE_SET', {
      pageNumber: scale.pageNumber,
      inchesPerPixel: scale.inchesPerPixel,
      label: scale.label ?? null,
    }, { pageNumber: scale.pageNumber }).catch(() => {})

    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export async function loadPageScales(
  documentId: string,
): Promise<ActionResult<PageScale[]>> {
  try {
    const { supabase } = await authed()

    const { data, error } = await supabase
      .from('page_scales')
      .select('page_number, inches_per_pixel, scale_label')
      .eq('document_id', documentId)
      .order('page_number', { ascending: true })

    if (error) return { success: false, error: error.message }

    const scales: PageScale[] = (data ?? []).map((r) => ({
      pageNumber: r.page_number,
      inchesPerPixel: r.inches_per_pixel,
      label: r.scale_label ?? undefined,
    }))

    return { success: true, data: scales }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

// ============================================================================
// 5. SNAPSHOTS — periodic materialized state
// ============================================================================

/** Create a snapshot if enough events have accumulated since the last one */
export async function createSnapshotIfNeeded(
  documentId: string,
  threshold = 50,
): Promise<ActionResult<{ created: boolean }>> {
  try {
    const latestSeq = await getLatestSeq(documentId)
    const { snapshot } = await reconstructState(documentId)
    const lastSnapSeq = snapshot?.last_seq ?? 0

    if (latestSeq - lastSnapSeq < threshold) {
      return { success: true, data: { created: false } }
    }

    const [markupsResult, scalesResult] = await Promise.all([
      loadMarkups(documentId),
      loadPageScales(documentId),
    ])

    await saveSnapshot(
      documentId,
      markupsResult.data ?? [],
      scalesResult.data ?? [],
      latestSeq,
      { snapshotReason: 'auto', eventsSinceLastSnapshot: latestSeq - lastSnapSeq },
    )

    return { success: true, data: { created: true } }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

/** Force-create a snapshot right now */
export async function createSnapshot(documentId: string): Promise<ActionResult> {
  try {
    const latestSeq = await getLatestSeq(documentId)
    const [markupsResult, scalesResult] = await Promise.all([
      loadMarkups(documentId),
      loadPageScales(documentId),
    ])

    await saveSnapshot(
      documentId,
      markupsResult.data ?? [],
      scalesResult.data ?? [],
      latestSeq,
      { snapshotReason: 'manual' },
    )

    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

// ============================================================================
// 6. EVENT HISTORY — query the event log
// ============================================================================
export async function getDocumentEvents(documentId: string, afterSeq = 0) {
  try {
    const events = await getEventsSince(documentId, afterSeq)
    return { success: true, data: events }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

// ============================================================================
// 7. HYDRATION — server action wrappers for the useDocumentState hook
// ============================================================================

/** Fetch latest snapshot for a document (client-callable server action) */
export async function fetchLatestSnapshot(documentId: string) {
  try {
    const snapshot = await (await import('@/lib/document-event-service')).getLatestSnapshot(documentId)
    return { success: true as const, data: snapshot }
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : String(e) }
  }
}

/** Fetch events since a given seq (client-callable server action) */
export async function fetchEventsSince(documentId: string, afterSeq = 0) {
  try {
    const events = await (await import('@/lib/document-event-service')).getEventsSince(documentId, afterSeq)
    return { success: true as const, data: events }
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : String(e) }
  }
}
