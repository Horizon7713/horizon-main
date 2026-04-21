"use client"

import type { ReactNode } from "react"
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Edit,
  Flag,
  GripVertical,
  Hammer,
  Home,
  SearchCheck,
  Trash2,
  User2,
} from "lucide-react"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import {
  BLOCKER_REASON_OPTIONS,
  PRIORITY_OPTIONS,
  STATUS_OPTIONS,
  TRADE_OPTIONS,
  Task,
  TaskStatus,
} from "./task-types"

interface SortableTaskCardProps {
  task: Task
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: TaskStatus) => void
  isOverdue: (date: string | null) => boolean
  isBlocked: (task: Task) => boolean
}

function getStatusClasses(status: TaskStatus) {
  switch (status) {
    case "completed":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
    case "in_progress":
      return "border-blue-500/20 bg-blue-500/10 text-blue-200"
    case "blocked":
      return "border-red-500/20 bg-red-500/10 text-red-200"
    default:
      return "border-zinc-700 bg-zinc-900 text-zinc-300"
  }
}

function getPriorityClasses(priority?: string | null) {
  switch (priority) {
    case "critical":
      return "border-red-500/20 bg-red-500/10 text-red-200"
    case "high":
      return "border-orange-500/20 bg-orange-500/10 text-orange-200"
    case "low":
      return "border-zinc-700 bg-zinc-900 text-zinc-300"
    default:
      return "border-blue-500/20 bg-blue-500/10 text-blue-200"
  }
}

function MetaItem({
  icon,
  text,
}: {
  icon: ReactNode
  text: string
}) {
  return (
    <div className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
      <span className="text-zinc-500">{icon}</span>
      <span className="truncate">{text}</span>
    </div>
  )
}

export function SortableTaskCard({
  task,
  onEdit,
  onDelete,
  onStatusChange,
  isOverdue,
  isBlocked,
}: SortableTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: {
      type: "task",
      task,
      phase: task.phase,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
  }

  const statusLabel = STATUS_OPTIONS.find((s) => s.value === task.status)?.label || task.status
  const tradeLabel = TRADE_OPTIONS.find((t) => t.value === task.trade)?.label || task.trade
  const priorityLabel =
    PRIORITY_OPTIONS.find((p) => p.value === task.priority)?.label || task.priority
  const blockerLabel =
    BLOCKER_REASON_OPTIONS.find((b) => b.value === task.blocker_reason)?.label ||
    task.blocker_reason

  const overdue = isOverdue(task.due_date)
  const blockedByDependency = isBlocked(task)
  const isCritical = !!task.is_critical
  const isCriticalBlocker =
    isCritical && (task.status === "blocked" || blockedByDependency)
  const floatDays =
    task.total_float_days != null ? Number(task.total_float_days) : null

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`mb-3 rounded-2xl border bg-black text-zinc-100 shadow-none transition hover:-translate-y-0.5 ${
        isCriticalBlocker
          ? "border-red-500/30 bg-red-500/[0.04]"
          : isCritical
            ? "border-sky-500/30 bg-sky-500/[0.03]"
            : "border-zinc-800"
      }`}
    >
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            className="mt-0.5 shrink-0 cursor-grab rounded-md border border-zinc-800 bg-zinc-950 p-1 text-zinc-500 active:cursor-grabbing hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-300"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>

          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="break-words font-semibold leading-tight text-zinc-100">
                  {task.name}
                </div>

                {task.description ? (
                  <div className="mt-1 line-clamp-2 break-words text-sm leading-relaxed text-zinc-500">
                    {task.description}
                  </div>
                ) : null}
              </div>

              {task.status === "completed" ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-300" />
              ) : null}
            </div>

            <div className="flex flex-wrap gap-1.5">
              <span
                className={`rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] ${getStatusClasses(
                  task.status,
                )}`}
              >
                {statusLabel}
              </span>

              {isCritical ? (
                <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-sky-200">
                  Critical
                </span>
              ) : null}

              {isCriticalBlocker ? (
                <span className="rounded-full border border-red-500/25 bg-red-500/12 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-red-100">
                  Critical Blocker
                </span>
              ) : null}

              {task.priority && ["high", "critical"].includes(task.priority) ? (
                <span
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] ${getPriorityClasses(
                    task.priority,
                  )}`}
                >
                  {priorityLabel}
                </span>
              ) : null}

              {task.is_inspection ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-blue-200">
                  <SearchCheck className="h-3.5 w-3.5" />
                  Inspection
                </span>
              ) : null}

              {task.requires_homeowner_action ? (
                <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-amber-200">
                  Homeowner Action
                </span>
              ) : null}

              {overdue ? (
                <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-red-200">
                  Overdue
                </span>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-x-3 gap-y-1.5">
              {task.assigned_to_name ? (
                <MetaItem icon={<User2 className="h-3.5 w-3.5" />} text={task.assigned_to_name} />
              ) : null}

              {floatDays != null ? (
                <MetaItem
                  icon={<CalendarDays className="h-3.5 w-3.5" />}
                  text={floatDays <= 0 ? "Zero float" : `Float: ${floatDays} day${floatDays === 1 ? "" : "s"}`}
                />
              ) : null}

              {task.trade ? (
                <MetaItem icon={<Hammer className="h-3.5 w-3.5" />} text={tradeLabel} />
              ) : null}

              {task.planned_end || task.due_date ? (
                <MetaItem
                  icon={<CalendarDays className="h-3.5 w-3.5" />}
                  text={task.planned_end || task.due_date || ""}
                />
              ) : null}

              {task.priority && ["medium", "low"].includes(task.priority) ? (
                <MetaItem icon={<Flag className="h-3.5 w-3.5" />} text={priorityLabel} />
              ) : null}

              {task.requires_homeowner_action ? (
                <MetaItem icon={<Home className="h-3.5 w-3.5" />} text="Action needed" />
              ) : null}
            </div>

            {blockedByDependency || task.blocker_reason || task.blocker_note ? (
              <div className="space-y-1 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                <div className="flex items-center gap-1.5 font-medium">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>{isCriticalBlocker ? "Critical Blocker" : "Blocked"}</span>
                </div>

                {blockedByDependency ? <div>Waiting on dependencies.</div> : null}
                {task.blocker_reason ? <div>{blockerLabel}</div> : null}
                {task.blocker_note ? <div>{task.blocker_note}</div> : null}
              </div>
            ) : null}

            {task.homeowner_visible_note ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-400">
                {task.homeowner_visible_note}
              </div>
            ) : null}

            <div className="space-y-2 border-t border-zinc-800 pt-2.5">
              <Select value={task.status} onValueChange={(v: TaskStatus) => onStatusChange(task.id, v)}>
                <SelectTrigger className="w-full border-zinc-800 bg-zinc-950 text-zinc-100">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="border-zinc-800 bg-zinc-950 text-zinc-100">
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-100"
                  onClick={() => onEdit(task)}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 border-red-500/20 bg-red-500/10 text-red-200 hover:bg-red-500/15"
                  onClick={() => onDelete(task.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}