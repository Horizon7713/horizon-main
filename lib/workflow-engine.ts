'use server'

import { createClient } from '@/lib/supabase/server'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type TriggerAction = 'notify' | 'assign_review' | 'suggest_approval' | 'auto_analyze'

export interface WorkflowTrigger {
  id: string
  document_id: string | null
  event_type: string
  condition: Record<string, unknown>
  action: TriggerAction
  action_config: Record<string, unknown>
  enabled: boolean
}

export interface WorkflowExecution {
  trigger_id: string
  event_seq: number
  action: TriggerAction
  result: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Evaluate a single trigger condition against an event
// ---------------------------------------------------------------------------
function evaluateCondition(
  condition: Record<string, unknown>,
  event: { event_type: string; page_number?: number | null; user_id?: string | null; payload?: unknown }
): boolean {
  // Empty condition matches everything
  if (Object.keys(condition).length === 0) return true

  // Match on page
  if (condition.page_number != null && event.page_number !== condition.page_number) return false

  // Match on user exclusion (e.g., don't trigger for the author)
  if (condition.exclude_user && event.user_id === condition.exclude_user) return false

  // Match on payload field presence
  if (condition.payload_has) {
    const payload = event.payload as Record<string, unknown> | null
    if (!payload || !(condition.payload_has as string in payload)) return false
  }

  // Match on minimum markup count per page (for density triggers)
  if (condition.min_markups_on_page != null) {
    // This would require a DB lookup -- skip for now, always pass
  }

  return true
}

// ---------------------------------------------------------------------------
// Execute a trigger action
// ---------------------------------------------------------------------------
async function executeAction(
  trigger: WorkflowTrigger,
  event: { seq: number; event_type: string; document_id: string; user_id?: string | null; payload?: unknown }
): Promise<Record<string, unknown>> {
  const config = trigger.action_config

  switch (trigger.action) {
    case 'notify': {
      // In production: send via Resend, Slack webhook, etc.
      // For now, log to workflow_executions as a notification record
      return {
        type: 'notification',
        recipient: config.recipient ?? config.role ?? 'project_manager',
        message: config.message_template
          ? String(config.message_template)
              .replace('{event_type}', event.event_type)
              .replace('{document_id}', event.document_id)
              .replace('{user_id}', event.user_id ?? 'unknown')
          : `${event.event_type} on document ${event.document_id.slice(0, 8)}...`,
        channel: config.channel ?? 'in_app',
      }
    }

    case 'assign_review': {
      return {
        type: 'review_assignment',
        assignee: config.assignee ?? config.role ?? 'lead_reviewer',
        document_id: event.document_id,
        event_type: event.event_type,
        priority: config.priority ?? 'normal',
      }
    }

    case 'suggest_approval': {
      return {
        type: 'approval_suggestion',
        document_id: event.document_id,
        reason: `Auto-triggered by ${event.event_type}`,
        suggested_approver: config.approver ?? 'project_manager',
      }
    }

    case 'auto_analyze': {
      // Trigger AI analysis asynchronously (non-blocking)
      const { runDocumentAnalysis } = await import('@/lib/ai-analysis-engine')
      try {
        const run = await runDocumentAnalysis(event.document_id)
        return { type: 'auto_analysis', run_id: run.id, status: 'completed' }
      } catch (err) {
        return { type: 'auto_analysis', status: 'failed', error: String(err) }
      }
    }

    default:
      return { type: 'unknown', action: trigger.action }
  }
}

// ---------------------------------------------------------------------------
// Main: process event through all matching triggers
// ---------------------------------------------------------------------------
export async function processEventTriggers(event: {
  seq: number
  event_type: string
  document_id: string
  page_number?: number | null
  user_id?: string | null
  payload?: unknown
}): Promise<WorkflowExecution[]> {
  const supabase = await createClient()

  // Fetch enabled triggers for this event type + document
  const { data: triggers } = await supabase
    .from('workflow_triggers')
    .select('*')
    .eq('event_type', event.event_type)
    .eq('enabled', true)
    .or(`document_id.eq.${event.document_id},document_id.is.null`)
    .limit(50)

  if (!triggers || triggers.length === 0) return []

  const executions: WorkflowExecution[] = []

  for (const trigger of triggers) {
    if (!evaluateCondition(trigger.condition ?? {}, event)) continue

    try {
      const result = await executeAction(trigger, event)

      // Record execution
      const { error } = await supabase.from('workflow_executions').insert({
        trigger_id: trigger.id,
        event_seq: event.seq,
        action: trigger.action,
        result,
      })

      if (!error) {
        executions.push({
          trigger_id: trigger.id,
          event_seq: event.seq,
          action: trigger.action,
          result,
        })
      }
    } catch {
      // Trigger execution is non-blocking
    }
  }

  return executions
}

// ---------------------------------------------------------------------------
// CRUD for workflow triggers
// ---------------------------------------------------------------------------
export async function createWorkflowTrigger(trigger: {
  document_id?: string | null
  event_type: string
  condition?: Record<string, unknown>
  action: TriggerAction
  action_config?: Record<string, unknown>
}) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('workflow_triggers')
    .insert({
      document_id: trigger.document_id ?? null,
      event_type: trigger.event_type,
      condition: trigger.condition ?? {},
      action: trigger.action,
      action_config: trigger.action_config ?? {},
      enabled: true,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function listWorkflowTriggers(documentId?: string) {
  const supabase = await createClient()
  let query = supabase.from('workflow_triggers').select('*').order('created_at', { ascending: false })

  if (documentId) {
    query = query.or(`document_id.eq.${documentId},document_id.is.null`)
  }

  const { data, error } = await query.limit(100)
  if (error) throw error
  return data ?? []
}

export async function toggleWorkflowTrigger(triggerId: string, enabled: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('workflow_triggers')
    .update({ enabled })
    .eq('id', triggerId)
  if (error) throw error
}

export async function deleteWorkflowTrigger(triggerId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('workflow_triggers')
    .delete()
    .eq('id', triggerId)
  if (error) throw error
}
