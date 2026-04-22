'use server'

import { generateObject } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info'
export type FindingCategory =
  | 'conflict'
  | 'inconsistency'
  | 'revision_delta'
  | 'risk'
  | 'suggestion'
  | 'heatmap'

export interface AnalysisFinding {
  category: FindingCategory
  severity: FindingSeverity
  title: string
  description: string
  affectedMarkupIds: string[]
  pageNumber: number | null
  suggestedAction: string | null
  bbox: { x: number; y: number; w: number; h: number } | null
}

export interface AnalysisRun {
  id: string
  documentId: string
  status: 'running' | 'completed' | 'failed'
  summary: string | null
  stats: Record<string, number>
  findings: AnalysisFinding[]
  createdAt: string
}

// ---------------------------------------------------------------------------
// Schemas for Grok structured output
// ---------------------------------------------------------------------------
const findingSchema = z.object({
  category: z.enum([
    'conflict',
    'inconsistency',
    'revision_delta',
    'risk',
    'suggestion',
    'heatmap',
  ]),
  severity: z.enum(['critical', 'high', 'medium', 'low', 'info']),
  title: z.string(),
  description: z.string(),
  affectedMarkupIds: z.array(z.string()),
  pageNumber: z.number().nullable(),
  suggestedAction: z.string().nullable(),
})

const analysisOutputSchema = z.object({
  summary: z.string(),
  findings: z.array(findingSchema),
  stats: z.object({
    totalMarkups: z.number(),
    totalEvents: z.number(),
    pagesAffected: z.number(),
    conflictCount: z.number(),
    riskCount: z.number(),
  }),
  heatmapData: z.array(
    z.object({
      pageNumber: z.number(),
      x: z.number(),
      y: z.number(),
      intensity: z.number(),
      reason: z.string(),
    })
  ),
})

// ---------------------------------------------------------------------------
// Helpers: gather data for analysis
// ---------------------------------------------------------------------------
async function gatherAnalysisContext(documentId: string) {
  const supabase = await createClient()

  const [markupsRes, eventsRes, scalesRes] = await Promise.all([
    supabase
      .from('pdf_markups')
      .select('id, markup_type, page_number, markup_data, created_by, created_at')
      .eq('pdf_file_id', documentId)
      .order('created_at', { ascending: false })
      .limit(500),
    supabase
      .from('document_events')
      .select('seq, event_type, payload, markup_id, page_number, user_id, created_at')
      .eq('document_id', documentId)
      .order('seq', { ascending: false })
      .limit(1000),
    supabase
      .from('page_scales')
      .select('page_number, inches_per_pixel, scale_label')
      .eq('document_id', documentId),
  ])

  return {
    markups: markupsRes.data ?? [],
    events: eventsRes.data ?? [],
    scales: scalesRes.data ?? [],
  }
}

function buildAnalysisPrompt(context: Awaited<ReturnType<typeof gatherAnalysisContext>>) {
  const markupSummary = context.markups.slice(0, 200).map((m) => ({
    id: m.id,
    type: m.markup_type,
    page: m.page_number,
    by: m.created_by,
    at: m.created_at,
    geo: typeof m.markup_data === 'object' ? {
      ...(m.markup_data as Record<string, unknown>),
      // Strip verbose style data to fit context window
      style: undefined,
    } : null,
  }))

  const recentEvents = context.events.slice(0, 300).map((e) => ({
    seq: e.seq,
    type: e.event_type,
    markup: e.markup_id,
    page: e.page_number,
    user: e.user_id,
    at: e.created_at,
  }))

  const userIds = [...new Set([
    ...context.markups.map((m) => m.created_by),
    ...context.events.map((e) => e.user_id),
  ].filter(Boolean))]

  return `You are an expert construction document analyst reviewing a set of plan markups and their event history.

DOCUMENT CONTEXT:
- ${context.markups.length} total markups across ${[...new Set(context.markups.map((m) => m.page_number))].length} pages
- ${context.events.length} events in the log
- ${userIds.length} contributing users
- ${context.scales.length} calibrated page scales

PAGE SCALES:
${JSON.stringify(context.scales, null, 1)}

RECENT MARKUPS (most recent first, up to 200):
${JSON.stringify(markupSummary, null, 1)}

RECENT EVENTS (most recent first, up to 300):
${JSON.stringify(recentEvents, null, 1)}

ANALYSIS INSTRUCTIONS:
1. CONFLICTS: Identify markups that overlap geographically on the same page from different users, or distance/area markups that contradict each other.
2. INCONSISTENCIES: Flag markups with missing scales, wildly different measurement ranges on the same page, or orphaned markups (referenced in events but not in current state).
3. REVISION DELTAS: Summarize what changed recently -- new markups, deleted markups, areas with heavy edits.
4. RISKS: Identify pages with unusually dense markup activity, rapidly created/deleted markups (indecision), or very large area/distance values that may be miscalibrated.
5. SUGGESTIONS: Recommend actions -- review specific pages, verify calibration, assign reviewer to high-activity areas.
6. HEATMAP: Produce activity hotspots (x,y center of high-activity regions, 0-1 normalized coordinates, with intensity 0-1).

Be concise. Every finding must include the specific markup IDs and page numbers affected.`
}

// ---------------------------------------------------------------------------
// Core: run AI analysis
// ---------------------------------------------------------------------------
export async function runDocumentAnalysis(documentId: string): Promise<AnalysisRun> {
  const supabase = await createClient()

  // Create run record
  const { data: run, error: runErr } = await supabase
    .from('document_analysis_runs')
    .insert({ document_id: documentId, status: 'running' })
    .select('id, created_at')
    .single()

  if (runErr || !run) throw new Error(runErr?.message ?? 'Failed to create analysis run')

  const runId = run.id as string

  try {
    const context = await gatherAnalysisContext(documentId)

    const { object: output } = await generateObject({
  model:'openai/gpt-5-mini',
  schema: analysisOutputSchema,
  prompt: buildAnalysisPrompt(context),
})

if (!output) throw new Error('AI returned no structured output')

    if (!output) throw new Error('AI returned no structured output')

    // Persist findings
    const findingRows = output.findings.map((f) => ({
      run_id: runId,
      document_id: documentId,
      category: f.category,
      severity: f.severity,
      title: f.title,
      description: f.description,
      affected_markup_ids: f.affectedMarkupIds,
      page_number: f.pageNumber,
      suggested_action: f.suggestedAction,
      metadata: {},
    }))

    if (findingRows.length > 0) {
      await supabase.from('document_analysis_findings').insert(findingRows)
    }

    // Update run with results
    await supabase
      .from('document_analysis_runs')
      .update({
        status: 'completed',
        summary: output.summary,
        stats: {
          ...output.stats,
          heatmapPoints: output.heatmapData.length,
          findingsCount: output.findings.length,
        },
        heatmap_data: output.heatmapData,
      })
      .eq('id', runId)

    return {
      id: runId,
      documentId,
      status: 'completed',
      summary: output.summary,
      stats: output.stats,
      findings: output.findings.map((f) => ({
        ...f,
        bbox: null,
      })),
      createdAt: run.created_at,
    }
  } catch (err) {
    await supabase
      .from('document_analysis_runs')
      .update({ status: 'failed', summary: err instanceof Error ? err.message : String(err) })
      .eq('id', runId)
    throw err
  }
}

// ---------------------------------------------------------------------------
// Fetch past analysis runs
// ---------------------------------------------------------------------------
export async function getAnalysisRuns(documentId: string, limit = 10) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('document_analysis_runs')
    .select('id, document_id, status, summary, stats, heatmap_data, created_at')
    .eq('document_id', documentId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data ?? []
}

export async function getAnalysisFindings(runId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('document_analysis_findings')
    .select('*')
    .eq('run_id', runId)
    .order('severity', { ascending: true })

  if (error) throw error
  return data ?? []
}
