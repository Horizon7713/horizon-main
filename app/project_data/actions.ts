"use server"

import OpenAI from "openai"
import { revalidatePath } from "next/cache"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

type ProjectUpdateType =
  | "progress"
  | "delay"
  | "milestone"
  | "selection_needed"
  | "issue"
  | "inspection"

type ProjectEventType =
  | "task_created"
  | "task_updated"
  | "task_deleted"
  | "task_status_changed"
  | "schedule_built"
  | "project_update_created"
  | "project_update_updated"
  | "project_update_deleted"
  | "project_update_published"
  | "project_update_unpublished"
  | "homeowner_action_flagged"

type ProjectUpdateDraftMode =
  | "general"
  | "weekly"
  | "delay"
  | "milestone"
  | "homeowner_action"

type QuantitySource =
  | "manual"
  | "project_square_feet"
  | "project_bathroom_count"
  | "project_window_count"
  | "project_door_count"
  | "project_cabinet_count"

interface ProjectTaskAiShape {
  id: string
  name?: string | null
  phase?: string | null
  status?: string | null
  planned_start?: string | null
  planned_end?: string | null
  due_date?: string | null
  trade?: string | null
  priority?: string | null
  is_inspection?: boolean | null
  is_critical?: boolean | null
  total_float_days?: number | null
  requires_homeowner_action?: boolean | null
  homeowner_action_text?: string | null
  homeowner_visible_note?: string | null
  blocker_reason?: string | null
  blocker_note?: string | null
  assigned_to_name?: string | null
  sort_order?: number | null
  depends_on?: string[] | null
  lag_days?: number | null
  quantity_source?: string | null
  quantity_value?: number | null
  production_rate?: number | null
  duration_mode?: string | null
  duration_days?: number | null
  minimum_duration_days?: number | null
  locked_start_date?: string | null
  locked_end_date?: string | null
}

function summarizeTaskStateForAi(tasks: ProjectTaskAiShape[]) {
  const blockedTasks = tasks.filter(
    (task) => task.status === "blocked" || !!task.blocker_reason || !!task.blocker_note
  )
  const criticalTasks = tasks.filter((task) => !!task.is_critical)
  const homeownerActionTasks = tasks.filter((task) => !!task.requires_homeowner_action)
  const completedTasks = tasks.filter((task) => task.status === "completed")
  const inProgressTasks = tasks.filter((task) => task.status === "in_progress")
  const lowFloatTasks = tasks.filter(
    (task) =>
      task.total_float_days != null &&
      Number(task.total_float_days) >= 0 &&
      Number(task.total_float_days) <= 2
  )
  const unscheduledTasks = tasks.filter((task) => !task.planned_start || !task.planned_end)

  return {
    blockedTasks,
    criticalTasks,
    homeownerActionTasks,
    completedTasks,
    inProgressTasks,
    lowFloatTasks,
    unscheduledTasks,
  }
}

function buildProjectUpdateDraftPrompt(args: {
  project: {
    name?: string | null
    start_date?: string | null
    end_date?: string | null
  }
  tasks: ProjectTaskAiShape[]
  mode: ProjectUpdateDraftMode
}) {
  const {
    blockedTasks,
    criticalTasks,
    homeownerActionTasks,
    completedTasks,
    inProgressTasks,
  } = summarizeTaskStateForAi(args.tasks)

  const milestoneLikeTasks = args.tasks.filter(
    (task) =>
      !!task.is_inspection ||
      (task.name || "").toLowerCase().includes("inspection") ||
      (task.name || "").toLowerCase().includes("complete") ||
      (task.name || "").toLowerCase().includes("install")
  )

  const modeInstructions =
    args.mode === "weekly"
      ? `
Draft a weekly progress update.
Focus on what was completed recently, what is in progress now, and what is next.
Prefer type = "progress" unless there is strong evidence of a delay or issue.
`
      : args.mode === "delay"
        ? `
Draft a delay-focused update.
Only describe a delay if the provided task data supports it through blocked or critical-path evidence.
Prefer type = "delay" or "issue".
Explain impact calmly and clearly for the homeowner.
`
        : args.mode === "milestone"
          ? `
Draft a milestone-focused update.
Focus on a major completion point, inspection, or important progress checkpoint.
Prefer type = "milestone" or "inspection".
`
          : args.mode === "homeowner_action"
            ? `
Draft a homeowner-action-focused update.
Focus on decisions, approvals, selections, or other homeowner input needed to keep progress moving.
Prefer type = "selection_needed" when appropriate.
requires_homeowner_action should usually be true if supported by the data.
`
            : `
Draft a general project update.
Choose the most appropriate type from the available options.
`

  return `
Draft a structured project update for a homeowner dashboard.

Project:
- Name: ${args.project.name || "Unnamed Project"}
- Start Date: ${args.project.start_date || "Unknown"}
- End Date: ${args.project.end_date || "Unknown"}

Draft mode:
- ${args.mode}

Summary counts:
- Total tasks: ${args.tasks.length}
- Completed tasks: ${completedTasks.length}
- In progress tasks: ${inProgressTasks.length}
- Blocked tasks: ${blockedTasks.length}
- Critical tasks: ${criticalTasks.length}
- Homeowner action tasks: ${homeownerActionTasks.length}
- Milestone-like tasks: ${milestoneLikeTasks.length}

Important tasks:
${JSON.stringify(
  args.tasks.slice(0, 50).map((task) => ({
    name: task.name,
    phase: task.phase,
    status: task.status,
    planned_start: task.planned_start,
    planned_end: task.planned_end,
    due_date: task.due_date,
    trade: task.trade,
    priority: task.priority,
    is_inspection: task.is_inspection,
    is_critical: task.is_critical,
    total_float_days: task.total_float_days,
    requires_homeowner_action: task.requires_homeowner_action,
    homeowner_action_text: task.homeowner_action_text,
    homeowner_visible_note: task.homeowner_visible_note,
    blocker_reason: task.blocker_reason,
    blocker_note: task.blocker_note,
    assigned_to_name: task.assigned_to_name,
  })),
  null,
  2
)}

Instructions:
${modeInstructions}

Global requirements:
- Be accurate and conservative.
- Do not invent facts.
- Keep homeowner summary clear, calm, and concise.
- Mention delays only if supported by blocked/critical task evidence.
- If there is homeowner action needed, say so plainly.
- Internal summary can be more direct and operational.
- Title should be short and useful.
- Type must be one of:
  progress, delay, milestone, selection_needed, issue, inspection

Return ONLY valid JSON with exactly these keys:
{
  "title": string,
  "type": "progress" | "delay" | "milestone" | "selection_needed" | "issue" | "inspection",
  "internal_summary": string,
  "homeowner_summary": string,
  "requires_homeowner_action": boolean
}
`
}

function buildProjectCopilotPrompt(args: {
  project: {
    name?: string | null
    start_date?: string | null
    end_date?: string | null
  }
  tasks: ProjectTaskAiShape[]
}) {
  const {
    blockedTasks,
    criticalTasks,
    homeownerActionTasks,
    completedTasks,
    inProgressTasks,
    lowFloatTasks,
    unscheduledTasks,
  } = summarizeTaskStateForAi(args.tasks)

  return `
You are a PM copilot for residential construction software.

Create a concise weekly project recap for internal PM use plus a short homeowner-safe update.

Project:
- Name: ${args.project.name || "Unnamed Project"}
- Start Date: ${args.project.start_date || "Unknown"}
- End Date: ${args.project.end_date || "Unknown"}

Counts:
- Total tasks: ${args.tasks.length}
- Completed: ${completedTasks.length}
- In progress: ${inProgressTasks.length}
- Blocked: ${blockedTasks.length}
- Critical: ${criticalTasks.length}
- Low float: ${lowFloatTasks.length}
- Homeowner actions: ${homeownerActionTasks.length}
- Unscheduled: ${unscheduledTasks.length}

Tasks:
${JSON.stringify(
  args.tasks.slice(0, 60).map((task) => ({
    name: task.name,
    phase: task.phase,
    status: task.status,
    planned_start: task.planned_start,
    planned_end: task.planned_end,
    due_date: task.due_date,
    trade: task.trade,
    priority: task.priority,
    is_inspection: task.is_inspection,
    is_critical: task.is_critical,
    total_float_days: task.total_float_days,
    requires_homeowner_action: task.requires_homeowner_action,
    homeowner_action_text: task.homeowner_action_text,
    homeowner_visible_note: task.homeowner_visible_note,
    blocker_reason: task.blocker_reason,
    blocker_note: task.blocker_note,
    assigned_to_name: task.assigned_to_name,
  })),
  null,
  2
)}

Return ONLY valid JSON:
{
  "summary": string,
  "risks": string[],
  "next_actions": string[],
  "homeowner_update": string
}

Rules:
- Be factual and conservative.
- Do not invent facts.
- Summary should be internal, practical, and concise.
- Risks should be short bullets.
- Next actions should be operational tasks for the PM.
- Homeowner update should be calm, clear, and non-alarming unless delay evidence is strong.
`
}

async function getSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // Ignore when called from a Server Component
          }
        },
      },
    }
  )
}

async function getCurrentUser() {
  const supabase = await getSupabaseClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error("Not authenticated")
  }

  const { data: userProfile, error: profileError } = await supabase
    .from("users")
    .select("id, first_name, last_name, email")
    .eq("auth_id", user.id)
    .single()

  if (profileError || !userProfile) {
    throw new Error("User profile not found")
  }

  return userProfile
}

export interface CreateTaskInput {
  projectId: string
  name: string
  description?: string
  phase?: string
  status?: "not_started" | "in_progress" | "blocked" | "completed"
  startDate?: string
  dueDate?: string
  assignedTo?: string
  assignedToName?: string
  sortOrder?: number
  isAiGenerated?: boolean
  aiPrompt?: string
  blockerReason?: string | null
  blockerNote?: string | null
  requiresHomeownerAction?: boolean
  homeownerActionText?: string | null
  homeownerVisibleNote?: string | null
}

export interface UpdateTaskInput {
  taskId: string
  name?: string
  description?: string
  phase?: string
  status?: "not_started" | "in_progress" | "blocked" | "completed"
  startDate?: string
  dueDate?: string
  assignedTo?: string
  assignedToName?: string
  sortOrder?: number
  dependsOn?: string[]
  durationDays?: number
  lagDays?: number
  plannedStart?: string
  plannedEnd?: string
  lockedStartDate?: string
  lockedEndDate?: string
  trade?: string
  priority?: string
  isInspection?: boolean
  durationMode?: "fixed" | "square_foot" | "item_count"
  productionRate?: number | null
  quantityValue?: number | null
  minimumDurationDays?: number
  blockerReason?: string | null
  blockerNote?: string | null
  requiresHomeownerAction?: boolean
  homeownerActionText?: string | null
  homeownerVisibleNote?: string | null
  quantitySource?: QuantitySource
}

export interface UpdateProjectInput {
  projectId: string
  name?: string
  startDate?: string | null
  endDate?: string | null
  budget?: number | null
  squareFeet?: number | null
  bathroomCount?: number | null
  windowCount?: number | null
  doorCount?: number | null
  cabinetCount?: number | null
}

export interface CreateProjectUpdateInput {
  projectId: string
  taskId?: string | null
  type?: ProjectUpdateType
  title: string
  internalSummary?: string | null
  homeownerSummary?: string | null
  requiresHomeownerAction?: boolean
  actionDeadline?: string | null
  sourceType?: "manual" | "ai_generated" | "system"
  confidenceScore?: number | null
}

export interface UpdateProjectUpdateInput {
  updateId: string
  type?: ProjectUpdateType
  title?: string
  internalSummary?: string | null
  homeownerSummary?: string | null
  requiresHomeownerAction?: boolean
  actionDeadline?: string | null
  isPublished?: boolean
  sourceType?: "manual" | "ai_generated" | "system"
  confidenceScore?: number | null
}

export interface LogProjectEventInput {
  projectId: string
  taskId?: string | null
  projectUpdateId?: string | null
  eventType: ProjectEventType
  title: string
  details?: string | null
  metadata?: Record<string, unknown>
}

export async function updateProject(input: UpdateProjectInput) {
  try {
    const supabase = await getSupabaseClient()
    await getCurrentUser()

    const updateData: Record<string, unknown> = {}

    if (input.name !== undefined) updateData.name = input.name
    if (input.startDate !== undefined) updateData.start_date = input.startDate
    if (input.endDate !== undefined) updateData.end_date = input.endDate
    if (input.budget !== undefined) {
      updateData.budget = input.budget
      updateData.current_budget = input.budget
    }
    if (input.squareFeet !== undefined) updateData.square_feet = input.squareFeet
    if (input.bathroomCount !== undefined) updateData.bathroom_count = input.bathroomCount
    if (input.windowCount !== undefined) updateData.window_count = input.windowCount
    if (input.doorCount !== undefined) updateData.door_count = input.doorCount
    if (input.cabinetCount !== undefined) updateData.cabinet_count = input.cabinetCount

    const { data, error } = await supabase
      .from("projects")
      .update(updateData)
      .eq("id", input.projectId)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath(`/project_data/${input.projectId}`)
    revalidatePath("/project_data")
    return { success: true, data }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return { success: false, error: msg }
  }
}

function createsDependencyCycle(
  taskId: string,
  nextDependsOn: string[],
  allTasks: { id: string; depends_on?: string[] | null }[]
) {
  const graph = new Map<string, string[]>()

  for (const task of allTasks) {
    graph.set(task.id, task.depends_on || [])
  }

  graph.set(taskId, nextDependsOn)

  const visited = new Set<string>()
  const stack = new Set<string>()

  const dfs = (nodeId: string): boolean => {
    if (stack.has(nodeId)) return true
    if (visited.has(nodeId)) return false

    visited.add(nodeId)
    stack.add(nodeId)

    const deps = graph.get(nodeId) || []
    for (const depId of deps) {
      if (dfs(depId)) return true
    }

    stack.delete(nodeId)
    return false
  }

  return dfs(taskId)
}

async function logProjectEvent(input: LogProjectEventInput) {
  const supabase = await getSupabaseClient()
  const user = await getCurrentUser()

  const { error } = await supabase.from("project_events").insert({
    project_id: input.projectId,
    task_id: input.taskId || null,
    project_update_id: input.projectUpdateId || null,
    event_type: input.eventType,
    title: input.title,
    details: input.details || null,
    actor_user_id: user.id,
    metadata: input.metadata || {},
  })

  if (error) {
    console.error("[actions] Failed to log project event:", error.message)
  }
}

export async function getProjectEvents(projectId: string) {
  try {
    const supabase = await getSupabaseClient()
    await getCurrentUser()

    const { data, error } = await supabase
      .from("project_events")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(100)

    if (error) {
      return { success: false, error: error.message, data: [] }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return { success: false, error: msg, data: [] }
  }
}

export async function createTask(input: CreateTaskInput) {
  try {
    const supabase = await getSupabaseClient()
    const user = await getCurrentUser()

    const { data: lastTask } = await supabase
      .from("project_tasks")
      .select("sort_order")
      .eq("project_id", input.projectId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextSortOrder = input.sortOrder ?? (lastTask?.sort_order ?? 0) + 10

    const { data, error } = await supabase
      .from("project_tasks")
      .insert({
        project_id: input.projectId,
        created_by: user.id,
        name: input.name,
        description: input.description || null,
        phase: input.phase || null,
        status: input.status || "not_started",
        start_date: input.startDate || null,
        due_date: input.dueDate || null,
        assigned_to: input.assignedTo || null,
        assigned_to_name: input.assignedToName || null,
        blocker_reason: input.blockerReason || null,
        blocker_note: input.blockerNote || null,
        requires_homeowner_action: input.requiresHomeownerAction || false,
        homeowner_action_text: input.homeownerActionText || null,
        homeowner_visible_note: input.homeownerVisibleNote || null,
        last_updated_by:
          `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email,
        last_updated_at: new Date().toISOString(),
        sort_order: nextSortOrder,
        is_ai_generated: input.isAiGenerated || false,
        ai_prompt: input.aiPrompt || null,
      })
      .select()
      .single()

    if (error) {
      console.error("[actions] Error creating task:", error)
      return { success: false, error: error.message }
    }

    await logProjectEvent({
      projectId: input.projectId,
      taskId: data.id,
      eventType: "task_created",
      title: `Task created: ${data.name}`,
      details: data.description || null,
      metadata: {
        phase: data.phase,
        status: data.status,
      },
    })

    if (data.requires_homeowner_action) {
      await logProjectEvent({
        projectId: input.projectId,
        taskId: data.id,
        eventType: "homeowner_action_flagged",
        title: `Homeowner action flagged: ${data.name}`,
        details: data.homeowner_action_text || data.homeowner_visible_note || null,
      })
    }

    revalidatePath(`/project_data/${input.projectId}`)
    return { success: true, data }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error("[actions] Exception creating task:", msg)
    return { success: false, error: msg }
  }
}

export async function updateTask(input: UpdateTaskInput) {
  try {
    const supabase = await getSupabaseClient()
    const user = await getCurrentUser()

    const { data: existingTask, error: existingTaskError } = await supabase
      .from("project_tasks")
      .select("id, project_id")
      .eq("id", input.taskId)
      .single()

    if (existingTaskError || !existingTask) {
      return { success: false, error: "Task not found" }
    }

    if (input.dependsOn !== undefined) {
      if (input.dependsOn.includes(input.taskId)) {
        return { success: false, error: "A task cannot depend on itself" }
      }

      const { data: allProjectTasks, error: allTasksError } = await supabase
        .from("project_tasks")
        .select("id, depends_on")
        .eq("project_id", existingTask.project_id)

      if (allTasksError) {
        return { success: false, error: allTasksError.message }
      }

      if (createsDependencyCycle(input.taskId, input.dependsOn, allProjectTasks || [])) {
        return {
          success: false,
          error: "This dependency change would create a circular dependency",
        }
      }
    }

    const updateData: Record<string, unknown> = {}

    if (input.name !== undefined) updateData.name = input.name
    if (input.description !== undefined) updateData.description = input.description
    if (input.phase !== undefined) updateData.phase = input.phase
    if (input.status !== undefined) {
      updateData.status = input.status
      updateData.completed_at =
        input.status === "completed" ? new Date().toISOString() : null
    }
    if (input.startDate !== undefined) updateData.start_date = input.startDate
    if (input.dueDate !== undefined) updateData.due_date = input.dueDate
    if (input.assignedTo !== undefined) updateData.assigned_to = input.assignedTo
    if (input.assignedToName !== undefined) updateData.assigned_to_name = input.assignedToName
    if (input.sortOrder !== undefined) updateData.sort_order = input.sortOrder
    if (input.dependsOn !== undefined) updateData.depends_on = input.dependsOn
    if (input.durationDays !== undefined) updateData.duration_days = input.durationDays
    if (input.lagDays !== undefined) updateData.lag_days = input.lagDays
    if (input.plannedStart !== undefined) updateData.planned_start = input.plannedStart
    if (input.plannedEnd !== undefined) updateData.planned_end = input.plannedEnd
    if (input.lockedStartDate !== undefined) {
      updateData.locked_start_date = input.lockedStartDate || null
    }
    if (input.lockedEndDate !== undefined) {
      updateData.locked_end_date = input.lockedEndDate || null
    }
    if (input.trade !== undefined) updateData.trade = input.trade
    if (input.priority !== undefined) updateData.priority = input.priority
    if (input.isInspection !== undefined) updateData.is_inspection = input.isInspection
    if (input.durationMode !== undefined) updateData.duration_mode = input.durationMode
    if (input.productionRate !== undefined) updateData.production_rate = input.productionRate
    if (input.quantityValue !== undefined) updateData.quantity_value = input.quantityValue
    if (input.quantitySource !== undefined) updateData.quantity_source = input.quantitySource
    if (input.minimumDurationDays !== undefined) {
      updateData.minimum_duration_days = input.minimumDurationDays
    }
    if (input.blockerReason !== undefined) updateData.blocker_reason = input.blockerReason
    if (input.blockerNote !== undefined) updateData.blocker_note = input.blockerNote
    if (input.requiresHomeownerAction !== undefined) {
      updateData.requires_homeowner_action = input.requiresHomeownerAction
    }
    if (input.homeownerActionText !== undefined) {
      updateData.homeowner_action_text = input.homeownerActionText
    }
    if (input.homeownerVisibleNote !== undefined) {
      updateData.homeowner_visible_note = input.homeownerVisibleNote
    }

    updateData.last_updated_by =
      `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email
    updateData.last_updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from("project_tasks")
      .update(updateData)
      .eq("id", input.taskId)
      .select()
      .single()

    if (error) {
      console.error("[actions] Error updating task:", error)
      return { success: false, error: error.message }
    }

    await logProjectEvent({
      projectId: existingTask.project_id,
      taskId: input.taskId,
      eventType: "task_updated",
      title: `Task updated: ${data.name}`,
      details: data.description || null,
      metadata: {
        status: data.status,
        phase: data.phase,
        requires_homeowner_action: data.requires_homeowner_action,
      },
    })

    if (data.requires_homeowner_action) {
      await logProjectEvent({
        projectId: existingTask.project_id,
        taskId: input.taskId,
        eventType: "homeowner_action_flagged",
        title: `Homeowner action flagged: ${data.name}`,
        details: data.homeowner_action_text || data.homeowner_visible_note || null,
      })
    }

    revalidatePath(`/project_data/${existingTask.project_id}`)
    return { success: true, data }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error("[actions] Exception updating task:", msg)
    return { success: false, error: msg }
  }
}

export async function updateTaskStatus(
  taskId: string,
  status: "not_started" | "in_progress" | "blocked" | "completed"
) {
  try {
    const supabase = await getSupabaseClient()
    const user = await getCurrentUser()

    const { data: existingTask, error: existingTaskError } = await supabase
      .from("project_tasks")
      .select("id, project_id")
      .eq("id", taskId)
      .single()

    if (existingTaskError || !existingTask) {
      return { success: false, error: "Task not found" }
    }

    const updateData: Record<string, unknown> = {
      status,
      completed_at: status === "completed" ? new Date().toISOString() : null,
      last_updated_by:
        `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email,
      last_updated_at: new Date().toISOString(),
    }

    if (status !== "blocked") {
      updateData.blocker_reason = null
      updateData.blocker_note = null
    }

    const { data, error } = await supabase
      .from("project_tasks")
      .update(updateData)
      .eq("id", taskId)
      .select()
      .single()

    if (error) {
      console.error("[actions] Error updating task status:", error)
      return { success: false, error: error.message }
    }

    await logProjectEvent({
      projectId: existingTask.project_id,
      taskId,
      eventType: "task_status_changed",
      title: "Task status changed",
      details: `Task moved to ${status.replaceAll("_", " ")}`,
      metadata: {
        status,
      },
    })

    revalidatePath(`/project_data/${existingTask.project_id}`)
    return { success: true, data }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error("[actions] Exception updating task status:", msg)
    return { success: false, error: msg }
  }
}

export async function deleteTask(taskId: string) {
  try {
    const supabase = await getSupabaseClient()
    await getCurrentUser()

    const { data: existingTask, error: existingTaskError } = await supabase
      .from("project_tasks")
      .select("id, project_id, name")
      .eq("id", taskId)
      .single()

    if (existingTaskError || !existingTask) {
      return { success: false, error: "Task not found" }
    }

    const { error } = await supabase
      .from("project_tasks")
      .delete()
      .eq("id", taskId)

    if (error) {
      console.error("[actions] Error deleting task:", error)
      return { success: false, error: error.message }
    }

    await logProjectEvent({
      projectId: existingTask.project_id,
      taskId,
      eventType: "task_deleted",
      title: `Task deleted: ${existingTask.name}`,
    })

    revalidatePath(`/project_data/${existingTask.project_id}`)
    return { success: true }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error("[actions] Exception deleting task:", msg)
    return { success: false, error: msg }
  }
}

function toDateOnlyLocal(input: Date | string) {
  const d = new Date(input)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function formatLocalDate(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function isWorkingDay(date: Date) {
  const day = date.getDay()
  return day !== 0 && day !== 6
}

function nextWorkingDay(date: Date) {
  const d = toDateOnlyLocal(date)
  while (!isWorkingDay(d)) {
    d.setDate(d.getDate() + 1)
  }
  return d
}

function previousWorkingDay(date: Date) {
  const d = toDateOnlyLocal(date)
  while (!isWorkingDay(d)) {
    d.setDate(d.getDate() - 1)
  }
  return d
}

function addWorkingDaysInclusive(start: Date, durationDays: number) {
  const d = nextWorkingDay(start)
  let remaining = Math.max(1, durationDays) - 1

  while (remaining > 0) {
    d.setDate(d.getDate() + 1)
    if (isWorkingDay(d)) {
      remaining--
    }
  }

  return d
}

function subtractWorkingDaysInclusive(end: Date, durationDays: number) {
  const d = previousWorkingDay(end)
  let remaining = Math.max(1, durationDays) - 1

  while (remaining > 0) {
    d.setDate(d.getDate() - 1)
    if (isWorkingDay(d)) {
      remaining--
    }
  }

  return d
}

function addWorkingDaysForward(start: Date, daysToAdd: number) {
  const d = toDateOnlyLocal(start)
  let remaining = Math.max(0, daysToAdd)

  while (remaining > 0) {
    d.setDate(d.getDate() + 1)
    if (isWorkingDay(d)) {
      remaining--
    }
  }

  return nextWorkingDay(d)
}

function maxDate(dates: Date[]) {
  return new Date(Math.max(...dates.map((d) => d.getTime())))
}

function normalizeTrade(trade?: string | null) {
  const value = (trade || "general").trim().toLowerCase()
  return value.length > 0 ? value : "general"
}

const PHASE_SEQUENCE = [
  "sitework",
  "foundation",
  "framing",
  "roofing",
  "exterior",
  "rough_in",
  "insulation",
  "drywall",
  "interior_finish",
  "cabinetry",
  "flooring",
  "punch_list",
] as const

const PHASE_PREREQUISITES: Record<string, string[]> = {
  sitework: [],
  foundation: ["sitework"],
  framing: ["foundation"],
  roofing: ["framing"],
  exterior: ["framing"],
  rough_in: ["framing"],
  insulation: ["rough_in"],
  drywall: ["rough_in", "insulation"],
  interior_finish: ["drywall"],
  cabinetry: ["drywall"],
  flooring: ["drywall"],
  punch_list: ["interior_finish", "cabinetry", "flooring", "exterior"],
}

function getPhaseIndex(phase?: string | null) {
  const idx = PHASE_SEQUENCE.indexOf((phase || "").toLowerCase() as (typeof PHASE_SEQUENCE)[number])
  return idx === -1 ? PHASE_SEQUENCE.length : idx
}

function groupTasksByPhase<T extends { phase?: string | null }>(tasks: T[]) {
  const map = new Map<string, T[]>()

  for (const task of tasks) {
    const phase = (task.phase || "").toLowerCase()
    if (!map.has(phase)) {
      map.set(phase, [])
    }
    map.get(phase)!.push(task)
  }

  return map
}

function getEffectiveDependsOn(
  task: ProjectTaskAiShape,
  tasksByPhase: Map<string, ProjectTaskAiShape[]>
) {
  const explicitDeps = Array.isArray(task.depends_on) ? task.depends_on : []
  const phase = (task.phase || "").toLowerCase()
  const prerequisitePhases = PHASE_PREREQUISITES[phase] || []

  const inheritedPhaseDeps = prerequisitePhases.flatMap(
    (prereqPhase) => tasksByPhase.get(prereqPhase) || []
  )

  const inheritedIds = inheritedPhaseDeps
    .map((t) => t.id)
    .filter((id) => id !== task.id)

  return Array.from(new Set([...explicitDeps, ...inheritedIds]))
}

function getDefaultDurationByPhase(task: ProjectTaskAiShape, project?: {
  square_feet?: number | null
  bathroom_count?: number | null
  window_count?: number | null
  door_count?: number | null
  cabinet_count?: number | null
}) {
  const phase = (task.phase || "").toLowerCase()
  const name = (task.name || "").toLowerCase()
  const squareFeet = Number(project?.square_feet || 0)
  const bathrooms = Number(project?.bathroom_count || 0)
  const cabinets = Number(project?.cabinet_count || 0)
  const windows = Number(project?.window_count || 0)
  const doors = Number(project?.door_count || 0)

  if (task.is_inspection) return 1

  if (name.includes("footing")) return Math.max(3, Math.ceil(squareFeet / 1200) || 3)
  if (name.includes("stemwall")) return Math.max(4, Math.ceil(squareFeet / 1000) || 4)
  if (name.includes("slab")) return Math.max(3, Math.ceil(squareFeet / 1400) || 3)

  if (name.includes("frame")) return Math.max(8, Math.ceil(squareFeet / 350) || 10)
  if (name.includes("roof")) return Math.max(4, Math.ceil(squareFeet / 700) || 5)
  if (name.includes("window")) return Math.max(2, Math.ceil(windows / 6) || 2)
  if (name.includes("door")) return Math.max(2, Math.ceil(doors / 5) || 2)

  if (name.includes("rough plumbing")) return Math.max(4, bathrooms * 2 || 5)
  if (name.includes("rough electrical")) return Math.max(5, Math.ceil(squareFeet / 500) || 5)
  if (name.includes("hvac")) return Math.max(4, Math.ceil(squareFeet / 800) || 4)

  if (name.includes("insulation")) return Math.max(2, Math.ceil(squareFeet / 1200) || 2)
  if (name.includes("drywall")) return Math.max(6, Math.ceil(squareFeet / 500) || 6)
  if (name.includes("paint")) return Math.max(4, Math.ceil(squareFeet / 700) || 4)
  if (name.includes("cabinet")) return Math.max(3, Math.ceil(cabinets / 8) || 3)
  if (name.includes("floor")) return Math.max(4, Math.ceil(squareFeet / 700) || 4)
  if (name.includes("tile")) return Math.max(4, bathrooms * 2 || 4)
  if (name.includes("trim")) return Math.max(4, Math.ceil(squareFeet / 900) || 4)
  if (name.includes("punch")) return 3

  switch (phase) {
    case "sitework":
      return Math.max(3, Math.ceil(squareFeet / 2000) || 3)
    case "foundation":
      return Math.max(7, Math.ceil(squareFeet / 700) || 7)
    case "framing":
      return Math.max(10, Math.ceil(squareFeet / 350) || 10)
    case "roofing":
      return Math.max(5, Math.ceil(squareFeet / 700) || 5)
    case "exterior":
      return Math.max(5, Math.ceil(squareFeet / 800) || 5)
    case "rough_in":
      return Math.max(8, Math.ceil(squareFeet / 400) || 8)
    case "insulation":
      return Math.max(2, Math.ceil(squareFeet / 1200) || 2)
    case "drywall":
      return Math.max(7, Math.ceil(squareFeet / 500) || 7)
    case "interior_finish":
      return Math.max(8, Math.ceil(squareFeet / 600) || 8)
    case "cabinetry":
      return Math.max(4, Math.ceil(cabinets / 8) || 4)
    case "flooring":
      return Math.max(5, Math.ceil(squareFeet / 700) || 5)
    case "punch_list":
      return 3
    default:
      return Math.max(3, Number(task.duration_days || 3))
  }
}

function buildTopologicalOrder<
  T extends {
    id: string
    name?: string | null
    phase?: string | null
    sort_order?: number | null
  }
>(
  tasks: T[],
  dependencyResolver: (task: T) => string[]
): T[] {
  const taskMap = new Map(tasks.map((t) => [t.id, t]))
  const inDegree = new Map<string, number>()
  const adjacency = new Map<string, string[]>()

  for (const task of tasks) {
    inDegree.set(task.id, 0)
    adjacency.set(task.id, [])
  }

  for (const task of tasks) {
    const deps = dependencyResolver(task)
    for (const depId of deps) {
      if (!taskMap.has(depId)) continue
      adjacency.get(depId)!.push(task.id)
      inDegree.set(task.id, (inDegree.get(task.id) || 0) + 1)
    }
  }

  const stableSort = (a: T, b: T) => {
    const phaseDiff = getPhaseIndex(a.phase) - getPhaseIndex(b.phase)
    if (phaseDiff !== 0) return phaseDiff

    const sortA = Number(a.sort_order || 0)
    const sortB = Number(b.sort_order || 0)
    if (sortA !== sortB) return sortA - sortB

    return a.id.localeCompare(b.id)
  }

  const ready = tasks
    .filter((t) => (inDegree.get(t.id) || 0) === 0)
    .sort(stableSort)

  const ordered: T[] = []

  while (ready.length > 0) {
    ready.sort(stableSort)
    const current = ready.shift()!
    ordered.push(current)

    for (const nextId of adjacency.get(current.id) || []) {
      const nextDegree = (inDegree.get(nextId) || 0) - 1
      inDegree.set(nextId, nextDegree)

      if (nextDegree === 0) {
        const nextTask = taskMap.get(nextId)
        if (nextTask) ready.push(nextTask)
      }
    }
  }

  if (ordered.length !== tasks.length) {
    throw new Error("Circular dependency detected while building schedule")
  }

  return ordered
}

function getSuccessorMap(
  tasks: {
    id: string
  }[],
  dependencyResolver: (task: { id: string }) => string[]
) {
  const successors = new Map<string, string[]>()

  for (const task of tasks) {
    successors.set(task.id, [])
  }

  for (const task of tasks) {
    const deps = dependencyResolver(task)
    for (const depId of deps) {
      if (!successors.has(depId)) {
        successors.set(depId, [])
      }
      successors.get(depId)!.push(task.id)
    }
  }

  return successors
}

function diffWorkingDaysInclusive(projectStart: Date, targetDate: Date) {
  const start = toDateOnlyLocal(projectStart)
  const target = toDateOnlyLocal(targetDate)

  if (target.getTime() < start.getTime()) return 0

  let cursor = new Date(start)
  let count = 0

  while (cursor.getTime() < target.getTime()) {
    cursor.setDate(cursor.getDate() + 1)
    if (isWorkingDay(cursor)) {
      count++
    }
  }

  return count
}

export async function buildSchedule(projectId: string) {
  try {
    const supabase = await getSupabaseClient()
    await getCurrentUser()

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select(
        "id, start_date, square_feet, bathroom_count, window_count, door_count, cabinet_count"
      )
      .eq("id", projectId)
      .single()

    if (projectError) {
      return { success: false, error: projectError.message }
    }

    const { data: tasks, error: tasksError } = await supabase
      .from("project_tasks")
      .select("*")
      .eq("project_id", projectId)

    if (tasksError) {
      return { success: false, error: tasksError.message }
    }

    const allTasks = (tasks || []) as ProjectTaskAiShape[]
    if (allTasks.length === 0) {
      return { success: true }
    }

    const projectStart = nextWorkingDay(
      project?.start_date ? new Date(project.start_date) : new Date()
    )

    const taskMap = new Map(allTasks.map((task) => [task.id, task]))
    const tasksByPhase = groupTasksByPhase(allTasks)

    const resolveDependsOn = (task: ProjectTaskAiShape) =>
      getEffectiveDependsOn(task, tasksByPhase)

    const orderedTasks = buildTopologicalOrder(allTasks, resolveDependsOn)
    const successorMap = getSuccessorMap(allTasks, resolveDependsOn)

    const scheduledResults = new Map<
      string,
      {
        start: Date
        end: Date
        durationDays: number
        quantityValue: number | null
        earlyStartDay: number
        earlyEndDay: number
        lateStartDay: number | null
        lateEndDay: number | null
        totalFloatDays: number | null
        isCritical: boolean
      }
    >()

    const tradeAvailability = new Map<string, Date>()

    const getResolvedQuantityValue = (task: ProjectTaskAiShape) => {
      const source = task.quantity_source || "manual"
      const currentQuantity =
        task.quantity_value != null ? Number(task.quantity_value) : null

      if (currentQuantity != null && currentQuantity > 0) {
        return currentQuantity
      }

      if (source === "project_square_feet") {
        return project?.square_feet != null ? Number(project.square_feet) : null
      }

      if (source === "project_bathroom_count") {
        return project?.bathroom_count != null ? Number(project.bathroom_count) : null
      }

      if (source === "project_window_count") {
        return project?.window_count != null ? Number(project.window_count) : null
      }

      if (source === "project_door_count") {
        return project?.door_count != null ? Number(project.door_count) : null
      }

      if (source === "project_cabinet_count") {
        return project?.cabinet_count != null ? Number(project.cabinet_count) : null
      }

      return currentQuantity
    }

    const getResolvedDurationDays = (
      task: ProjectTaskAiShape,
      quantityValue: number | null
    ) => {
      const minDays = Math.max(1, Number(task.minimum_duration_days || 1))

      if (task.is_inspection) return 1

      const mode = task.duration_mode || "fixed"
      const rate =
        task.production_rate != null ? Number(task.production_rate) : null

      if (
        mode !== "fixed" &&
        quantityValue != null &&
        quantityValue > 0 &&
        rate != null &&
        rate > 0
      ) {
        return Math.max(minDays, Math.ceil(quantityValue / rate))
      }

      const rawDuration = Number(task.duration_days || 0)

      if (rawDuration > 1) {
        return Math.max(minDays, rawDuration)
      }

      return Math.max(minDays, getDefaultDurationByPhase(task, project))
    }

    for (const task of orderedTasks) {
      const deps = resolveDependsOn(task)
      const dependencyReadyDates: Date[] = []

      for (const depId of deps) {
        const depResult = scheduledResults.get(depId)
        const depTask = taskMap.get(depId)

        if (!depTask) continue

        if (!depResult) {
          return {
            success: false,
            error: `Dependency ${depId} for task ${task.name} was not scheduled.`,
          }
        }

        const nextDayAfterDependency = toDateOnlyLocal(depResult.end)
        nextDayAfterDependency.setDate(nextDayAfterDependency.getDate() + 1)

        const lagDays = Math.max(0, Number(task.lag_days || 0))
        const readyFromDependency = addWorkingDaysForward(nextDayAfterDependency, lagDays)

        dependencyReadyDates.push(readyFromDependency)
      }

      let earliestStart =
        dependencyReadyDates.length > 0
          ? maxDate(dependencyReadyDates)
          : new Date(projectStart)

      const tradeKey = normalizeTrade(task.trade)
      const tradeReady = tradeAvailability.get(tradeKey)

      if (tradeReady && tradeReady.getTime() > earliestStart.getTime()) {
        earliestStart = new Date(tradeReady)
      }

      const lockedStart = task.locked_start_date
        ? nextWorkingDay(new Date(task.locked_start_date))
        : null

      const lockedEnd = task.locked_end_date
        ? previousWorkingDay(new Date(task.locked_end_date))
        : null

      const quantityValue = getResolvedQuantityValue(task)
      const durationDays = getResolvedDurationDays(task, quantityValue)

      let start: Date
      let end: Date

      if (lockedStart && lockedEnd) {
        start = new Date(lockedStart)
        end = new Date(lockedEnd)

        if (end.getTime() < start.getTime()) {
          return {
            success: false,
            error: `Task "${task.name}" has locked_end_date before locked_start_date.`,
          }
        }

        if (start.getTime() < earliestStart.getTime()) {
          start = nextWorkingDay(new Date(earliestStart))
          end = addWorkingDaysInclusive(start, durationDays)
        }
      } else if (lockedStart) {
        start = new Date(lockedStart)
        if (start.getTime() < earliestStart.getTime()) {
          start = new Date(earliestStart)
        }
        start = nextWorkingDay(start)
        end = addWorkingDaysInclusive(start, durationDays)
      } else if (lockedEnd) {
        end = new Date(lockedEnd)
        start = subtractWorkingDaysInclusive(end, durationDays)

        if (start.getTime() < earliestStart.getTime()) {
          start = nextWorkingDay(new Date(earliestStart))
          end = addWorkingDaysInclusive(start, durationDays)
        }
      } else {
        start = nextWorkingDay(new Date(earliestStart))
        end = addWorkingDaysInclusive(start, durationDays)
      }

      const earlyStartDay = diffWorkingDaysInclusive(projectStart, start)
      const earlyEndDay = diffWorkingDaysInclusive(projectStart, end)

      scheduledResults.set(task.id, {
        start,
        end,
        durationDays,
        quantityValue,
        earlyStartDay,
        earlyEndDay,
        lateStartDay: null,
        lateEndDay: null,
        totalFloatDays: null,
        isCritical: false,
      })

      const nextTradeAvailable = new Date(end)
      nextTradeAvailable.setDate(nextTradeAvailable.getDate() + 1)
      tradeAvailability.set(tradeKey, nextWorkingDay(nextTradeAvailable))
    }

    const projectFinishDay = Math.max(
      ...Array.from(scheduledResults.values()).map((r) => r.earlyEndDay)
    )

    const reversedTasks = [...orderedTasks].reverse()

    for (const task of reversedTasks) {
      const result = scheduledResults.get(task.id)
      if (!result) continue

      const successors = successorMap.get(task.id) || []

      let lateEndDay: number

      if (successors.length === 0) {
        lateEndDay = projectFinishDay
      } else {
        const successorLateStarts: number[] = []

        for (const successorId of successors) {
          const successorTask = taskMap.get(successorId)
          const successorResult = scheduledResults.get(successorId)

          if (!successorTask || !successorResult) continue

          const successorLag = Math.max(0, Number(successorTask.lag_days || 0))
          successorLateStarts.push(successorResult.lateStartDay! - successorLag - 1)
        }

        lateEndDay =
          successorLateStarts.length > 0
            ? Math.min(...successorLateStarts)
            : projectFinishDay
      }

      const lateStartDay = lateEndDay - result.durationDays + 1
      const totalFloatDays = lateStartDay - result.earlyStartDay
      const isCritical = totalFloatDays <= 0

      result.lateEndDay = lateEndDay
      result.lateStartDay = lateStartDay
      result.totalFloatDays = totalFloatDays
      result.isCritical = isCritical
    }

    for (const task of orderedTasks) {
      const result = scheduledResults.get(task.id)
      if (!result) continue

      const { error: updateError } = await supabase
        .from("project_tasks")
        .update({
          duration_days: result.durationDays,
          quantity_value: result.quantityValue,
          planned_start: formatLocalDate(result.start),
          planned_end: formatLocalDate(result.end),
          early_start_day: result.earlyStartDay,
          early_end_day: result.earlyEndDay,
          late_start_day: result.lateStartDay,
          late_end_day: result.lateEndDay,
          total_float_days: result.totalFloatDays,
          is_critical: result.isCritical,
          locked_start_date: task.locked_start_date || null,
          locked_end_date: task.locked_end_date || null,
        })
        .eq("id", task.id)

      if (updateError) {
        return { success: false, error: updateError.message }
      }
    }

    await logProjectEvent({
      projectId,
      eventType: "schedule_built",
      title: "Schedule rebuilt",
      details: `Scheduled ${orderedTasks.length} tasks with phase gating and estimated durations.`,
      metadata: {
        scheduled_task_count: orderedTasks.length,
      },
    })

    revalidatePath(`/project_data/${projectId}`)
    return { success: true }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to build schedule."
    console.error("[actions] Exception building schedule:", message)
    return { success: false, error: message }
  }
}

export async function reorderTasks(
  updates: { id: string; sortOrder: number; phase: string }[]
) {
  try {
    const supabase = await getSupabaseClient()
    await getCurrentUser()

    for (const update of updates) {
      const { error } = await supabase
        .from("project_tasks")
        .update({
          sort_order: update.sortOrder,
          phase: update.phase,
        })
        .eq("id", update.id)

      if (error) {
        return { success: false, error: error.message }
      }
    }

    return { success: true }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error("[actions] Exception reordering tasks:", msg)
    return { success: false, error: msg }
  }
}

export async function getProjectUpdates(projectId: string) {
  try {
    const supabase = await getSupabaseClient()
    await getCurrentUser()

    const { data, error } = await supabase
      .from("project_updates")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })

    if (error) {
      return { success: false, error: error.message, data: [] }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return { success: false, error: msg, data: [] }
  }
}

export async function createProjectUpdate(input: CreateProjectUpdateInput) {
  try {
    const supabase = await getSupabaseClient()
    const user = await getCurrentUser()

    const { data, error } = await supabase
      .from("project_updates")
      .insert({
        project_id: input.projectId,
        task_id: input.taskId || null,
        type: input.type || "progress",
        title: input.title,
        internal_summary: input.internalSummary || null,
        homeowner_summary: input.homeownerSummary || null,
        requires_homeowner_action: input.requiresHomeownerAction || false,
        action_deadline: input.actionDeadline || null,
        source_type: input.sourceType || "manual",
        confidence_score: input.confidenceScore ?? null,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    await logProjectEvent({
      projectId: input.projectId,
      projectUpdateId: data.id,
      eventType: "project_update_created",
      title: `Project update created: ${data.title}`,
      details: data.homeowner_summary || data.internal_summary || null,
      metadata: {
        type: data.type,
        source_type: data.source_type,
      },
    })

    revalidatePath(`/project_data/${input.projectId}`)
    return { success: true, data }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return { success: false, error: msg }
  }
}

export async function updateProjectUpdate(input: UpdateProjectUpdateInput) {
  try {
    const supabase = await getSupabaseClient()
    await getCurrentUser()

    const { data: existing, error: existingError } = await supabase
      .from("project_updates")
      .select("id, project_id, is_published")
      .eq("id", input.updateId)
      .single()

    if (existingError || !existing) {
      return { success: false, error: "Project update not found" }
    }

    const updateData: Record<string, unknown> = {}

    if (input.type !== undefined) updateData.type = input.type
    if (input.title !== undefined) updateData.title = input.title
    if (input.internalSummary !== undefined) updateData.internal_summary = input.internalSummary
    if (input.homeownerSummary !== undefined) updateData.homeowner_summary = input.homeownerSummary
    if (input.requiresHomeownerAction !== undefined) {
      updateData.requires_homeowner_action = input.requiresHomeownerAction
    }
    if (input.actionDeadline !== undefined) updateData.action_deadline = input.actionDeadline
    if (input.sourceType !== undefined) updateData.source_type = input.sourceType
    if (input.confidenceScore !== undefined) updateData.confidence_score = input.confidenceScore

    if (input.isPublished !== undefined) {
      updateData.is_published = input.isPublished
      updateData.published_at = input.isPublished ? new Date().toISOString() : null
    }

    const { data, error } = await supabase
      .from("project_updates")
      .update(updateData)
      .eq("id", input.updateId)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    const eventType: ProjectEventType =
      input.isPublished === true
        ? "project_update_published"
        : input.isPublished === false
          ? "project_update_unpublished"
          : "project_update_updated"

    const eventTitle =
      input.isPublished === true
        ? `Project update published: ${data.title}`
        : input.isPublished === false
          ? `Project update unpublished: ${data.title}`
          : `Project update updated: ${data.title}`

    await logProjectEvent({
      projectId: existing.project_id,
      projectUpdateId: data.id,
      eventType,
      title: eventTitle,
      details: data.homeowner_summary || data.internal_summary || null,
      metadata: {
        type: data.type,
        is_published: data.is_published,
      },
    })

    revalidatePath(`/project_data/${existing.project_id}`)
    return { success: true, data }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return { success: false, error: msg }
  }
}

export async function deleteProjectUpdate(updateId: string) {
  try {
    const supabase = await getSupabaseClient()
    await getCurrentUser()

    const { data: existing, error: existingError } = await supabase
      .from("project_updates")
      .select("id, project_id, title")
      .eq("id", updateId)
      .single()

    if (existingError || !existing) {
      return { success: false, error: "Project update not found" }
    }

    const { error } = await supabase
      .from("project_updates")
      .delete()
      .eq("id", updateId)

    if (error) {
      return { success: false, error: error.message }
    }

    await logProjectEvent({
      projectId: existing.project_id,
      projectUpdateId: updateId,
      eventType: "project_update_deleted",
      title: `Project update deleted: ${existing.title}`,
    })

    revalidatePath(`/project_data/${existing.project_id}`)
    return { success: true }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return { success: false, error: msg }
  }
}

export async function draftProjectUpdateFromTasks(
  projectId: string,
  mode: ProjectUpdateDraftMode = "general"
) {
  await getCurrentUser()

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY")
  }

  const supabase = await getSupabaseClient()

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, name, start_date, end_date")
    .eq("id", projectId)
    .single()

  if (projectError || !project) {
    throw new Error(projectError?.message || "Project not found")
  }

  const { data: tasks, error: tasksError } = await supabase
    .from("project_tasks")
    .select(
      [
        "id",
        "name",
        "phase",
        "status",
        "planned_start",
        "planned_end",
        "due_date",
        "trade",
        "priority",
        "is_inspection",
        "is_critical",
        "total_float_days",
        "requires_homeowner_action",
        "homeowner_action_text",
        "homeowner_visible_note",
        "blocker_reason",
        "blocker_note",
        "assigned_to_name",
      ].join(", ")
    )
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true })

  if (tasksError) {
    throw new Error(tasksError.message)
  }

  const allTasks = (tasks || []) as ProjectTaskAiShape[]
  const client = new OpenAI({ apiKey })

  const prompt = buildProjectUpdateDraftPrompt({
    project,
    tasks: allTasks,
    mode,
  })

  const response = await client.chat.completions.create({
    model: "gpt-5.4-nano",
    messages: [
      {
        role: "developer",
        content:
          "You draft structured construction project updates based only on provided project/task data. Never invent project facts.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.3,
  })

  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error("No AI response returned.")
  }

  let parsed: {
    title: string
    type: ProjectUpdateType
    internal_summary: string
    homeowner_summary: string
    requires_homeowner_action: boolean
  }

  try {
    parsed = JSON.parse(content)
  } catch {
    throw new Error("Failed to parse drafted project update.")
  }

  return { success: true, data: parsed }
}

export async function getProjectUpdateSuggestions(projectId: string) {
  try {
    await getCurrentUser()
    const supabase = await getSupabaseClient()

    const { data: tasks, error: tasksError } = await supabase
      .from("project_tasks")
      .select(
        [
          "id",
          "name",
          "phase",
          "status",
          "planned_start",
          "planned_end",
          "is_inspection",
          "is_critical",
          "total_float_days",
          "requires_homeowner_action",
          "homeowner_action_text",
          "blocker_reason",
          "blocker_note",
          "homeowner_visible_note",
          "updated_at",
          "completed_at",
        ].join(", ")
      )
      .eq("project_id", projectId)

    if (tasksError) {
      return { success: false, error: tasksError.message, data: [] }
    }

    const allTasks = (tasks || []) as ProjectTaskAiShape[]
    const suggestions: {
      key: string
      type: ProjectUpdateType
      title: string
      internal_summary: string
      homeowner_summary: string
      requires_homeowner_action: boolean
      reason: string
    }[] = []

    const blockedCritical = allTasks.filter(
      (task) =>
        !!task.is_critical &&
        (task.status === "blocked" || !!task.blocker_reason || !!task.blocker_note)
    )

    if (blockedCritical.length > 0) {
      suggestions.push({
        key: "critical-delay",
        type: "delay",
        title: "Schedule risk detected",
        internal_summary: `Critical path risk: ${blockedCritical.length} critical task(s) are blocked or flagged with blockers.`,
        homeowner_summary:
          "A key part of the schedule needs attention before we can confidently confirm the next phase timing. We are actively working through it and will keep you updated.",
        requires_homeowner_action: false,
        reason: "Blocked critical-path work detected.",
      })
    }

    const homeownerActionTasks = allTasks.filter(
      (task) => !!task.requires_homeowner_action || !!task.homeowner_action_text
    )

    if (homeownerActionTasks.length > 0) {
      const firstAction = homeownerActionTasks[0]
      suggestions.push({
        key: "homeowner-action",
        type: "selection_needed",
        title: "Homeowner input needed",
        internal_summary: `Homeowner action needed on ${homeownerActionTasks.length} task(s). First item: ${firstAction.name}.`,
        homeowner_summary:
          firstAction.homeowner_action_text ||
          "We need a decision or approval from you to keep this part of the project moving on time.",
        requires_homeowner_action: true,
        reason: "Open homeowner-action task detected.",
      })
    }

    const completedInspections = allTasks.filter(
      (task) => !!task.is_inspection && task.status === "completed"
    )

    if (completedInspections.length > 0) {
      const latestInspection = completedInspections[completedInspections.length - 1]
      suggestions.push({
        key: "inspection-complete",
        type: "inspection",
        title: "Inspection milestone reached",
        internal_summary: `Inspection completed: ${latestInspection.name}.`,
        homeowner_summary: `An inspection milestone has been completed: ${latestInspection.name}. This helps keep the project moving into the next phase.`,
        requires_homeowner_action: false,
        reason: "Completed inspection task detected.",
      })
    }

    const recentProgress = allTasks.filter(
      (task) => task.status === "completed" || task.status === "in_progress"
    )

    if (recentProgress.length >= 3) {
      suggestions.push({
        key: "weekly-progress",
        type: "progress",
        title: "Project progress update",
        internal_summary: `${recentProgress.length} tasks are currently completed or in progress.`,
        homeowner_summary:
          "We’ve made steady progress on the project and have multiple active or completed tasks moving the job forward.",
        requires_homeowner_action: false,
        reason: "Enough project activity to justify a progress update.",
      })
    }

    return { success: true, data: suggestions }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return { success: false, error: msg, data: [] }
  }
}

export async function getProjectCopilotRecap(projectId: string) {
  await getCurrentUser()

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY")
  }

  const supabase = await getSupabaseClient()

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, name, start_date, end_date")
    .eq("id", projectId)
    .single()

  if (projectError || !project) {
    throw new Error(projectError?.message || "Project not found")
  }

  const { data: tasks, error: tasksError } = await supabase
    .from("project_tasks")
    .select(
      [
        "id",
        "name",
        "phase",
        "status",
        "planned_start",
        "planned_end",
        "due_date",
        "trade",
        "priority",
        "is_inspection",
        "is_critical",
        "total_float_days",
        "requires_homeowner_action",
        "homeowner_action_text",
        "homeowner_visible_note",
        "blocker_reason",
        "blocker_note",
        "assigned_to_name",
      ].join(", ")
    )
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true })

  if (tasksError) {
    throw new Error(tasksError.message)
  }

  const allTasks = (tasks || []) as ProjectTaskAiShape[]
  const client = new OpenAI({ apiKey })

  const prompt = buildProjectCopilotPrompt({
    project,
    tasks: allTasks,
  })

  const response = await client.chat.completions.create({
    model: "gpt-5.4-nano",
    messages: [
      {
        role: "developer",
        content:
          "You produce concise construction PM recaps based only on provided project and task data.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.3,
  })

  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error("No AI response returned.")
  }

  let parsed: {
    summary: string
    risks: string[]
    next_actions: string[]
    homeowner_update: string
  }

  try {
    parsed = JSON.parse(content)
  } catch {
    throw new Error("Failed to parse project copilot recap.")
  }

  return { success: true, data: parsed }
}

export async function generateBaselineTasks(projectNotes?: string, projectType?: string) {
  await getCurrentUser()

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY")
  }

  const client = new OpenAI({ apiKey })
  const notes = (projectNotes || "").trim()

  const prompt = `
Generate a baseline residential construction task list.

Context:
- This is for construction project management software.
- The output should be useful for a new construction project unless the notes suggest remodel, garage, addition, or custom/high-end work.
- Keep the sequence realistic.
- Use only these phases:
  sitework, foundation, framing, roofing, exterior, rough_in, insulation, drywall, interior_finish, cabinetry, flooring, punch_list

Project type:
${projectType || "new_construction"}

Project notes:
${notes || "No additional notes provided."}

Return 15 to 30 tasks.

Each task must include exactly:
- name
- phase
- sort_order
- description
- depends_on_names
- duration_mode
- duration_days
- production_rate
- quantity_value
- minimum_duration_days
- trade
- priority
- is_inspection
- lag_days

Rules:
- sort_order should increase in logical construction sequence
- descriptions should be short and practical
- inspections should be 1-day tasks
- use duration_mode = fixed for inspections/admin/discrete tasks
- use duration_mode = square_foot when area-driven
- use duration_mode = item_count when count-driven
- do not include markdown
- do not include any extra keys

Return ONLY valid JSON in this format:
{
  "tasks": [
    {
      "name": string,
      "phase": "sitework" | "foundation" | "framing" | "roofing" | "exterior" | "rough_in" | "insulation" | "drywall" | "interior_finish" | "cabinetry" | "flooring" | "punch_list",
      "sort_order": number,
      "description": string,
      "depends_on_names": string[],
      "duration_mode": "fixed" | "square_foot" | "item_count",
      "duration_days": number,
      "production_rate": number | null,
      "quantity_value": number | null,
      "minimum_duration_days": number,
      "trade": string,
      "priority": string,
      "is_inspection": boolean,
      "lag_days": number
    }
  ]
}
`

  const response = await client.chat.completions.create({
    model: "gpt-5.4-nano",
    messages: [
      {
        role: "developer",
        content:
          "You generate structured construction task lists with scheduling metadata for residential building projects.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.4,
  })

  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error("No AI response returned.")
  }

  let parsed: {
    tasks: {
      name: string
      phase: string
      sort_order: number
      description: string
      depends_on_names: string[]
      duration_mode: "fixed" | "square_foot" | "item_count"
      duration_days: number
      production_rate: number | null
      quantity_value: number | null
      minimum_duration_days: number
      trade: string
      priority: string
      is_inspection: boolean
      lag_days: number
    }[]
  }

  try {
    parsed = JSON.parse(content)
  } catch {
    throw new Error("Failed to parse AI task output.")
  }

  const cleaned = (parsed.tasks || [])
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((task, index) => ({
      name: task.name,
      phase: task.phase,
      sort_order: (index + 1) * 10,
      description: task.description || null,
      depends_on_names: task.depends_on_names || [],
      duration_mode: task.duration_mode || "fixed",
      duration_days: Math.max(1, task.duration_days || 1),
      production_rate: task.production_rate ?? null,
      quantity_value: task.quantity_value ?? null,
      minimum_duration_days: Math.max(1, task.minimum_duration_days || 1),
      trade: task.trade || "general",
      priority: task.priority || "medium",
      is_inspection: !!task.is_inspection,
      lag_days: Math.max(0, task.lag_days || 0),
    }))

  return cleaned
}

export async function insertGeneratedTasks(
  projectId: string,
  tasks: {
    name: string
    phase: string
    sort_order: number
    description?: string | null
    depends_on_names?: string[]
    duration_mode?: "fixed" | "square_foot" | "item_count"
    duration_days?: number
    production_rate?: number | null
    quantity_value?: number | null
    minimum_duration_days?: number
    trade?: string
    priority?: string
    is_inspection?: boolean
    lag_days?: number
  }[]
) {
  const supabase = await getSupabaseClient()
  await getCurrentUser()

  const { data: existingTasks, error: existingError } = await supabase
    .from("project_tasks")
    .select("id, name, phase")
    .eq("project_id", projectId)

  if (existingError) {
    throw new Error(existingError.message)
  }

  const existingKeys = new Set(
    (existingTasks || []).map((task) => `${task.name}::${task.phase}`)
  )

  const tasksToInsert = tasks.filter(
    (task) => !existingKeys.has(`${task.name}::${task.phase}`)
  )

  if (tasksToInsert.length === 0) {
    return { success: true, inserted: 0 }
  }

  const payload = tasksToInsert.map((task) => {
    const name = (task.name || "").toLowerCase()
    const phase = (task.phase || "").toLowerCase()

    let quantitySource: QuantitySource = "manual"

    if (
      task.duration_mode === "square_foot" ||
      name.includes("drywall") ||
      name.includes("paint") ||
      name.includes("primer") ||
      name.includes("texture") ||
      name.includes("floor") ||
      name.includes("tile") ||
      name.includes("insulation") ||
      name.includes("roof") ||
      name.includes("siding") ||
      phase === "drywall" ||
      phase === "flooring" ||
      phase === "roofing" ||
      phase === "exterior"
    ) {
      quantitySource = "project_square_feet"
    } else if (
      name.includes("cabinet") ||
      name.includes("vanity install") ||
      phase === "cabinetry"
    ) {
      quantitySource = "project_cabinet_count"
    } else if (name.includes("window")) {
      quantitySource = "project_window_count"
    } else if (
      name.includes("door") ||
      name.includes("interior door") ||
      name.includes("exterior door")
    ) {
      quantitySource = "project_door_count"
    } else if (
      name.includes("bath") ||
      name.includes("toilet") ||
      name.includes("vanity") ||
      name.includes("shower") ||
      name.includes("tub") ||
      name.includes("mirror")
    ) {
      quantitySource = "project_bathroom_count"
    }

    return {
      project_id: projectId,
      name: task.name,
      phase: task.phase,
      sort_order: task.sort_order,
      description: task.description ?? null,
      status: "not_started",
      duration_mode: task.duration_mode || "fixed",
      duration_days: Math.max(1, task.duration_days || 1),
      production_rate: task.production_rate ?? null,
      quantity_value: task.quantity_value ?? null,
      quantity_source: quantitySource,
      minimum_duration_days: Math.max(1, task.minimum_duration_days || 1),
      trade: task.trade || "general",
      priority: task.priority || "medium",
      is_inspection: !!task.is_inspection,
      lag_days: Math.max(0, task.lag_days || 0),
    }
  })

  const { data: insertedRows, error: insertError } = await supabase
    .from("project_tasks")
    .insert(payload)
    .select("id, name, phase")

  if (insertError) {
    throw new Error(insertError.message)
  }

  const insertedNameMap = new Map(
    (insertedRows || []).map((task) => [task.name, task.id])
  )

  for (const task of tasksToInsert) {
    const insertedTaskId = insertedNameMap.get(task.name)
    if (!insertedTaskId) continue

    const dependencyIds = (task.depends_on_names || [])
      .map((depName) => insertedNameMap.get(depName))
      .filter((id): id is string => Boolean(id))

    if (dependencyIds.length > 0) {
      const { error: updateError } = await supabase
        .from("project_tasks")
        .update({ depends_on: dependencyIds })
        .eq("id", insertedTaskId)

      if (updateError) {
        throw new Error(updateError.message)
      }
    }
  }

  return { success: true, inserted: tasksToInsert.length }
}