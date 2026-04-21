import { Task } from "@/components/projects/tasks/task-types"

export function isPastDate(value?: string | null) {
  if (!value) return false
  const today = new Date()
  const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  return new Date(value).getTime() < midnight
}

export function isTaskLowFloat(task: Pick<Task, "total_float_days">) {
  return task.total_float_days != null && Number(task.total_float_days) >= 0 && Number(task.total_float_days) <= 2
}

export function isTaskCritical(task: Pick<Task, "is_critical">) {
  return !!task.is_critical
}

export function isTaskCriticalBlocker(
  task: Pick<Task, "is_critical" | "status" | "blocker_reason" | "blocker_note">,
  blockedByDependency: boolean
) {
  return !!task.is_critical && (task.status === "blocked" || blockedByDependency || !!task.blocker_reason || !!task.blocker_note)
}