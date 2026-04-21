import { PHASE_OPTIONS, Task } from "./task-types"

export function calculateDurationDays(start?: string | null, end?: string | null) {
  if (!start || !end) return 1

  const startDate = new Date(start)
  const endDate = new Date(end)

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return 1
  }

  const diffMs = endDate.getTime() - startDate.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1

  return diffDays > 0 ? diffDays : 1
}

export function isOverdue(date: string | null) {
  if (!date) return false
  const due = new Date(date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return due < today
}

export function getPhaseLabel(phase: string) {
  return PHASE_OPTIONS.find((p) => p.value === phase)?.label || phase
}

export function isTaskBlocked(task: Task, tasks: Task[]) {
  if (!task.depends_on || task.depends_on.length === 0) return false

  return task.depends_on.some((depId) => {
    const depTask = tasks.find((t) => t.id === depId)
    return !!depTask && depTask.status !== "completed"
  })
}

export function needsAttention(task: Task, tasks: Task[]) {
  return (
    task.status === "blocked" ||
    isTaskBlocked(task, tasks) ||
    isOverdue(task.due_date) ||
    !!task.requires_homeowner_action ||
    !task.assigned_to_name ||
    task.priority === "critical"
  )
}
export function formatDateShort(date: Date | string | null | undefined) {
  if (!date) return "—"

  const parsed = date instanceof Date ? date : new Date(date)

  if (Number.isNaN(parsed.getTime())) return "—"

  return `${parsed.getMonth() + 1}/${parsed.getDate()}`
}

export function getDayOffset(timelineStart: number | null, dateString?: string | null) {
  if (!dateString || timelineStart === null) return 0
  const date = new Date(dateString).getTime()
  return Math.max(
    0,
    Math.floor((date - timelineStart) / (1000 * 60 * 60 * 24))
  )
}

export function getBarWidthDays(start?: string | null, end?: string | null) {
  if (!start || !end) return 1

  const startTime = new Date(start).getTime()
  const endTime = new Date(end).getTime()

  const diffDays = Math.floor((endTime - startTime) / (1000 * 60 * 60 * 24)) + 1
  return Math.max(1, diffDays)
}