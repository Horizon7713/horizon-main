"use server"

import { revalidatePath } from "next/cache"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

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
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
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
  plannedStart?: string
  plannedEnd?: string
  trade?: string
  priority?: string
  isMilestone?: boolean
  blockerReason?: string | null
  blockerNote?: string | null
  requiresHomeownerAction?: boolean
  homeownerActionText?: string | null
  homeownerVisibleNote?: string | null
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
  last_updated_by: `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email,
  last_updated_at: new Date().toISOString(),
  sort_order: nextSortOrder,
  is_ai_generated: input.isAiGenerated || false,
  ai_prompt: input.aiPrompt || null,
})
      .select()
      .single()

    if (error) {
      console.error("[v0] Error creating task:", error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/project_data/${input.projectId}`)
    return { success: true, data }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error("[v0] Exception creating task:", msg)
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
    return { success: false, error: "This dependency change would create a circular dependency" }
  }
}

    const updateData: Record<string, unknown> = {}

    if (input.name !== undefined) updateData.name = input.name
    if (input.description !== undefined) updateData.description = input.description
    if (input.phase !== undefined) updateData.phase = input.phase
    if (input.status !== undefined) {
      updateData.status = input.status
      updateData.completed_at = input.status === "completed" ? new Date().toISOString() : null
    }
    if (input.startDate !== undefined) updateData.start_date = input.startDate
if (input.dueDate !== undefined) updateData.due_date = input.dueDate
if (input.assignedTo !== undefined) updateData.assigned_to = input.assignedTo
if (input.assignedToName !== undefined) updateData.assigned_to_name = input.assignedToName
if (input.sortOrder !== undefined) updateData.sort_order = input.sortOrder
if (input.dependsOn !== undefined) updateData.depends_on = input.dependsOn
if (input.durationDays !== undefined) updateData.duration_days = input.durationDays
if (input.plannedStart !== undefined) updateData.planned_start = input.plannedStart
if (input.plannedEnd !== undefined) updateData.planned_end = input.plannedEnd
if (input.trade !== undefined) updateData.trade = input.trade
if (input.priority !== undefined) updateData.priority = input.priority
if (input.isMilestone !== undefined) updateData.is_milestone = input.isMilestone
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
      console.error("[v0] Error updating task:", error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/project_data/${existingTask.project_id}`)
    return { success: true, data }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error("[v0] Exception updating task:", msg)
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
  last_updated_by: `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email,
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
      console.error("[v0] Error updating task status:", error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/project_data/${existingTask.project_id}`)
    return { success: true, data }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error("[v0] Exception updating task status:", msg)
    return { success: false, error: msg }
  }
}

export async function deleteTask(taskId: string) {
  try {
    const supabase = await getSupabaseClient()
    await getCurrentUser()

    const { data: existingTask, error: existingTaskError } = await supabase
      .from("project_tasks")
      .select("id, project_id")
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
      console.error("[v0] Error deleting task:", error)
      return { success: false, error: error.message }
    }

    revalidatePath(`/project_data/${existingTask.project_id}`)
    return { success: true }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error("[v0] Exception deleting task:", msg)
    return { success: false, error: msg }
  }
}
export async function buildSchedule(projectId: string) {
  const supabase = await getSupabaseClient()
  await getCurrentUser()

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, start_date")
    .eq("id", projectId)
    .single()

  if (projectError) {
    throw new Error(projectError.message)
  }

  const { data: tasks, error } = await supabase
    .from("project_tasks")
    .select("*")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true })

  if (error) throw new Error(error.message)

  const results: Record<string, { start: Date; end: Date }> = {}

  const addDays = (date: Date, days: number) => {
    const d = new Date(date)
    d.setDate(d.getDate() + days)
    return d
  }

  const scheduleStart = project?.start_date ? new Date(project.start_date) : new Date()
  scheduleStart.setHours(0, 0, 0, 0)

  for (const task of tasks) {
    const duration = task.duration_days || 1

    let startDate = new Date(scheduleStart)

    if (task.depends_on && task.depends_on.length > 0) {
      const depEndDates = task.depends_on
        .map((id: string) => results[id]?.end)
        .filter(Boolean)

      if (depEndDates.length > 0) {
        startDate = new Date(Math.max(...depEndDates.map((d) => d.getTime())))
      }
    }

    const endDate = addDays(startDate, duration)

    results[task.id] = { start: startDate, end: endDate }
  }

  for (const task of tasks) {
    const r = results[task.id]

    await supabase
      .from("project_tasks")
      .update({
        planned_start: r.start.toISOString().split("T")[0],
        planned_end: r.end.toISOString().split("T")[0],
      })
      .eq("id", task.id)
  }

  return { success: true }
}
export async function reorderTasks(
  updates: { id: string; sortOrder: number; phase: string }[]
) {
  const supabase = await getSupabaseClient()
  await getCurrentUser()

  for (const update of updates) {
    await supabase
      .from("project_tasks")
      .update({
        sort_order: update.sortOrder,
        phase: update.phase,
      })
      .eq("id", update.id)
  }

  return { success: true }
}
import OpenAI from "openai"

// ...keep your other imports above

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
Each task must include:
- name
- phase
- sort_order
- description

Rules:
- sort_order should increase in logical construction sequence
- descriptions should be short and practical
- do not include markdown
- do not include any extra keys
`

  const response = await client.chat.completions.create({
  model: "gpt-5.4-nano",
  messages: [
    {
      role: "developer",
      content:
        "You generate structured construction task lists for residential building projects.",
    },
    {
      role: "user",
      content: prompt,
    },
  ],
  response_format: {
    type: "json_schema",
    json_schema: {
      name: "generated_tasks",
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          tasks: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                name: { type: "string" },
                phase: {
                  type: "string",
                  enum: [
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
                  ],
                },
                sort_order: { type: "number" },
                description: { type: "string" },
                depends_on_names: {
                  type: "array",
                  items: { type: "string" },
                },
              },
              required: [
                "name",
                "phase",
                "sort_order",
                "description",
                "depends_on_names",
              ],
            },
          },
        },
        required: ["tasks"],
      },
    },
  },
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

  const payload = tasksToInsert.map((task) => ({
    project_id: projectId,
    name: task.name,
    phase: task.phase,
    sort_order: task.sort_order,
    description: task.description ?? null,
    status: "not_started",
  }))

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