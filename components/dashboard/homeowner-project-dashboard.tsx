"use client"

import { AlertTriangle, CalendarRange, CheckCircle2, Hammer, RefreshCw, Users } from "lucide-react"
import { ProjectUpdate } from "@/components/projects/tasks/task-types"
import { useHomeownerDashboard } from "./use-homeowner-dashboard"

import {
  formatDateLong,
  formatDateShort,
  HomeownerVisualStage,
} from "./homeowner-dashboard-utils"

import { PublishedProjectUpdates } from "./published-project-updates"
import { PlanModelPanel } from "@/components/dashboard/plan-model-panel"
import { SiteCapturePanel } from "@/components/dashboard/site-capture-panel"
import {
  createSimpleRectHouseSchema,
  HouseModelSchema,
} from "@/lib/house-model/schema"
import { SiteCaptureSession } from "@/lib/site-capture/capture-session"

interface HomeownerProjectDashboardProps {
  projectId: string
  project: {
    id: string
    name?: string | null
    address?: string | null
    city?: string | null
    state?: string | null
    project_type?: string | null
  }
  houseModelSchema?: any | null
  siteCaptureSessions?: any[]
  recentMessages?: Array<{
    id: string
    content?: string | null
    created_at: string
    type?: string | null
    file_url?: string | null
    mime_type?: string | null
    users?: {
      first_name?: string | null
      last_name?: string | null
      email?: string | null
    } | null
  }>
  latestCaptureStageResult?: {
    detected_stage?: HomeownerVisualStage | null
    confidence?: number | null
    summary?: string | null
  } | null
}

function SurfacePanel({
  eyebrow,
  title,
  subtitle,
  actions,
  children,
}: {
  eyebrow?: string
  title: string
  subtitle?: string
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-[20px] border border-zinc-800 bg-zinc-950">
      <div className="flex items-start justify-between gap-4 border-b border-zinc-800 bg-zinc-950 px-5 py-4">
        <div className="min-w-0">
          {eyebrow ? (
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
              {eyebrow}
            </div>
          ) : null}
          <div className="mt-1 text-lg font-semibold text-zinc-100">{title}</div>
          {subtitle ? <div className="mt-1 text-sm text-zinc-400">{subtitle}</div> : null}
        </div>

        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>

      <div className="p-5">{children}</div>
    </section>
  )
}

function MetricCard({
  label,
  value,
  meta,
  icon: Icon,
  tone = "default",
}: {
  label: string
  value: string
  meta: string
  icon: React.ComponentType<{ className?: string }>
  tone?: "default" | "primary" | "success" | "warning"
}) {
  const toneBorder =
    tone === "primary"
      ? "border-blue-500/25"
      : tone === "success"
        ? "border-emerald-500/25"
        : tone === "warning"
          ? "border-amber-500/25"
          : "border-zinc-800"

  const toneIcon =
    tone === "primary"
      ? "text-blue-300"
      : tone === "success"
        ? "text-emerald-300"
        : tone === "warning"
          ? "text-amber-300"
          : "text-zinc-200"

  const toneBar =
    tone === "primary"
      ? "bg-blue-400/70"
      : tone === "success"
        ? "bg-emerald-400/70"
        : tone === "warning"
          ? "bg-amber-400/70"
          : "bg-zinc-700"

  return (
    <div className={`relative overflow-hidden rounded-2xl border ${toneBorder} bg-zinc-950`}>
      <div className={`absolute inset-x-0 top-0 h-px ${toneBar}`} />
      <div className="flex items-start justify-between gap-4 p-5">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            {label}
          </div>
          <div className="mt-3 text-[30px] font-semibold tracking-[-0.04em] text-zinc-50">
            {value}
          </div>
          <div className="mt-2 text-xs text-zinc-400">{meta}</div>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-800 bg-black">
          <Icon className={`h-5 w-5 ${toneIcon}`} />
        </div>
      </div>
    </div>
  )
}

function ProgressBar({
  label,
  percent,
}: {
  label: string
  percent: number
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-zinc-300">{label}</span>
        <span className="font-medium text-zinc-100">{percent}%</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-zinc-900">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 via-sky-400 to-emerald-400 transition-all duration-700"
          style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
        />
      </div>
    </div>
  )
}

function StagePill({
  label,
  active = false,
}: {
  label: string
  active?: boolean
}) {
  return (
    <div
      className={
        active
          ? "rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-blue-200"
          : "rounded-full border border-zinc-800 bg-black px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500"
      }
    >
      {label}
    </div>
  )
}

function RecentMessages({
  recentMessages = [],
}: {
  recentMessages?: HomeownerProjectDashboardProps["recentMessages"]
}) {
  if (!recentMessages?.length) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-black px-4 py-10 text-center text-sm text-zinc-500">
        No recent messages yet.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {recentMessages.map((message) => {
        const sender = message.users
        const senderName =
          sender?.first_name && sender?.last_name
            ? `${sender.first_name} ${sender.last_name}`
            : sender?.email || "Project Team"

        const preview =
          message.content && message.content.length > 140
            ? `${message.content.slice(0, 140)}...`
            : message.content || "Attachment sent."

        const hasImage = !!message.file_url && message.mime_type?.startsWith("image/")

        return (
          <div key={message.id} className="rounded-2xl border border-zinc-800 bg-black p-4">
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950">
                <Users className="h-4 w-4 text-zinc-300" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-zinc-100">{senderName}</div>
                <div className="mt-1 text-sm text-zinc-400">{preview}</div>
                <div className="mt-2 text-xs text-zinc-500">
                  {formatDateLong(message.created_at)}
                </div>
              </div>

              {hasImage ? (
                <img
                  src={message.file_url || "/placeholder.svg"}
                  alt="Project message attachment"
                  className="h-14 w-14 rounded-xl border border-zinc-800 object-cover"
                />
              ) : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function LatestUpdateCard({ update }: { update: ProjectUpdate | null }) {
  if (!update) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-black px-4 py-10 text-center text-sm text-zinc-500">
        No published update yet.
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-black p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
          {update.type.replaceAll("_", " ")}
        </span>
        <span className="rounded-full border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
          {formatDateLong(update.published_at || update.created_at)}
        </span>
      </div>

      <div className="mt-3 text-base font-semibold text-zinc-100">{update.title}</div>

      {update.homeowner_summary ? (
        <div className="mt-3 text-sm leading-6 text-zinc-300">
          {update.homeowner_summary}
        </div>
      ) : null}

      {update.requires_homeowner_action ? (
        <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-200">
          Action is currently needed from you.
        </div>
      ) : null}
    </div>
  )
}

const BUILD_STAGE_SEQUENCE: Array<{
  key: HomeownerVisualStage
  label: string
}> = [
  { key: "site_prep", label: "Site Prep" },
  { key: "excavation", label: "Excavation" },
  { key: "footings", label: "Footings" },
  { key: "foundation", label: "Foundation" },
  { key: "framing", label: "Framing" },
  { key: "roofing", label: "Roofing" },
  { key: "enclosed", label: "Enclosed" },
  { key: "rough_in", label: "Rough-In" },
  { key: "insulation", label: "Insulation" },
  { key: "drywall", label: "Drywall" },
  { key: "interior_finish", label: "Interior Finish" },
  { key: "cabinetry", label: "Cabinetry" },
  { key: "flooring", label: "Flooring" },
  { key: "punch_list", label: "Punch List" },
  { key: "complete", label: "Complete" },
]

function getStageIndex(stage: HomeownerVisualStage) {
  return BUILD_STAGE_SEQUENCE.findIndex((item) => item.key === stage)
}

function getNextStage(stage: HomeownerVisualStage) {
  const currentIndex = getStageIndex(stage)
  if (currentIndex === -1) return null
  return BUILD_STAGE_SEQUENCE[currentIndex + 1] || null
}

function BuildStageTracker({ currentStage }: { currentStage: HomeownerVisualStage }) {
  const currentIndex = getStageIndex(currentStage)
  const nextStage = getNextStage(currentStage)

  return (
    <div className="mt-5 rounded-[24px] border border-zinc-800 bg-black/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Build Stage Timeline
          </div>
          <div className="mt-1 text-sm font-medium text-zinc-100">
            Current Stage:{" "}
            <span className="text-sky-300">
              {BUILD_STAGE_SEQUENCE[currentIndex]?.label || "Site Prep"}
            </span>
          </div>
          {nextStage ? (
            <div className="mt-1 text-xs text-zinc-400">
              Up Next: {nextStage.label}
            </div>
          ) : (
            <div className="mt-1 text-xs text-emerald-300">
              All major stages complete
            </div>
          )}
        </div>

        <div className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
          {Math.max(currentIndex + 1, 1)} / {BUILD_STAGE_SEQUENCE.length}
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <div className="flex min-w-[980px] items-start gap-2 pb-2">
          {BUILD_STAGE_SEQUENCE.map((stage, index) => {
            const isCompleted = index < currentIndex
            const isCurrent = index === currentIndex
            const isUpcoming = index > currentIndex

            return (
              <div key={stage.key} className="flex min-w-[120px] flex-1 items-center gap-2">
                <div className="flex flex-1 flex-col">
                  <div
                    className={[
                      "rounded-xl border px-3 py-3 text-center transition-all",
                      isCurrent
                        ? "border-sky-500/40 bg-sky-500/15 text-sky-100"
                        : isCompleted
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
                          : "border-zinc-800 bg-zinc-950 text-zinc-500",
                    ].join(" ")}
                  >
                    <div className="text-[10px] font-semibold uppercase tracking-[0.14em]">
                      {isCurrent ? "Current" : isCompleted ? "Done" : "Upcoming"}
                    </div>
                    <div className="mt-1 text-sm font-medium">{stage.label}</div>
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <div
                      className={[
                        "h-2 w-2 rounded-full",
                        isCurrent
                          ? "bg-sky-400"
                          : isCompleted
                            ? "bg-emerald-400"
                            : "bg-zinc-700",
                      ].join(" ")}
                    />
                    <div
                      className={[
                        "h-[2px] flex-1",
                        index < currentIndex
                          ? "bg-emerald-400/70"
                          : index === currentIndex
                            ? "bg-sky-400/70"
                            : "bg-zinc-800",
                      ].join(" ")}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function HomeownerProjectDashboard({
  projectId,
  project,
  houseModelSchema,
  siteCaptureSessions = [],
  recentMessages = [],
  latestCaptureStageResult
}: HomeownerProjectDashboardProps) {
  const { loading, error, refresh, refreshing, dashboardData } =
    useHomeownerDashboard(projectId)
      const resolvedVisualStage =
    latestCaptureStageResult?.detected_stage || dashboardData.currentVisualStage

  const location = [project.address, project.city, project.state].filter(Boolean).join(", ")

  const resolvedSchema =
    houseModelSchema && Object.keys(houseModelSchema).length > 0
      ? houseModelSchema
      : createSimpleRectHouseSchema({
          width: 42,
          depth: 30,
          levels: 1,
          wallHeight: 10,
          roofType: "gable",
          foundationType: "slab",
        })

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-48 animate-pulse rounded-[24px] border border-zinc-800 bg-zinc-950" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-950" />
          ))}
        </div>
        <div className="h-[340px] animate-pulse rounded-[24px] border border-zinc-800 bg-zinc-950" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-4 text-sm text-red-200">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[28px] border border-zinc-800 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_30%),linear-gradient(to_bottom_right,rgba(24,24,27,1),rgba(9,9,11,1))]">
        <div className="grid gap-6 p-6 xl:grid-cols-[1.15fr_0.85fr] xl:p-7">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
              Home Build Dashboard
            </div>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
              {project.name || "Your Project"}
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300 md:text-base">
              {dashboardData.currentWorkSummary}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <StagePill label={dashboardData.currentPhaseLabel} active />
              <StagePill label={dashboardData.currentVisualStage.replaceAll("_", " ")} />
              {project.project_type ? <StagePill label={project.project_type} /> : null}
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-zinc-800 bg-black/60 p-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Estimated Completion
                </div>
                <div className="mt-2 text-lg font-semibold text-zinc-100">
                  {dashboardData.projectedFinishLabel}
                </div>
                <div className="mt-1 text-xs text-zinc-500">
                  Based on the current project schedule
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-black/60 p-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Next Milestone
                </div>
                <div className="mt-2 text-lg font-semibold text-zinc-100">
                  {dashboardData.nextMilestone || "To be scheduled"}
                </div>
                <div className="mt-1 text-xs text-zinc-500">
                  Upcoming major activity on your build
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-zinc-800 bg-black/50 p-5 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Progress Snapshot
                </div>
                <div className="mt-1 text-lg font-semibold text-zinc-100">
                  {dashboardData.currentPhaseLabel}
                </div>
              </div>

              <button
                type="button"
                onClick={() => void refresh()}
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm font-medium text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-100"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>

            <div className="mt-6 space-y-5">
              <ProgressBar
                label="Task Completion"
                percent={dashboardData.percentComplete}
              />
              <ProgressBar
                label="Weighted Build Progress"
                percent={dashboardData.weightedPercentComplete}
              />

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    Tasks
                  </div>
                  <div className="mt-1 text-sm font-semibold text-zinc-100">
                    {dashboardData.completedTasks}/{dashboardData.totalTasks}
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    In Progress
                  </div>
                  <div className="mt-1 text-sm font-semibold text-zinc-100">
                    {dashboardData.inProgressTasks}
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    Action Items
                  </div>
                  <div className="mt-1 text-sm font-semibold text-zinc-100">
                    {dashboardData.homeownerActionsCount}
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    Schedule Risks
                  </div>
                  <div className="mt-1 text-sm font-semibold text-zinc-100">
                    {dashboardData.blockedItemsCount}
                  </div>
                </div>
              </div>

              {location ? (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-400">
                  {location}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Build Progress"
          value={`${dashboardData.weightedPercentComplete}%`}
          meta="Weighted by phase importance"
          icon={Hammer}
          tone="primary"
        />
        <MetricCard
          label="Projected Finish"
          value={dashboardData.projectedFinish ? formatDateShort(dashboardData.projectedFinish) : "TBD"}
          meta="Current schedule estimate"
          icon={CalendarRange}
          tone="success"
        />
        <MetricCard
          label="Action Items"
          value={String(dashboardData.homeownerActionsCount)}
          meta={
            dashboardData.overdueActionsCount > 0
              ? `${dashboardData.overdueActionsCount} overdue`
              : "Nothing overdue"
          }
          icon={AlertTriangle}
          tone={dashboardData.homeownerActionsCount > 0 ? "warning" : "default"}
        />
        <MetricCard
          label="Published Updates"
          value={String(dashboardData.publishedUpdates.length)}
          meta="Recent communications from your team"
          icon={CheckCircle2}
          tone="default"
        />
      </div>

     <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
  <div>
  <PlanModelPanel
  projectName={project.name}
  stage={resolvedVisualStage}
  schema={resolvedSchema}
/>

  <BuildStageTracker currentStage={resolvedVisualStage} />
</div>

  <SurfacePanel
    eyebrow="Current Status"
    title="Latest Published Update"
    subtitle="The newest homeowner-facing summary from your project team."
  >
    <LatestUpdateCard update={dashboardData.latestPublishedUpdate} />
  </SurfacePanel>
</div>

<SiteCapturePanel sessions={siteCaptureSessions} />

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <SurfacePanel
          eyebrow="What Needs Your Attention"
          title="Homeowner Action Center"
          subtitle="Approvals, selections, and decisions that may be needed to keep the project moving."
        >
          {dashboardData.homeownerActions.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-black px-4 py-10 text-center text-sm text-zinc-500">
              No homeowner action items right now.
            </div>
          ) : (
            <div className="space-y-3">
              {dashboardData.homeownerActions.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-zinc-800 bg-black p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-zinc-100">{item.name}</div>
                      <div className="mt-1 text-xs text-zinc-500">
                        {item.phase.replaceAll("_", " ")}
                        {item.due_date ? ` • Due ${formatDateLong(item.due_date)}` : ""}
                      </div>
                    </div>

                    {item.is_critical ? (
                      <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-200">
                        Critical Path
                      </span>
                    ) : null}
                  </div>

                  {(item.homeowner_action_text || item.homeowner_visible_note) ? (
                    <div className="mt-3 text-sm leading-6 text-zinc-300">
                      {item.homeowner_action_text || item.homeowner_visible_note}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </SurfacePanel>

        <SurfacePanel
          eyebrow="Milestones"
          title="Phase Timeline"
          subtitle="Major construction phases and where your project currently stands."
        >
          <div className="space-y-3">
            {dashboardData.timelineMilestones.map((milestone) => {
              const tone =
                milestone.status === "completed"
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                  : milestone.status === "in_progress"
                    ? "border-blue-500/20 bg-blue-500/10 text-blue-200"
                    : "border-zinc-800 bg-black text-zinc-300"

              return (
                <div
                  key={milestone.id}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-black px-4 py-3"
                >
                  <div>
                    <div className="text-sm font-semibold text-zinc-100">
                      {milestone.label}
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
                      {milestone.targetDate
                        ? `Target finish ${formatDateLong(milestone.targetDate)}`
                        : "Schedule date pending"}
                    </div>
                  </div>

                  <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${tone}`}>
                    {milestone.status.replaceAll("_", " ")}
                  </span>
                </div>
              )
            })}
          </div>
        </SurfacePanel>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <SurfacePanel
          eyebrow="Project Updates"
          title="Published Updates"
          subtitle="Review the latest project communications shared with you."
        >
          <PublishedProjectUpdates updates={dashboardData.publishedUpdates} />
        </SurfacePanel>

        <SurfacePanel
          eyebrow="Messages"
          title="Recent Messages"
          subtitle="Latest communication and attachments from your project team."
        >
          <RecentMessages recentMessages={recentMessages} />
        </SurfacePanel>
      </div>

      <SurfacePanel
        eyebrow="Phase Detail"
        title="Phase Progress"
        subtitle="Completion by major construction phase."
      >
        <div className="grid gap-3 md:grid-cols-2">
          {dashboardData.phaseProgress.map((phase) => (
            <div key={phase.phase} className="rounded-2xl border border-zinc-800 bg-black p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-zinc-100">{phase.label}</div>
                <span
                  className={
                    phase.active
                      ? "rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-blue-200"
                      : "rounded-full border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400"
                  }
                >
                  {phase.active ? "Active" : "Phase"}
                </span>
              </div>

              <ProgressBar label={`${phase.completed} of ${phase.total} tasks complete`} percent={phase.percent} />
            </div>
          ))}
        </div>
      </SurfacePanel>
    </div>
  )
}