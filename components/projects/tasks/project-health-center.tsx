"use client"

import { AlertTriangle, CalendarDays, Clock3, Home, Timer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ProjectHealthBucketItem } from "./task-types"

interface ProjectHealthCenterProps {
  criticalBlockers: ProjectHealthBucketItem[]
  overdueHomeownerActions: ProjectHealthBucketItem[]
  unscheduledTasks: ProjectHealthBucketItem[]
  lowFloatTasks: ProjectHealthBucketItem[]
  onFocusBlocked: () => void
  onFocusHomeownerActions: () => void
  onFocusCritical: () => void
}

function Bucket({
  title,
  subtitle,
  icon,
  items,
  emptyText,
  onFocus,
  focusLabel,
  tone = "default",
}: {
  title: string
  subtitle: string
  icon: React.ReactNode
  items: ProjectHealthBucketItem[]
  emptyText: string
  onFocus?: () => void
  focusLabel?: string
  tone?: "default" | "red" | "amber" | "sky"
}) {
  const toneClass =
    tone === "red"
      ? "border-red-500/20 bg-red-500/10"
      : tone === "amber"
        ? "border-amber-500/20 bg-amber-500/10"
        : tone === "sky"
          ? "border-sky-500/20 bg-sky-500/10"
          : "border-zinc-800 bg-black"

  const chipClass =
    tone === "red"
      ? "border-red-500/20 bg-red-500/10 text-red-200"
      : tone === "amber"
        ? "border-amber-500/20 bg-amber-500/10 text-amber-200"
        : tone === "sky"
          ? "border-sky-500/20 bg-sky-500/10 text-sky-200"
          : "border-zinc-800 bg-zinc-950 text-zinc-300"

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
            {icon}
            <span>{title}</span>
          </div>
          <div className="mt-1 text-xs text-zinc-500">{subtitle}</div>
        </div>

        {onFocus && focusLabel && items.length > 0 ? (
          <Button
            type="button"
            variant="outline"
            className="border-zinc-800 bg-black text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-100"
            onClick={onFocus}
          >
            {focusLabel}
          </Button>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div className="text-sm text-zinc-500">{emptyText}</div>
      ) : (
        <div className="space-y-2">
          {items.slice(0, 5).map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-sm font-medium text-zinc-100">{item.name}</div>

                <span className="rounded-full border border-zinc-800 bg-black px-2 py-0.5 text-[11px] font-medium text-zinc-400">
                  {item.phase}
                </span>

                {item.is_critical ? (
                  <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-2 py-0.5 text-[11px] font-medium text-sky-200">
                    Critical
                  </span>
                ) : null}

                {item.total_float_days != null && Number(item.total_float_days) <= 2 ? (
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${chipClass}`}>
                    Float: {item.total_float_days}
                  </span>
                ) : null}
              </div>

              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs text-zinc-500">
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
              </div>

              {item.homeowner_action_text || item.blocker_reason || item.blocker_note ? (
                <div className="mt-2 text-xs text-zinc-300">
                  {item.homeowner_action_text || item.blocker_reason || item.blocker_note}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function ProjectHealthCenter({
  criticalBlockers,
  overdueHomeownerActions,
  unscheduledTasks,
  lowFloatTasks,
  onFocusBlocked,
  onFocusHomeownerActions,
  onFocusCritical,
}: ProjectHealthCenterProps) {
  const riskCount =
    criticalBlockers.length +
    overdueHomeownerActions.length +
    unscheduledTasks.length +
    lowFloatTasks.length

  return (
    <div className="rounded-[20px] border border-zinc-800 bg-zinc-950 p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="text-lg font-semibold text-zinc-100">Project Health Center</div>
          <div className="mt-1 text-sm text-zinc-500">
            Prioritized operational risks and schedule exceptions.
          </div>
        </div>

        <span className="rounded-full border border-zinc-800 bg-black px-3 py-1 text-xs font-medium text-zinc-400">
          {riskCount} active signal{riskCount === 1 ? "" : "s"}
        </span>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Bucket
          title="Critical Blockers"
          subtitle="Blocked critical-path work most likely to move the finish date."
          icon={<AlertTriangle className="h-4 w-4 text-red-300" />}
          items={criticalBlockers}
          emptyText="No blocked critical-path tasks right now."
          onFocus={onFocusBlocked}
          focusLabel="Focus Blocked"
          tone="red"
        />

        <Bucket
          title="Overdue Homeowner Actions"
          subtitle="Selections or approvals that may now be delaying work."
          icon={<Home className="h-4 w-4 text-amber-300" />}
          items={overdueHomeownerActions}
          emptyText="No overdue homeowner actions right now."
          onFocus={onFocusHomeownerActions}
          focusLabel="Focus Actions"
          tone="amber"
        />

        <Bucket
          title="Unscheduled Tasks"
          subtitle="Tasks missing a planned window and reducing schedule confidence."
          icon={<Clock3 className="h-4 w-4 text-zinc-300" />}
          items={unscheduledTasks}
          emptyText="All visible tasks are scheduled."
          tone="default"
        />

        <Bucket
          title="Low-Float Tasks"
          subtitle="Tasks with very little schedule buffer."
          icon={<Timer className="h-4 w-4 text-sky-300" />}
          items={lowFloatTasks}
          emptyText="No low-float tasks right now."
          onFocus={onFocusCritical}
          focusLabel="Focus Critical"
          tone="sky"
        />
      </div>
    </div>
  )
}