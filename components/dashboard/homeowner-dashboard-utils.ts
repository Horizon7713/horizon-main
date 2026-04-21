"use client"

import {
  HomeownerActionItem,
  ProjectUpdate,
  Task,
} from "@/components/projects/tasks/task-types"

export type HomeownerVisualStage =
  | "site_prep"
  | "excavation"
  | "footings"
  | "foundation"
  | "framing"
  | "roofing"
  | "enclosed"
  | "rough_in"
  | "insulation"
  | "drywall"
  | "interior_finish"
  | "cabinetry"
  | "flooring"
  | "punch_list"
  | "complete"

export interface HomeownerDashboardData {
  percentComplete: number
  weightedPercentComplete: number
  currentPhaseLabel: string
  currentVisualStage: HomeownerVisualStage
  currentWorkSummary: string
  nextMilestone: string | null
  projectedFinish: string | null
  projectedFinishLabel: string
  homeownerActionsCount: number
  homeownerActions: HomeownerActionItem[]
  overdueActionsCount: number
  criticalItemsCount: number
  blockedItemsCount: number
  completedTasks: number
  totalTasks: number
  inProgressTasks: number
  publishedUpdates: ProjectUpdate[]
  latestPublishedUpdate: ProjectUpdate | null
  timelineMilestones: {
    id: string
    label: string
    phase: string
    status: "completed" | "in_progress" | "upcoming"
    targetDate: string | null
  }[]
  phaseProgress: {
    phase: string
    label: string
    total: number
    completed: number
    percent: number
    active: boolean
  }[]
}

type MinimalTaskLike = {
  id?: string
  name?: string | null
  phase?: string | null
  status?: string | null
  description?: string | null
  sort_order?: number | null
}

function normalizeStageSource(value?: string | null) {
  return (value || "").toLowerCase().trim()
}

function matchesAny(value: string, candidates: string[]) {
  return candidates.some((candidate) => value.includes(candidate))
}

function mapTaskToVisualStage(task: MinimalTaskLike): HomeownerVisualStage | null {
  const phase = normalizeStageSource(task.phase)
  const name = normalizeStageSource(task.name)
  const description = normalizeStageSource(task.description)
  const combined = `${phase} ${name} ${description}`

  if (
    matchesAny(combined, [
      "site prep",
      "siteprep",
      "demo",
      "demolition",
      "clearing",
      "grading",
      "erosion",
      "layout",
      "survey",
      "staking",
    ])
  ) {
    return "site_prep"
  }

  if (
    matchesAny(combined, [
      "excavat",
      "dig",
      "cut/fill",
      "cut fill",
      "overdig",
      "pad prep",
    ])
  ) {
    return "excavation"
  }

  if (
    matchesAny(combined, [
      "footing",
      "spread footing",
      "strip footing",
      "rebar footing",
      "form footing",
    ])
  ) {
    return "footings"
  }

  if (
    matchesAny(combined, [
      "foundation",
      "stem wall",
      "slab",
      "crawlspace",
      "basement wall",
      "pour wall",
      "concrete wall",
    ])
  ) {
    return "foundation"
  }

  if (
    matchesAny(combined, [
      "frame",
      "framing",
      "shear wall",
      "truss set",
      "floor deck",
      "joist",
      "wall framing",
    ])
  ) {
    return "framing"
  }

  if (
    matchesAny(combined, [
      "roof",
      "roofing",
      "dry in",
      "dry-in",
      "underlayment",
      "shingle",
      "tile roof",
    ])
  ) {
    return "roofing"
  }

  if (
    matchesAny(combined, [
      "window",
      "doors",
      "exterior door",
      "garage door",
      "weather barrier",
      "house wrap",
      "sheathing complete",
      "exterior shell",
      "enclosed",
    ])
  ) {
    return "enclosed"
  }

  if (
    matchesAny(combined, [
      "rough in",
      "rough-in",
      "rough electrical",
      "rough plumbing",
      "rough hvac",
      "mechanical rough",
      "electrical rough",
      "plumbing rough",
    ])
  ) {
    return "rough_in"
  }

  if (
    matchesAny(combined, [
      "insulation",
      "batt",
      "blown in",
      "spray foam",
    ])
  ) {
    return "insulation"
  }

  if (
    matchesAny(combined, [
      "drywall",
      "sheetrock",
      "tape texture",
      "texture",
    ])
  ) {
    return "drywall"
  }

  if (
    matchesAny(combined, [
      "paint",
      "trim",
      "interior door",
      "finish carpentry",
      "millwork",
      "interior finish",
    ])
  ) {
    return "interior_finish"
  }

  if (
    matchesAny(combined, [
      "cabinet",
      "cabinetry",
      "vanity install",
      "casework",
    ])
  ) {
    return "cabinetry"
  }

  if (
    matchesAny(combined, [
      "flooring",
      "tile",
      "lvp",
      "wood floor",
      "carpet",
      "floor finish",
    ])
  ) {
    return "flooring"
  }

  if (
    matchesAny(combined, [
      "punch",
      "punch list",
      "touch up",
      "touch-up",
      "final clean",
      "final inspection",
      "closeout",
    ])
  ) {
    return "punch_list"
  }

  if (
    matchesAny(combined, [
      "complete",
      "completion",
      "certificate of occupancy",
      "co",
      "substantial completion",
      "handoff",
      "turnover",
    ])
  ) {
    return "complete"
  }

  return null
}

const VISUAL_STAGE_ORDER: HomeownerVisualStage[] = [
  "site_prep",
  "excavation",
  "footings",
  "foundation",
  "framing",
  "roofing",
  "enclosed",
  "rough_in",
  "insulation",
  "drywall",
  "interior_finish",
  "cabinetry",
  "flooring",
  "punch_list",
  "complete",
]

function getStageRank(stage: HomeownerVisualStage | null) {
  if (!stage) return -1
  return VISUAL_STAGE_ORDER.indexOf(stage)
}

export function deriveVisualStageFromTasks(tasks: MinimalTaskLike[]): HomeownerVisualStage {
  if (!tasks || tasks.length === 0) return "site_prep"

  const sortedTasks = [...tasks].sort((a, b) => {
    const aOrder = a.sort_order ?? 0
    const bOrder = b.sort_order ?? 0
    return aOrder - bOrder
  })

  const completedStages = sortedTasks
    .filter((task) => task.status === "completed")
    .map(mapTaskToVisualStage)
    .filter(Boolean) as HomeownerVisualStage[]

  const activeStages = sortedTasks
    .filter((task) =>
      task.status === "in_progress" ||
      task.status === "blocked" ||
      task.status === "not_started"
    )
    .map(mapTaskToVisualStage)
    .filter(Boolean) as HomeownerVisualStage[]

  const furthestCompleted = completedStages.reduce<HomeownerVisualStage | null>((best, stage) => {
    return getStageRank(stage) > getStageRank(best) ? stage : best
  }, null)

  const earliestActive = activeStages.reduce<HomeownerVisualStage | null>((best, stage) => {
    if (!best) return stage
    return getStageRank(stage) < getStageRank(best) ? stage : best
  }, null)

  if (earliestActive) return earliestActive
  if (furthestCompleted) return furthestCompleted

  const inferred = sortedTasks
    .map(mapTaskToVisualStage)
    .filter(Boolean) as HomeownerVisualStage[]

  return inferred[0] || "site_prep"
}

const PHASE_LABELS: Record<string, string> = {
  sitework: "Sitework",
  foundation: "Foundation",
  framing: "Framing",
  roofing: "Roofing",
  exterior: "Exterior",
  rough_in: "Rough In",
  insulation: "Insulation",
  drywall: "Drywall",
  interior_finish: "Interior Finish",
  cabinetry: "Cabinetry",
  flooring: "Flooring",
  punch_list: "Punch List",
}

const PHASE_ORDER = [
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
]

const PHASE_WEIGHTS: Record<string, number> = {
  sitework: 0.06,
  foundation: 0.1,
  framing: 0.15,
  roofing: 0.08,
  exterior: 0.08,
  rough_in: 0.16,
  insulation: 0.05,
  drywall: 0.08,
  interior_finish: 0.12,
  cabinetry: 0.04,
  flooring: 0.04,
  punch_list: 0.04,
}

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function parseDate(value?: string | null) {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export function formatDateLong(value?: string | null) {
  const d = parseDate(value)
  if (!d) return "TBD"

  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function formatDateShort(value?: string | null) {
  const d = parseDate(value)
  if (!d) return "—"

  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })
}

function normalizeText(value?: string | null) {
  return String(value || "").trim().toLowerCase()
}

function taskMatchesName(task: Task, patterns: RegExp[]) {
  const haystack = `${task.name || ""} ${task.description || ""}`.toLowerCase()
  return patterns.some((pattern) => pattern.test(haystack))
}

function getPhaseLabel(phase: string) {
  return PHASE_LABELS[phase] || phase.replaceAll("_", " ")
}

function getPhaseIndex(phase: string) {
  const idx = PHASE_ORDER.indexOf(phase)
  return idx === -1 ? 999 : idx
}

function isTaskBlocked(task: Task, tasks: Task[]) {
  if (task.status === "blocked") return true
  if (!task.depends_on?.length) return false

  return task.depends_on.some((depId) => {
    const depTask = tasks.find((t) => t.id === depId)
    return !!depTask && depTask.status !== "completed"
  })
}

function isOverdue(date?: string | null) {
  const due = parseDate(date)
  if (!due) return false
  return due.getTime() < startOfToday().getTime()
}

function buildHomeownerActionItems(tasks: Task[]): HomeownerActionItem[] {
  return tasks
    .filter((task) => !!task.requires_homeowner_action)
    .map((task) => ({
      id: task.id,
      name: task.name,
      phase: task.phase,
      due_date: task.due_date,
      planned_start: task.planned_start,
      planned_end: task.planned_end,
      homeowner_action_text: task.homeowner_action_text,
      homeowner_visible_note: task.homeowner_visible_note,
      is_critical: task.is_critical,
      total_float_days: task.total_float_days,
      blocker_reason: task.blocker_reason,
      blocker_note: task.blocker_note,
    }))
    .sort((a, b) => {
      const aDate = parseDate(a.due_date)?.getTime() ?? Number.MAX_SAFE_INTEGER
      const bDate = parseDate(b.due_date)?.getTime() ?? Number.MAX_SAFE_INTEGER
      return aDate - bDate
    })
}

function getCurrentVisualStage(tasks: Task[]): HomeownerVisualStage {
  const inProgress = tasks.filter((t) => t.status === "in_progress")
  const completed = tasks.filter((t) => t.status === "completed")

  const hasInProgressPhase = (phase: string) =>
    inProgress.some((t) => normalizeText(t.phase) === phase)

  if (
    inProgress.some((task) =>
      taskMatchesName(task, [
        /footing/,
        /footings/,
        /form footings/,
        /pour footings/,
        /spread footing/,
      ]),
    )
  ) {
    return "footings"
  }

  if (
    completed.some((task) =>
      taskMatchesName(task, [/excavat/, /dig/, /grading/, /site prep/]),
    ) &&
    !completed.some((task) => normalizeText(task.phase) === "foundation")
  ) {
    return "excavation"
  }

  if (hasInProgressPhase("foundation")) return "foundation"
  if (hasInProgressPhase("framing")) return "framing"
  if (hasInProgressPhase("roofing")) return "roofing"
  if (hasInProgressPhase("exterior")) return "enclosed"
  if (hasInProgressPhase("rough_in")) return "rough_in"
  if (hasInProgressPhase("insulation")) return "insulation"
  if (hasInProgressPhase("drywall")) return "drywall"
  if (hasInProgressPhase("interior_finish")) return "interior_finish"
  if (hasInProgressPhase("cabinetry")) return "cabinetry"
  if (hasInProgressPhase("flooring")) return "flooring"
  if (hasInProgressPhase("punch_list")) return "punch_list"

  const allDone =
    tasks.length > 0 && tasks.every((task) => task.status === "completed")
  if (allDone) return "complete"

  const furthestCompletedPhase = [...completed]
    .sort((a, b) => getPhaseIndex(b.phase) - getPhaseIndex(a.phase))
    .find((task) => PHASE_ORDER.includes(task.phase))

  if (!furthestCompletedPhase) return "site_prep"

  switch (furthestCompletedPhase.phase) {
    case "sitework":
      return "excavation"
    case "foundation":
      return "foundation"
    case "framing":
      return "framing"
    case "roofing":
      return "roofing"
    case "exterior":
      return "enclosed"
    case "rough_in":
      return "rough_in"
    case "insulation":
      return "insulation"
    case "drywall":
      return "drywall"
    case "interior_finish":
      return "interior_finish"
    case "cabinetry":
      return "cabinetry"
    case "flooring":
      return "flooring"
    case "punch_list":
      return "punch_list"
    default:
      return "site_prep"
  }
}

function buildPhaseProgress(tasks: Task[]) {
  return PHASE_ORDER.map((phase) => {
    const phaseTasks = tasks.filter((task) => task.phase === phase)
    const completed = phaseTasks.filter((task) => task.status === "completed").length
    const total = phaseTasks.length
    const active = phaseTasks.some((task) => task.status === "in_progress")

    return {
      phase,
      label: getPhaseLabel(phase),
      total,
      completed,
      percent: total === 0 ? 0 : Math.round((completed / total) * 100),
      active,
    }
  }).filter((item) => item.total > 0)
}

function buildWeightedPercent(tasks: Task[]) {
  const phaseProgress = buildPhaseProgress(tasks)

  if (phaseProgress.length === 0) return 0

  let totalWeight = 0
  let earnedWeight = 0

  for (const phase of phaseProgress) {
    const weight = PHASE_WEIGHTS[phase.phase] ?? 0.05
    totalWeight += weight
    earnedWeight += weight * (phase.percent / 100)
  }

  if (totalWeight === 0) return 0
  return Math.max(0, Math.min(100, Math.round((earnedWeight / totalWeight) * 100)))
}

function buildCurrentWorkSummary(tasks: Task[], updates: ProjectUpdate[]) {
  const activeTasks = tasks
    .filter((task) => task.status === "in_progress")
    .sort((a, b) => getPhaseIndex(a.phase) - getPhaseIndex(b.phase))

  if (activeTasks.length > 0) {
    const task = activeTasks[0]
    const phaseLabel = getPhaseLabel(task.phase)

    if (task.homeowner_visible_note) {
      return `${phaseLabel}: ${task.homeowner_visible_note}`
    }

    if (task.description) {
      return `${phaseLabel}: ${task.description}`
    }

    return `Currently working on ${task.name} in ${phaseLabel}.`
  }

  const latestPublished = updates.find((u) => u.is_published) || null
  if (latestPublished?.homeowner_summary) {
    return latestPublished.homeowner_summary
  }

  return "Your project is moving forward. Check the phase tracker below for the latest status."
}

function buildNextMilestone(tasks: Task[]) {
  const upcoming = tasks
    .filter((task) => task.status !== "completed")
    .sort((a, b) => {
      const aStart = parseDate(a.planned_start)?.getTime() ?? Number.MAX_SAFE_INTEGER
      const bStart = parseDate(b.planned_start)?.getTime() ?? Number.MAX_SAFE_INTEGER
      if (aStart !== bStart) return aStart - bStart
      return getPhaseIndex(a.phase) - getPhaseIndex(b.phase)
    })

  if (upcoming.length === 0) return null

  const next = upcoming[0]
  return next.name
}

function buildProjectedFinish(tasks: Task[]) {
  const scheduled = tasks
    .map((task) => parseDate(task.planned_end))
    .filter((d): d is Date => !!d)

  if (scheduled.length === 0) return null

  const latest = new Date(Math.max(...scheduled.map((d) => d.getTime())))
  return latest.toISOString()
}

function buildTimelineMilestones(tasks: Task[]) {
  const result = PHASE_ORDER.map((phase) => {
    const phaseTasks = tasks.filter((task) => task.phase === phase)
    if (phaseTasks.length === 0) return null

    const completed = phaseTasks.every((task) => task.status === "completed")
    const inProgress = phaseTasks.some((task) => task.status === "in_progress")

    const phaseEndDates = phaseTasks
      .map((task) => parseDate(task.planned_end)?.getTime())
      .filter((v): v is number => typeof v === "number")

    const targetDate =
      phaseEndDates.length > 0 ? new Date(Math.max(...phaseEndDates)).toISOString() : null

    return {
      id: phase,
      label: getPhaseLabel(phase),
      phase,
      status: completed
        ? ("completed" as const)
        : inProgress
          ? ("in_progress" as const)
          : ("upcoming" as const),
      targetDate,
    }
  }).filter(Boolean) as {
    id: string
    label: string
    phase: string
    status: "completed" | "in_progress" | "upcoming"
    targetDate: string | null
  }[]

  return result
}

export function buildHomeownerDashboardData(
  tasks: Task[],
  updates: ProjectUpdate[],
): HomeownerDashboardData {
  const publishedUpdates = [...updates]
    .filter((u) => u.is_published)
    .sort((a, b) => {
      const aDate = parseDate(a.published_at || a.created_at)?.getTime() ?? 0
      const bDate = parseDate(b.published_at || b.created_at)?.getTime() ?? 0
      return bDate - aDate
    })

  const homeownerActions = buildHomeownerActionItems(tasks)
  const completedTasks = tasks.filter((t) => t.status === "completed").length
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress").length
  const blockedItemsCount = tasks.filter((t) => isTaskBlocked(t, tasks)).length
  const criticalItemsCount = tasks.filter((t) => !!t.is_critical).length
  const overdueActionsCount = homeownerActions.filter((item) => isOverdue(item.due_date)).length
  const totalTasks = tasks.length

  const rawPercent =
    totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100)

  const weightedPercentComplete = buildWeightedPercent(tasks)
  const latestPublishedUpdate = publishedUpdates[0] || null
  const currentVisualStage = deriveVisualStageFromTasks(tasks)

  const activePhaseTask =
    tasks
      .filter((t) => t.status === "in_progress")
      .sort((a, b) => getPhaseIndex(a.phase) - getPhaseIndex(b.phase))[0] ||
    tasks
      .filter((t) => t.status === "completed")
      .sort((a, b) => getPhaseIndex(b.phase) - getPhaseIndex(a.phase))[0] ||
    null

  const currentPhaseLabel = activePhaseTask
    ? getPhaseLabel(activePhaseTask.phase)
    : "Pre-Construction"

  const projectedFinish = buildProjectedFinish(tasks)

  return {
    percentComplete: rawPercent,
    weightedPercentComplete,
    currentPhaseLabel,
    currentVisualStage,
    currentWorkSummary: buildCurrentWorkSummary(tasks, publishedUpdates),
    nextMilestone: buildNextMilestone(tasks),
    projectedFinish,
    projectedFinishLabel: projectedFinish ? formatDateLong(projectedFinish) : "TBD",
    homeownerActionsCount: homeownerActions.length,
    homeownerActions,
    overdueActionsCount,
    criticalItemsCount,
    blockedItemsCount,
    completedTasks,
    totalTasks,
    inProgressTasks,
    publishedUpdates,
    latestPublishedUpdate,
    timelineMilestones: buildTimelineMilestones(tasks),
    phaseProgress: buildPhaseProgress(tasks),
  }
}