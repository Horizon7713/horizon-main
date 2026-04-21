"use client"

import type { ReactNode } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Home,
  ListTodo,
  Siren,
  TrendingUp,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

interface TaskSummaryCardsProps {
  total: number
  completed: number
  inProgress: number
  blocked: number
  overdueCount: number
  homeownerActionCount: number
  needsAttentionCount: number
  percent: number
}

function SummaryCard({
  label,
  value,
  icon,
  accentClass,
}: {
  label: string
  value: number
  icon: ReactNode
  accentClass: string
}) {
  return (
    <Card className="overflow-hidden border border-zinc-800 bg-zinc-950 shadow-none">
      <CardContent className="flex items-start justify-between px-5 pt-5 pb-5">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            {label}
          </div>
          <div className="mt-3 text-[28px] font-semibold tracking-[-0.04em] text-zinc-100">
            {value}
          </div>
        </div>

        <div className={`rounded-xl border p-2.5 ${accentClass}`}>
          {icon}
        </div>
      </CardContent>
    </Card>
  )
}

export function TaskSummaryCards({
  total,
  completed,
  inProgress,
  blocked,
  overdueCount,
  homeownerActionCount,
  needsAttentionCount,
  percent,
}: TaskSummaryCardsProps) {
  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border border-zinc-800 bg-zinc-950 shadow-none">
        <CardContent className="space-y-4 px-5 pt-5 pb-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-[11px] font-medium text-blue-200">
                <TrendingUp className="h-3.5 w-3.5" />
                Progress Overview
              </div>

              <div className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-zinc-100">
                {completed} of {total} tasks completed
              </div>
              <div className="mt-1 text-sm text-zinc-500">
                Track execution progress across all active work.
              </div>
            </div>

            <div className="text-left sm:text-right">
              <div className="text-4xl font-semibold tracking-[-0.05em] text-zinc-100">
                {percent}%
              </div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                completion
              </div>
            </div>
          </div>

          <div className="rounded-full bg-black p-1">
            <Progress value={percent} className="h-2 bg-zinc-900" />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <SummaryCard
          label="Total Tasks"
          value={total}
          icon={<ListTodo className="h-5 w-5 text-zinc-300" />}
          accentClass="border-zinc-800 bg-black"
        />

        <SummaryCard
          label="Completed"
          value={completed}
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-200" />}
          accentClass="border-emerald-500/20 bg-emerald-500/10"
        />

        <SummaryCard
          label="In Progress"
          value={inProgress}
          icon={<Clock3 className="h-5 w-5 text-blue-200" />}
          accentClass="border-blue-500/20 bg-blue-500/10"
        />

        <SummaryCard
          label="Blocked"
          value={blocked}
          icon={<AlertTriangle className="h-5 w-5 text-red-200" />}
          accentClass="border-red-500/20 bg-red-500/10"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SummaryCard
          label="Overdue"
          value={overdueCount}
          icon={<Siren className="h-5 w-5 text-rose-200" />}
          accentClass="border-rose-500/20 bg-rose-500/10"
        />

        <SummaryCard
          label="Homeowner Action"
          value={homeownerActionCount}
          icon={<Home className="h-5 w-5 text-amber-200" />}
          accentClass="border-amber-500/20 bg-amber-500/10"
        />

        <SummaryCard
          label="Needs Attention"
          value={needsAttentionCount}
          icon={<AlertTriangle className="h-5 w-5 text-orange-200" />}
          accentClass="border-orange-500/20 bg-orange-500/10"
        />
      </div>
    </div>
  )
}