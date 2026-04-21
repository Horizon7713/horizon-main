"use client"

import { AlertTriangle, CalendarDays, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { HomeownerActionItem } from "./task-types"

interface HomeownerActionCenterProps {
  items: HomeownerActionItem[]
  onUseForDraft: (item: HomeownerActionItem) => void
}

function isPastDate(value?: string | null) {
  if (!value) return false
  const today = new Date()
  const target = new Date(value)
  return (
    target.getTime() <
    new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  )
}

export function HomeownerActionCenter({
  items,
  onUseForDraft,
}: HomeownerActionCenterProps) {
  const overdueCount = items.filter((item) => isPastDate(item.due_date)).length
  const criticalCount = items.filter((item) => !!item.is_critical).length

  return (
    <div className="rounded-[20px] border border-zinc-800 bg-zinc-950 p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="text-lg font-semibold text-zinc-100">
            Homeowner Action Center
          </div>
          <div className="mt-1 text-sm text-zinc-500">
            Keep decisions, approvals, and selections from stalling the project.
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-zinc-800 bg-black px-3 py-1 text-xs font-medium text-zinc-400">
            {items.length} action{items.length === 1 ? "" : "s"}
          </span>

          {overdueCount > 0 ? (
            <span className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-200">
              {overdueCount} overdue
            </span>
          ) : null}

          {criticalCount > 0 ? (
            <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-200">
              {criticalCount} critical
            </span>
          ) : null}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-black p-4 text-sm text-zinc-500">
          No homeowner actions are currently flagged on project tasks.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const overdue = isPastDate(item.due_date)
            const critical = !!item.is_critical
            const lowFloat =
              item.total_float_days != null && Number(item.total_float_days) <= 2

            return (
              <div
                key={item.id}
                className={`rounded-2xl border p-4 ${
                  overdue
                    ? "border-red-500/20 bg-red-500/10"
                    : critical
                      ? "border-sky-500/20 bg-sky-500/10"
                      : "border-zinc-800 bg-black"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-semibold text-zinc-100">
                        {item.name}
                      </div>

                      <span className="rounded-full border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-[11px] font-medium text-zinc-400">
                        {item.phase}
                      </span>

                      {critical ? (
                        <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-2 py-0.5 text-[11px] font-medium text-sky-200">
                          Critical
                        </span>
                      ) : null}

                      {overdue ? (
                        <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[11px] font-medium text-red-200">
                          Overdue
                        </span>
                      ) : null}

                      {lowFloat && !critical ? (
                        <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-200">
                          Low Float
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-2 space-y-2">
                      {item.homeowner_action_text ? (
                        <div className="text-sm text-zinc-300">
                          <span className="font-medium text-zinc-100">Action:</span>{" "}
                          {item.homeowner_action_text}
                        </div>
                      ) : null}

                      {item.homeowner_visible_note ? (
                        <div className="text-sm text-zinc-400">
                          <span className="font-medium text-zinc-100">Note:</span>{" "}
                          {item.homeowner_visible_note}
                        </div>
                      ) : null}

                      <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-zinc-500">
                        {item.due_date ? (
                          <div className="inline-flex items-center gap-1.5">
                            <CalendarDays className="h-3.5 w-3.5" />
                            Due: {item.due_date}
                          </div>
                        ) : null}

                        {item.planned_start ? (
                          <div className="inline-flex items-center gap-1.5">
                            <CalendarDays className="h-3.5 w-3.5" />
                            Start: {item.planned_start}
                          </div>
                        ) : null}

                        {item.planned_end ? (
                          <div className="inline-flex items-center gap-1.5">
                            <CalendarDays className="h-3.5 w-3.5" />
                            End: {item.planned_end}
                          </div>
                        ) : null}

                        {item.total_float_days != null ? (
                          <div className="inline-flex items-center gap-1.5">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Float: {item.total_float_days}
                          </div>
                        ) : null}
                      </div>

                      {item.blocker_reason || item.blocker_note ? (
                        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                          {item.blocker_reason ? <div>{item.blocker_reason}</div> : null}
                          {item.blocker_note ? <div>{item.blocker_note}</div> : null}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0 border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-100"
                    onClick={() => onUseForDraft(item)}
                  >
                    <Home className="mr-2 h-4 w-4" />
                    Draft Request
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}