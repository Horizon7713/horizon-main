"use client"

import type { ReactNode } from "react"
import {
  AlertTriangle,
  CalendarDays,
  Flag,
  Hammer,
  Home,
  User2,
} from "lucide-react"

import {
  BLOCKER_REASON_OPTIONS,
  PRIORITY_OPTIONS,
  STATUS_OPTIONS,
  TRADE_OPTIONS,
  Task,
} from "./task-types"

interface TaskTimelineViewProps {
  timelineTasks: Task[]
  timelineDates: Date[]
  timelineSpanDays: number
  formatDateShort: (date: Date) => string
  getDayOffset: (dateString?: string | null) => number
  getBarWidthDays: (start?: string | null, end?: string | null) => number
  getPhaseLabel: (phase: string) => string
  isBlocked: (task: Task) => boolean
}

function getBarClass(task: Task, blocked: boolean) {
  if (task.is_critical && blocked) return "bg-red-500 ring-2 ring-red-300/40"
  if (task.is_critical) return "bg-sky-500 ring-2 ring-sky-300/40"
  if (task.is_inspection) return "bg-violet-500"
  if (task.priority === "critical") return "bg-red-500"
  if (task.priority === "high") return "bg-orange-500"
  if (task.priority === "low") return "bg-zinc-500"
  return "bg-blue-500"
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
      <span>{icon}</span>
      <span className="truncate">{text}</span>
    </div>
  )
}

export function TaskTimelineView({
  timelineTasks,
  timelineDates,
  timelineSpanDays,
  formatDateShort,
  getDayOffset,
  getBarWidthDays,
  getPhaseLabel,
  isBlocked,
}: TaskTimelineViewProps) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-black">
      <table className="w-full border-collapse">
        <thead className="bg-zinc-950">
          <tr className="border-b border-zinc-800 text-left">
            <th className="p-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Task
            </th>
            <th className="p-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Phase
            </th>
            <th className="p-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Trade
            </th>
            <th className="p-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Priority
            </th>
            <th className="p-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Start
            </th>
            <th className="p-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              End
            </th>
            <th className="p-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Duration
            </th>
            <th className="p-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Inspection
            </th>
            <th className="min-w-[460px] p-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              <div className="space-y-3">
                <div>Timeline</div>

                {timelineDates.length > 0 ? (
                  <div
                    className="grid gap-1 text-[10px] text-zinc-500"
                    style={{
                      gridTemplateColumns: `repeat(${timelineSpanDays}, minmax(24px, 1fr))`,
                    }}
                  >
                    {timelineDates.map((date) => (
                      <div
                        key={date.toISOString()}
                        className="border-l border-zinc-800 pl-1 text-center first:border-l-0"
                      >
                        {formatDateShort(date)}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </th>
            <th className="p-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Status
            </th>
          </tr>
        </thead>

        <tbody>
          {timelineTasks.length === 0 ? (
            <tr>
              <td colSpan={10} className="p-10 text-center">
                <div className="text-sm font-medium text-zinc-200">No tasks found</div>
                <div className="mt-1 text-xs text-zinc-500">
                  Try changing filters or adding new tasks.
                </div>
              </td>
            </tr>
          ) : (
            timelineTasks.map((task) => {
              const blocked = isBlocked(task)
              const isCritical = !!task.is_critical
              const isCriticalBlocker =
                isCritical && (task.status === "blocked" || blocked)
              const floatDays =
                task.total_float_days != null ? Number(task.total_float_days) : null

              const tradeLabel =
                TRADE_OPTIONS.find((t) => t.value === task.trade)?.label || task.trade
              const priorityLabel =
                PRIORITY_OPTIONS.find((p) => p.value === task.priority)?.label || task.priority
              const blockerLabel =
                BLOCKER_REASON_OPTIONS.find((b) => b.value === task.blocker_reason)?.label ||
                task.blocker_reason
              const statusLabel =
                STATUS_OPTIONS.find((s) => s.value === task.status)?.label || task.status

              return (
                <tr
                  key={task.id}
                  className={`border-b border-zinc-800/80 align-top hover:bg-zinc-950 ${
                    isCriticalBlocker
                      ? "bg-red-500/[0.04]"
                      : isCritical
                        ? "bg-sky-500/[0.03]"
                        : ""
                  }`}
                >
                  <td className="p-4">
                    <div className="min-w-[240px] space-y-2">
                      <div className="space-y-1">
                        <div className="text-sm font-semibold text-zinc-100">{task.name}</div>

                        <div className="flex flex-wrap gap-1.5">
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
                        </div>
                      </div>

                      {task.description ? (
                        <div className="line-clamp-2 text-xs text-zinc-500">
                          {task.description}
                        </div>
                      ) : null}

                      <div className="flex flex-wrap gap-x-4 gap-y-2">
                        {task.assigned_to_name ? (
                          <MetaItem
                            icon={<User2 className="h-3.5 w-3.5" />}
                            text={task.assigned_to_name}
                          />
                        ) : null}

                        {floatDays != null ? (
                          <MetaItem
                            icon={<CalendarDays className="h-3.5 w-3.5" />}
                            text={
                              floatDays <= 0
                                ? "Zero float"
                                : `Float: ${floatDays} day${floatDays === 1 ? "" : "s"}`
                            }
                          />
                        ) : null}

                        {task.trade ? (
                          <MetaItem
                            icon={<Hammer className="h-3.5 w-3.5" />}
                            text={String(tradeLabel)}
                          />
                        ) : null}

                        {task.homeowner_action_text ? (
                          <MetaItem
                            icon={<Home className="h-3.5 w-3.5" />}
                            text={task.homeowner_action_text}
                          />
                        ) : null}
                      </div>

                      {blocked || task.blocker_reason || task.blocker_note ? (
                        <div className="space-y-1 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                          <div className="flex items-center gap-1.5 font-medium">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            <span>{isCriticalBlocker ? "Critical Blocker" : "Blocked"}</span>
                          </div>
                          {blocked ? <div>Waiting on dependencies.</div> : null}
                          {task.blocker_reason ? <div>{blockerLabel}</div> : null}
                          {task.blocker_note ? <div>{task.blocker_note}</div> : null}
                        </div>
                      ) : null}
                    </div>
                  </td>

                  <td className="p-4 text-sm text-zinc-300">{getPhaseLabel(task.phase)}</td>

                  <td className="p-4 text-sm text-zinc-300">{task.trade ? tradeLabel : "—"}</td>

                  <td className="p-4 text-sm text-zinc-300">
                    {task.priority ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-xs text-zinc-300">
                        <Flag className="h-3.5 w-3.5" />
                        {priorityLabel}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>

                  <td className="p-4 text-sm text-zinc-300">
                    {task.planned_start ? (
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5 text-zinc-500" />
                        {task.planned_start}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>

                  <td className="p-4 text-sm text-zinc-300">
                    {task.planned_end ? (
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5 text-zinc-500" />
                        {task.planned_end}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>

                  <td className="p-4 text-sm text-zinc-300">
                    {task.duration_days !== null && task.duration_days !== undefined
                      ? `${task.duration_days} day${task.duration_days !== 1 ? "s" : ""}`
                      : "—"}
                  </td>

                  <td className="p-4 text-sm text-zinc-300">
                    {task.is_inspection ? (
                      <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-200">
                        Yes
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>

                  <td className="min-w-[460px] p-4">
                    {task.planned_start && task.planned_end ? (
                      <div
                        className="relative grid gap-1"
                        style={{
                          gridTemplateColumns: `repeat(${timelineSpanDays}, minmax(24px, 1fr))`,
                        }}
                      >
                        {timelineDates.map((date) => (
                          <div
                            key={`${task.id}-${date.toISOString()}`}
                            className="h-9 border-l border-zinc-800 first:border-l-0"
                          />
                        ))}

                        <div
                          className={`absolute top-1.5 bottom-1.5 rounded-md ${getBarClass(task, blocked)}`}
                          style={{
                            left: `calc(${(getDayOffset(task.planned_start) / timelineSpanDays) * 100}% + 2px)`,
                            width: `calc(${(getBarWidthDays(task.planned_start, task.planned_end) / timelineSpanDays) * 100}% - 4px)`,
                            minWidth: task.is_inspection ? "12px" : "8px",
                          }}
                          title={`${task.name}: ${task.planned_start} → ${task.planned_end}`}
                        />
                      </div>
                    ) : (
                      <span className="text-sm text-zinc-500">—</span>
                    )}
                  </td>

                  <td className="p-4 text-sm text-zinc-300">
                    <div className="space-y-1">
                      <div className="font-medium text-zinc-100">{statusLabel}</div>
                      {isCritical ? (
                        <div className="text-xs font-medium text-sky-300">
                          {isCriticalBlocker ? "Critical blocker" : "Critical path"}
                        </div>
                      ) : null}
                    </div>
                    {task.last_updated_at ? (
                      <div className="mt-1 text-xs text-zinc-500">
                        Updated: {task.last_updated_at}
                        {task.last_updated_by ? ` by ${task.last_updated_by}` : ""}
                      </div>
                    ) : null}
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}