export type ProjectUpdateDraftMode =
  | "general"
  | "weekly"
  | "delay"
  | "milestone"
  | "homeowner_action"

export function summarizeTaskStateForAi(tasks: any[]) {
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

export function buildProjectUpdateDraftPrompt(args: {
  project: {
    name?: string | null
    start_date?: string | null
    end_date?: string | null
  }
  tasks: any[]
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

export function buildProjectCopilotPrompt(args: {
  project: {
    name?: string | null
    start_date?: string | null
    end_date?: string | null
  }
  tasks: any[]
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