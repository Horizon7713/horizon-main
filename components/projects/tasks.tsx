"use client"

import { useMemo, useState } from "react"
import {
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  AlertTriangle,
  ClipboardList,
  Search,
  Sparkles,
  CalendarRange,
  Users,
} from "lucide-react"

import {
  reorderTasks,
  updateTask,
  buildSchedule,
} from "@/app/project_data/actions"

import {
  PHASE_OPTIONS,
  ProjectTasksProps,
  Task,
  TaskStatus,
  HomeownerActionItem,
  ProjectHealthBucketItem,
} from "./tasks/task-types"

import {
  calculateDurationDays,
  formatDateShort,
  getBarWidthDays,
  getDayOffset,
  getPhaseLabel,
  isOverdue,
  isTaskBlocked,
  needsAttention,
} from "./tasks/task-utils"

import { FormNewTask } from "@/components/form/form-newtask"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { TaskSummaryCards } from "./tasks/task-summary-cards"
import { TaskToolbar } from "./tasks/task-toolbar"
import { TaskBoardView } from "./tasks/task-board-view"
import { TaskTimelineView } from "./tasks/task-timeline-view"
import { GenerateTasksDialog } from "./tasks/generate-tasks-dialog"
import { EditTaskDialog } from "./tasks/edit-task-dialog"
import { useProjectTasks } from "./tasks/use-project-tasks"
import { ProjectUpdatesPanel } from "./tasks/project-updates-panel"
import { HomeownerActionCenter } from "./tasks/homeowner-action-center"
import { ProjectHealthCenter } from "./tasks/project-health-center"
import { ProjectCopilotPanel } from "./tasks/project-copilot-panel"
import { ProjectVisualAdminPanel } from "@/components/dashboard/project-visual-admin-panel"

function darkPill(
  tone:
    | "neutral"
    | "warning"
    | "danger"
    | "info"
    | "success"
    | "critical",
) {
  switch (tone) {
    case "warning":
      return "border-amber-500/20 bg-amber-500/10 text-amber-200"
    case "danger":
      return "border-red-500/20 bg-red-500/10 text-red-200"
    case "info":
      return "border-blue-500/20 bg-blue-500/10 text-blue-200"
    case "success":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
    case "critical":
      return "border-sky-500/20 bg-sky-500/10 text-sky-200"
    default:
      return "border-zinc-700 bg-zinc-900 text-zinc-300"
  }
}

export function ProjectTasks({ projectId, projectType }: ProjectTasksProps) {
  const [selectedPhase, setSelectedPhase] = useState("all")
  const [open, setOpen] = useState(false)

  const [editOpen, setEditOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [editData, setEditData] = useState<Partial<Task>>({})
  const [viewMode, setViewMode] = useState<"board" | "timeline">("board")
  const [showBlockedOnly, setShowBlockedOnly] = useState(false)
  const [showOverdueOnly, setShowOverdueOnly] = useState(false)
  const [showHomeownerActionOnly, setShowHomeownerActionOnly] = useState(false)
  const [showNeedsAttentionOnly, setShowNeedsAttentionOnly] = useState(false)
  const [showCriticalOnly, setShowCriticalOnly] = useState(false)
  const [assigneeFilter, setAssigneeFilter] = useState("all")
  const [uiMessage, setUiMessage] = useState<string | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [buildingSchedule, setBuildingSchedule] = useState(false)
  const [generateOpen, setGenerateOpen] = useState(false)

  const [showTaskTable, setShowTaskTable] = useState(true)
  const [taskSearch, setTaskSearch] = useState("")

  const {
    tasks,
    setTasks,
    loading,
    error,
    fetchTasks,
    generatedTasks,
    setGeneratedTasks,
    generating,
    insertingGenerated,
    generateMessage,
    setGenerateMessage,
    projectNotes,
    setProjectNotes,
    handleDelete,
    handleStatusUpdate,
    handleGenerateTasks,
    handleInsertGeneratedTasks,
  } = useProjectTasks({ projectId, projectType })

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  )

  const isBlocked = (task: Task) => isTaskBlocked(task, tasks)

  const recalculateSchedule = async (successMessage?: string) => {
    try {
      setBuildingSchedule(true)
      const result = await buildSchedule(projectId)

      if (!result?.success) {
        setUiMessage(result?.error || "Schedule recalculation failed.")
        return false
      }

      await fetchTasks()
      if (successMessage) {
        setUiMessage(successMessage)
      }
      return true
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Schedule recalculation failed."
      setUiMessage(message)
      return false
    } finally {
      setBuildingSchedule(false)
    }
  }

  const {
    total,
    completed,
    inProgress,
    blocked,
    overdueCount,
    homeownerActionCount,
    needsAttentionCount,
    criticalCount,
    blockedCriticalCount,
    percent,
  } = useMemo(() => {
    const total = tasks.length
    const completed = tasks.filter((t) => t.status === "completed").length
    const inProgress = tasks.filter((t) => t.status === "in_progress").length
    const blocked = tasks.filter((t) => t.status === "blocked").length
    const overdueCount = tasks.filter((t) => isOverdue(t.due_date)).length
    const homeownerActionCount = tasks.filter(
      (t) => !!t.requires_homeowner_action,
    ).length
    const needsAttentionCount = tasks.filter((t) => needsAttention(t, tasks)).length
    const criticalCount = tasks.filter((t) => !!t.is_critical).length
    const blockedCriticalCount = tasks.filter(
      (t) =>
        !!t.is_critical && (t.status === "blocked" || isTaskBlocked(t, tasks)),
    ).length
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100)

    return {
      total,
      completed,
      inProgress,
      blocked,
      overdueCount,
      homeownerActionCount,
      needsAttentionCount,
      criticalCount,
      blockedCriticalCount,
      percent,
    }
  }, [tasks])

  const criticalBlockers = useMemo(() => {
    return tasks
      .filter(
        (task) =>
          !!task.is_critical &&
          (task.status === "blocked" ||
            isBlocked(task) ||
            !!task.blocker_reason ||
            !!task.blocker_note),
      )
      .map(
        (task) =>
          ({
            id: task.id,
            name: task.name,
            phase: task.phase,
            status: task.status,
            due_date: task.due_date,
            planned_start: task.planned_start,
            planned_end: task.planned_end,
            homeowner_action_text: task.homeowner_action_text,
            blocker_reason: task.blocker_reason,
            blocker_note: task.blocker_note,
            is_critical: task.is_critical,
            total_float_days: task.total_float_days,
          }) satisfies ProjectHealthBucketItem,
      )
  }, [tasks])

  const overdueHomeownerActions = useMemo(() => {
    const today = new Date()
    const todayMidnight = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    ).getTime()

    return tasks
      .filter(
        (task) =>
          !!task.requires_homeowner_action &&
          !!task.due_date &&
          new Date(task.due_date).getTime() < todayMidnight,
      )
      .map(
        (task) =>
          ({
            id: task.id,
            name: task.name,
            phase: task.phase,
            status: task.status,
            due_date: task.due_date,
            planned_start: task.planned_start,
            planned_end: task.planned_end,
            homeowner_action_text: task.homeowner_action_text,
            homeownerVisibleNote: task.homeowner_visible_note ?? null,
            is_critical: task.is_critical,
            total_float_days: task.total_float_days,
          }) satisfies ProjectHealthBucketItem,
      )
  }, [tasks])

  const unscheduledBucketTasks = useMemo(() => {
    return tasks
      .filter((task) => !task.planned_start || !task.planned_end)
      .map(
        (task) =>
          ({
            id: task.id,
            name: task.name,
            phase: task.phase,
            status: task.status,
            due_date: task.due_date,
            planned_start: task.planned_start,
            planned_end: task.planned_end,
            is_critical: task.is_critical,
            total_float_days: task.total_float_days,
          }) satisfies ProjectHealthBucketItem,
      )
  }, [tasks])

  const lowFloatBucketTasks = useMemo(() => {
    return tasks
      .filter(
        (task) =>
          task.total_float_days != null &&
          Number(task.total_float_days) >= 0 &&
          Number(task.total_float_days) <= 2,
      )
      .map(
        (task) =>
          ({
            id: task.id,
            name: task.name,
            phase: task.phase,
            status: task.status,
            due_date: task.due_date,
            planned_start: task.planned_start,
            planned_end: task.planned_end,
            is_critical: task.is_critical,
            total_float_days: task.total_float_days,
            blocker_reason: task.blocker_reason,
            blocker_note: task.blocker_note,
          }) satisfies ProjectHealthBucketItem,
      )
  }, [tasks])

  const homeownerActionItems = useMemo(() => {
    return tasks
      .filter((task) => !!task.requires_homeowner_action)
      .map(
        (task) =>
          ({
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
          }) satisfies HomeownerActionItem,
      )
  }, [tasks])

  const handleStatus = async (id: string, status: TaskStatus) => {
    const task = tasks.find((t) => t.id === id)
    if (!task) return

    const blocked = isBlocked(task)

    if (blocked && (status === "in_progress" || status === "completed")) {
      setUiMessage("This task is blocked by dependencies.")
      return
    }

    if (status === "blocked" && !task.blocker_reason) {
      setUiMessage("Add a blocker reason in Edit Task before marking this task blocked.")
      openEdit(task)
      return
    }

    await handleStatusUpdate(id, status)
    await recalculateSchedule("Task updated and project timeline recalculated.")
  }

  const openEdit = (task: Task) => {
    setUiMessage(null)
    setEditingTask(task)
    setEditData(task)
    setEditOpen(true)
  }

  const saveEdit = async () => {
    if (!editingTask) return

    const normalizedEditData: Partial<Task> =
      editData.status === "blocked"
        ? editData
        : {
            ...editData,
            blocker_reason: null,
            blocker_note: null,
          }

    if (
      normalizedEditData.status === "blocked" &&
      !normalizedEditData.blocker_reason
    ) {
      setUiMessage("Blocked tasks require a blocker reason.")
      return
    }

    try {
      setSavingEdit(true)

      const result = await updateTask({
        taskId: editingTask.id,
        name: normalizedEditData.name,
        description: normalizedEditData.description ?? undefined,
        phase: normalizedEditData.phase,
        status: normalizedEditData.status,
        dueDate: normalizedEditData.due_date || undefined,
        assignedTo: normalizedEditData.assigned_to || undefined,
        assignedToName: normalizedEditData.assigned_to_name || undefined,
        dependsOn: normalizedEditData.depends_on || [],
        durationDays: normalizedEditData.duration_days ?? 1,
        lagDays: normalizedEditData.lag_days ?? 0,
        plannedStart: normalizedEditData.planned_start || undefined,
        plannedEnd: normalizedEditData.planned_end || undefined,
        lockedStartDate: normalizedEditData.locked_start_date || "",
        lockedEndDate: normalizedEditData.locked_end_date || "",
        trade: normalizedEditData.trade || "general",
        priority: normalizedEditData.priority || "medium",
        isInspection: normalizedEditData.is_inspection || false,
        durationMode: normalizedEditData.duration_mode || "fixed",
        productionRate: normalizedEditData.production_rate ?? null,
        quantityValue: normalizedEditData.quantity_value ?? null,
        quantitySource: normalizedEditData.quantity_source || "manual",
        minimumDurationDays: normalizedEditData.minimum_duration_days ?? 1,
        blockerReason: normalizedEditData.blocker_reason ?? null,
        blockerNote: normalizedEditData.blocker_note ?? null,
        requiresHomeownerAction: !!normalizedEditData.requires_homeowner_action,
        homeownerActionText: normalizedEditData.homeowner_action_text ?? null,
        homeownerVisibleNote: normalizedEditData.homeowner_visible_note ?? null,
      })

      if (!result.success) {
        setUiMessage(result.error || "Failed to save task changes.")
        return
      }

      const scheduleOk = await recalculateSchedule(
        "Task saved and project timeline recalculated.",
      )

      if (scheduleOk) {
        setEditOpen(false)
        setEditingTask(null)
      }
    } finally {
      setSavingEdit(false)
    }
  }

  const uniqueAssignees = useMemo(() => {
    return Array.from(
      new Set(tasks.map((t) => t.assigned_to_name).filter(Boolean)),
    ).sort() as string[]
  }, [tasks])

  const filteredTasks = useMemo(() => {
    const query = taskSearch.trim().toLowerCase()

    return tasks.filter((task) => {
      if (selectedPhase !== "all" && task.phase !== selectedPhase) return false
      if (showBlockedOnly && task.status !== "blocked" && !isBlocked(task)) return false
      if (showOverdueOnly && !isOverdue(task.due_date)) return false
      if (showHomeownerActionOnly && !task.requires_homeowner_action) return false
      if (showNeedsAttentionOnly && !needsAttention(task, tasks)) return false
      if (showCriticalOnly && !task.is_critical) return false
      if (assigneeFilter !== "all" && task.assigned_to_name !== assigneeFilter) {
        return false
      }

      if (!query) return true

      const haystack = [
        task.name,
        task.description,
        task.phase,
        task.status,
        task.assigned_to_name,
        task.trade,
        task.priority,
        task.homeowner_action_text,
        task.blocker_reason,
        task.blocker_note,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()

      return haystack.includes(query)
    })
  }, [
    tasks,
    taskSearch,
    selectedPhase,
    showBlockedOnly,
    showOverdueOnly,
    showHomeownerActionOnly,
    showNeedsAttentionOnly,
    showCriticalOnly,
    assigneeFilter,
  ])

  const tableTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      const phaseDiff = String(a.phase || "").localeCompare(String(b.phase || ""))
      if (phaseDiff !== 0) return phaseDiff

      const aStart = a.planned_start || "9999-12-31"
      const bStart = b.planned_start || "9999-12-31"
      if (aStart !== bStart) return aStart.localeCompare(bStart)

      return a.sort_order - b.sort_order
    })
  }, [filteredTasks])

  const grouped = useMemo(() => {
    const visiblePhases =
      selectedPhase === "all"
        ? PHASE_OPTIONS
        : PHASE_OPTIONS.filter((p) => p.value === selectedPhase)

    return visiblePhases.map((phase) => ({
      ...phase,
      tasks: filteredTasks
        .filter((t) => t.phase === phase.value)
        .sort((a, b) => a.sort_order - b.sort_order),
    }))
  }, [filteredTasks, selectedPhase])

  const {
    timelineTasks,
    timelineSpanDays,
    timelineDates,
    timelineStart,
  } = useMemo(() => {
    const timelineTasks = [...filteredTasks].sort((a, b) => {
      const aStart = a.planned_start || "9999-12-31"
      const bStart = b.planned_start || "9999-12-31"

      if (aStart !== bStart) return aStart.localeCompare(bStart)
      return a.sort_order - b.sort_order
    })

    const scheduledTasks = timelineTasks.filter(
      (task) => task.planned_start && task.planned_end,
    )

    const timelineStart =
      scheduledTasks.length > 0
        ? scheduledTasks
            .map((task) => new Date(task.planned_start as string).getTime())
            .reduce((min, value) => Math.min(min, value))
        : null

    const timelineEnd =
      scheduledTasks.length > 0
        ? scheduledTasks
            .map((task) => new Date(task.planned_end as string).getTime())
            .reduce((max, value) => Math.max(max, value))
        : null

    const timelineSpanDays =
      timelineStart !== null && timelineEnd !== null
        ? Math.max(
            1,
            Math.ceil((timelineEnd - timelineStart) / (1000 * 60 * 60 * 24)) + 1,
          )
        : 1

    const timelineDates: Date[] = []

    if (timelineStart !== null) {
      const start = new Date(timelineStart)

      for (let i = 0; i < timelineSpanDays; i++) {
        const d = new Date(start)
        d.setDate(start.getDate() + i)
        timelineDates.push(d)
      }
    }

    return {
      timelineTasks,
      timelineSpanDays,
      timelineDates,
      timelineStart,
    }
  }, [filteredTasks])

  const scheduleSummary = useMemo(() => {
    const scheduledTasks = tasks.filter(
      (task) => task.planned_start && task.planned_end,
    )
    const unscheduledTasks = tasks.filter(
      (task) => !task.planned_start || !task.planned_end,
    )
    const inspectionCount = tasks.filter((task) => !!task.is_inspection).length

    const projectedFinish =
      scheduledTasks.length > 0
        ? scheduledTasks
            .map((task) => new Date(task.planned_end as string).getTime())
            .reduce((max, value) => Math.max(max, value))
        : null

    return {
      scheduledCount: scheduledTasks.length,
      unscheduledCount: unscheduledTasks.length,
      inspectionCount,
      projectedFinish: projectedFinish ? new Date(projectedFinish) : null,
    }
  }, [tasks])

  const scheduleWarnings = useMemo(() => {
    const quantityDrivenMissingData = tasks.filter((task) => {
      const mode = task.duration_mode || "fixed"
      if (mode === "fixed" || task.is_inspection) return false

      const source = task.quantity_source || "manual"
      const hasManualQuantity =
        task.quantity_value != null && Number(task.quantity_value) > 0
      const hasRate =
        task.production_rate != null && Number(task.production_rate) > 0

      if (!hasRate) return true
      if (source === "manual" && !hasManualQuantity) return true

      return false
    })

    const tradeOverlapRisks = tasks.filter((task) => {
      if (!task.planned_start || !task.planned_end || !task.trade) return false

      return tasks.some((other) => {
        if (other.id === task.id) return false
        if (!other.planned_start || !other.planned_end) return false
        if ((other.trade || "general") !== (task.trade || "general")) return false

        const taskStart = task.planned_start
  ? new Date(task.planned_start).getTime()
  : Number.POSITIVE_INFINITY

const taskEnd = task.planned_end
  ? new Date(task.planned_end).getTime()
  : Number.POSITIVE_INFINITY
        const otherStart = new Date(other.planned_start).getTime()
        const otherEnd = new Date(other.planned_end).getTime()

        return taskStart <= otherEnd && otherStart <= taskEnd
      })
    })

    const unscheduledTasks = tasks.filter(
      (task) => !task.planned_start || !task.planned_end,
    )

    const lockedDateConflicts = tasks.filter((task) => {
      if (!task.locked_start_date) return false
      if (!task.depends_on || task.depends_on.length === 0) return false

      const latestDependencyEnd = task.depends_on
        .map((depId) => tasks.find((t) => t.id === depId)?.planned_end)
        .filter(Boolean)
        .map((date) => new Date(date as string).getTime())

      if (latestDependencyEnd.length === 0) return false

      const lockedStart = new Date(task.locked_start_date).getTime()
      const latestEnd = Math.max(...latestDependencyEnd)

      return lockedStart <= latestEnd
    })

    const fallbackDurationTasks = tasks.filter((task) => {
      const mode = task.duration_mode || "fixed"
      if (mode === "fixed" || task.is_inspection) return false

      const hasRate =
        task.production_rate != null && Number(task.production_rate) > 0
      const hasQuantity =
        task.quantity_value != null && Number(task.quantity_value) > 0

      return !(hasRate && hasQuantity)
    })

    return {
      quantityDrivenMissingData,
      tradeOverlapRisks,
      unscheduledTasks,
      lockedDateConflicts,
      fallbackDurationTasks,
    }
  }, [tasks])

  const getTimelineDayOffset = (dateString?: string | null) =>
    getDayOffset(timelineStart, dateString)

  const getTimelineBarWidthDays = (start?: string | null, end?: string | null) =>
    getBarWidthDays(start, end)

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const activeTask = tasks.find((t) => t.id === active.id)
    if (!activeTask) return

    let targetPhase = activeTask.phase
    const overTask = tasks.find((t) => t.id === over.id)

    if (overTask) {
      targetPhase = overTask.phase
    } else {
      const overId = String(over.id)
      if (overId.startsWith("phase:")) {
        targetPhase = overId.replace("phase:", "")
      }
    }

    const remainingTasks = tasks.filter((t) => t.id !== activeTask.id)
    const targetPhaseTasks = remainingTasks
      .filter((t) => t.phase === targetPhase)
      .sort((a, b) => a.sort_order - b.sort_order)

    let insertIndex = targetPhaseTasks.length

    if (overTask && overTask.phase === targetPhase) {
      insertIndex = targetPhaseTasks.findIndex((t) => t.id === overTask.id)
      if (insertIndex === -1) insertIndex = targetPhaseTasks.length
    }

    const movedTask: Task = {
      ...activeTask,
      phase: targetPhase,
    }

    const newTargetPhaseTasks = [...targetPhaseTasks]
    newTargetPhaseTasks.splice(insertIndex, 0, movedTask)

    const untouchedOtherPhaseTasks = remainingTasks.filter(
      (t) => t.phase !== targetPhase,
    )

    const updatedTasks = [
      ...untouchedOtherPhaseTasks,
      ...newTargetPhaseTasks.map((task, index) => ({
        ...task,
        sort_order: (index + 1) * 10,
      })),
    ]

    const sourcePhase = activeTask.phase

    if (sourcePhase !== targetPhase) {
      const sourcePhaseTasks = updatedTasks
        .filter((t) => t.phase === sourcePhase)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((task, index) => ({
          ...task,
          sort_order: (index + 1) * 10,
        }))

      const withoutSourcePhase = updatedTasks.filter((t) => t.phase !== sourcePhase)
      const finalTasks = [...withoutSourcePhase, ...sourcePhaseTasks]

      setTasks(finalTasks)

      const payload = finalTasks.map((t) => ({
        id: t.id,
        sortOrder: t.sort_order,
        phase: t.phase,
      }))

      await reorderTasks(payload)
      await recalculateSchedule("Task order changed and project timeline recalculated.")
      return
    }

    setTasks(updatedTasks)

    const payload = updatedTasks.map((t) => ({
      id: t.id,
      sortOrder: t.sort_order,
      phase: t.phase,
    }))

    await reorderTasks(payload)
    await recalculateSchedule("Task order changed and project timeline recalculated.")
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="h-5 w-40 animate-pulse rounded bg-zinc-800" />
          <div className="h-4 w-72 animate-pulse rounded bg-zinc-800" />
        </div>

        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-950"
            />
          ))}
        </div>

        <div className="h-[420px] animate-pulse rounded-2xl border border-zinc-800 bg-zinc-950" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-5 bg-transparent">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <div className="inline-flex items-center rounded-full border border-zinc-800 bg-black px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Project Management
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100 md:text-3xl">
            Project Tasks
          </h1>
          <p className="text-sm text-zinc-400 md:text-base">
            Track execution, blockers, schedule movement, and homeowner actions in one place.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-sm">
          <span className="rounded-full border border-zinc-800 bg-black px-3 py-1 text-zinc-400">
            {tasks.length} total tasks
          </span>
          <span className="rounded-full border border-zinc-800 bg-black px-3 py-1 text-zinc-400">
            {filteredTasks.length} visible
          </span>
        </div>
      </div>

      <TaskSummaryCards
        total={total}
        completed={completed}
        inProgress={inProgress}
        blocked={blocked}
        overdueCount={overdueCount}
        homeownerActionCount={homeownerActionCount}
        needsAttentionCount={needsAttentionCount}
        percent={percent}
      />

      {(blocked > 0 ||
        overdueCount > 0 ||
        homeownerActionCount > 0 ||
        blockedCriticalCount > 0) && (
        <div className="grid gap-3 lg:grid-cols-3">
          {blocked > 0 && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3">
              <div className="text-sm font-medium text-red-200">Blocked tasks</div>
              <div className="mt-1 text-sm text-red-300/90">
                {blocked} task{blocked !== 1 ? "s" : ""} currently blocked and may delay progress.
              </div>
            </div>
          )}

          {blockedCriticalCount > 0 && (
            <div className="rounded-2xl border border-red-500/25 bg-red-500/12 px-4 py-3">
              <div className="text-sm font-medium text-red-100">Critical path at risk</div>
              <div className="mt-1 text-sm text-red-200/90">
                {blockedCriticalCount} critical task
                {blockedCriticalCount !== 1 ? "s are" : " is"} blocked or dependency-blocked
                and may move the projected finish date.
              </div>
            </div>
          )}

          {overdueCount > 0 && (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3">
              <div className="text-sm font-medium text-rose-200">Overdue tasks</div>
              <div className="mt-1 text-sm text-rose-300/90">
                {overdueCount} task{overdueCount !== 1 ? "s" : ""} past due and needing follow-up.
              </div>
            </div>
          )}

          {homeownerActionCount > 0 && (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
              <div className="text-sm font-medium text-amber-200">
                Homeowner action needed
              </div>
              <div className="mt-1 text-sm text-amber-300/90">
                {homeownerActionCount} item
                {homeownerActionCount !== 1 ? "s" : ""} waiting on homeowner input.
              </div>
            </div>
          )}
        </div>
      )}

      <Card className="overflow-hidden border border-zinc-800 bg-zinc-950 shadow-none">
        <CardHeader className="border-b border-zinc-800 bg-zinc-950 px-5 py-4">
          <TaskToolbar
            viewMode={viewMode}
            setViewMode={setViewMode}
            selectedPhase={selectedPhase}
            setSelectedPhase={setSelectedPhase}
            assigneeFilter={assigneeFilter}
            setAssigneeFilter={setAssigneeFilter}
            uniqueAssignees={uniqueAssignees}
            showBlockedOnly={showBlockedOnly}
            setShowBlockedOnly={setShowBlockedOnly}
            showOverdueOnly={showOverdueOnly}
            setShowOverdueOnly={setShowOverdueOnly}
            showHomeownerActionOnly={showHomeownerActionOnly}
            setShowHomeownerActionOnly={setShowHomeownerActionOnly}
            showNeedsAttentionOnly={showNeedsAttentionOnly}
            setShowNeedsAttentionOnly={setShowNeedsAttentionOnly}
            showCriticalOnly={showCriticalOnly}
            setShowCriticalOnly={setShowCriticalOnly}
            onOpenGenerate={() => setGenerateOpen(true)}
            onBuildSchedule={async () => {
              await recalculateSchedule("Project timeline recalculated.")
            }}
            onOpenNewTask={() => setOpen(true)}
            buildingSchedule={buildingSchedule}
          />
        </CardHeader>

        <CardContent className="px-5 pb-5 pt-4">
          {uiMessage && (
            <div className="mb-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              <div className="font-medium">Schedule update</div>
              <div className="mt-1 text-amber-300/90">{uiMessage}</div>
            </div>
          )}

          {scheduleSummary.scheduledCount > 0 && (
            <div className="mb-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
              <div className="rounded-2xl border border-zinc-800 bg-black px-4 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Rough Completion
                </div>
                <div className="mt-1 text-sm font-semibold text-zinc-100">
                  {scheduleSummary.projectedFinish
                    ? formatDateShort(scheduleSummary.projectedFinish)
                    : "—"}
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-black px-4 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Scheduled Tasks
                </div>
                <div className="mt-1 text-sm font-semibold text-zinc-100">
                  {scheduleSummary.scheduledCount}
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-black px-4 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Inspections
                </div>
                <div className="mt-1 text-sm font-semibold text-zinc-100">
                  {scheduleSummary.inspectionCount}
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-black px-4 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Unscheduled
                </div>
                <div className="mt-1 text-sm font-semibold text-zinc-100">
                  {scheduleSummary.unscheduledCount}
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-black px-4 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Critical Tasks
                </div>
                <div className="mt-1 text-sm font-semibold text-zinc-100">
                  {criticalCount}
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-black px-4 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Blocked Critical
                </div>
                <div className="mt-1 text-sm font-semibold text-zinc-100">
                  {blockedCriticalCount}
                </div>
              </div>
            </div>
          )}

          {(criticalCount > 0 ||
            scheduleWarnings.quantityDrivenMissingData.length > 0 ||
            scheduleWarnings.unscheduledTasks.length > 0 ||
            scheduleWarnings.lockedDateConflicts.length > 0 ||
            scheduleWarnings.fallbackDurationTasks.length > 0 ||
            scheduleWarnings.tradeOverlapRisks.length > 0) && (
            <div className="mb-4 grid gap-3 lg:grid-cols-2">
              {scheduleWarnings.quantityDrivenMissingData.length > 0 && (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
                  <div className="text-sm font-medium text-amber-200">
                    Missing quantity data
                  </div>
                  <div className="mt-1 text-sm text-amber-300/90">
                    {scheduleWarnings.quantityDrivenMissingData.length} task
                    {scheduleWarnings.quantityDrivenMissingData.length !== 1 ? "s" : ""} use
                    quantity-based duration but are missing rate or quantity inputs.
                  </div>
                </div>
              )}

              {criticalCount > 0 && (
                <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 px-4 py-3">
                  <div className="text-sm font-medium text-blue-200">
                    Critical path identified
                  </div>
                  <div className="mt-1 text-sm text-blue-300/90">
                    {criticalCount} task{criticalCount !== 1 ? "s are" : " is"} currently on
                    the critical path with little or no float.
                  </div>
                </div>
              )}

              {scheduleWarnings.tradeOverlapRisks.length > 0 && (
                <div className="rounded-2xl border border-violet-500/20 bg-violet-500/10 px-4 py-3">
                  <div className="text-sm font-medium text-violet-200">
                    Trade overlap risks
                  </div>
                  <div className="mt-1 text-sm text-violet-300/90">
                    {scheduleWarnings.tradeOverlapRisks.length} task
                    {scheduleWarnings.tradeOverlapRisks.length !== 1 ? "s" : ""} may still
                    overlap with other tasks in the same trade.
                  </div>
                </div>
              )}

              {scheduleWarnings.unscheduledTasks.length > 0 && (
                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3">
                  <div className="text-sm font-medium text-rose-200">
                    Unscheduled tasks
                  </div>
                  <div className="mt-1 text-sm text-rose-300/90">
                    {scheduleWarnings.unscheduledTasks.length} task
                    {scheduleWarnings.unscheduledTasks.length !== 1 ? "s" : ""} still do not
                    have planned dates.
                  </div>
                </div>
              )}

              {scheduleWarnings.lockedDateConflicts.length > 0 && (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3">
                  <div className="text-sm font-medium text-red-200">
                    Locked date conflicts
                  </div>
                  <div className="mt-1 text-sm text-red-300/90">
                    {scheduleWarnings.lockedDateConflicts.length} task
                    {scheduleWarnings.lockedDateConflicts.length !== 1 ? "s" : ""} have locked
                    dates that may conflict with dependency order.
                  </div>
                </div>
              )}

              {scheduleWarnings.fallbackDurationTasks.length > 0 && (
                <div className="rounded-2xl border border-orange-500/20 bg-orange-500/10 px-4 py-3">
                  <div className="text-sm font-medium text-orange-200">
                    Fallback durations used
                  </div>
                  <div className="mt-1 text-sm text-orange-300/90">
                    {scheduleWarnings.fallbackDurationTasks.length} task
                    {scheduleWarnings.fallbackDurationTasks.length !== 1 ? "s" : ""} used
                    fallback duration instead of calculated production-based duration.
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-800 bg-black p-3 text-sm">
            <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-zinc-400">
              Showing {filteredTasks.length} of {tasks.length} tasks
            </span>

            {showBlockedOnly && (
              <span className={`rounded-full border px-3 py-1 ${darkPill("danger")}`}>
                Blocked
              </span>
            )}

            {showOverdueOnly && (
              <span className={`rounded-full border px-3 py-1 ${darkPill("danger")}`}>
                Overdue
              </span>
            )}

            {showHomeownerActionOnly && (
              <span className={`rounded-full border px-3 py-1 ${darkPill("warning")}`}>
                Homeowner Action
              </span>
            )}

            {showNeedsAttentionOnly && (
              <span className={`rounded-full border px-3 py-1 ${darkPill("warning")}`}>
                Needs Attention
              </span>
            )}

            {showCriticalOnly && (
              <span className={`rounded-full border px-3 py-1 ${darkPill("critical")}`}>
                Critical Path
              </span>
            )}

            {assigneeFilter !== "all" && (
              <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-zinc-400">
                Assignee: {assigneeFilter}
              </span>
            )}
          </div>

          <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-black p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">Task List</h3>
                <p className="text-xs text-zinc-500">
                  Search and scan every visible task in one place.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowTaskTable((prev) => !prev)}
                className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm font-medium text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-100"
              >
                {showTaskTable ? "Hide All Tasks Table" : "Show All Tasks Table"}
              </button>
            </div>

            <div className="flex flex-col gap-3 md:flex-row">
              <div className="relative w-full">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={taskSearch}
                  onChange={(e) => setTaskSearch(e.target.value)}
                  placeholder="Search tasks, phases, assignees, blockers, trade..."
                  className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-10 pr-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-zinc-700"
                />
              </div>
            </div>
          </div>

          {showTaskTable && (
            <div className="mb-6 overflow-hidden rounded-2xl border border-zinc-800 bg-black">
              <div className="max-h-[560px] overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-zinc-950 text-zinc-400">
                    <tr className="border-b border-zinc-800">
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em]">
                        Task
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em]">
                        Phase
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em]">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em]">
                        Assignee
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em]">
                        Start
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em]">
                        Finish
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em]">
                        Due
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em]">
                        Flags
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableTasks.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-8 text-center text-sm text-zinc-500">
                          No tasks match the current filters.
                        </td>
                      </tr>
                    ) : (
                      tableTasks.map((task) => {
                        const blockedState = task.status === "blocked" || isBlocked(task)
                        const overdueState = isOverdue(task.due_date)

                        return (
                          <tr
                            key={task.id}
                            className="border-b border-zinc-800/80 align-top hover:bg-zinc-950"
                          >
                            <td className="px-4 py-3">
                              <div className="font-medium text-zinc-100">{task.name}</div>
                              {task.description && (
                                <div className="mt-1 line-clamp-2 text-xs text-zinc-500">
                                  {task.description}
                                </div>
                              )}
                            </td>

                            <td className="px-4 py-3 text-zinc-300">
                              {getPhaseLabel(task.phase)}
                            </td>

                            <td className="px-4 py-3">
                              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] ${darkPill("neutral")}`}>
                                {String(task.status || "").replaceAll("_", " ")}
                              </span>
                            </td>

                            <td className="px-4 py-3 text-zinc-300">
                              {task.assigned_to_name || "—"}
                            </td>

                            <td className="px-4 py-3 text-zinc-300">
                              {task.planned_start ? formatDateShort(task.planned_start) : "—"}
                            </td>

                            <td className="px-4 py-3 text-zinc-300">
                              {task.planned_end ? formatDateShort(task.planned_end) : "—"}
                            </td>

                            <td className="px-4 py-3 text-zinc-300">
                              {task.due_date ? formatDateShort(task.due_date) : "—"}
                            </td>

                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-2">
                                {task.is_critical && (
                                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] ${darkPill("critical")}`}>
                                    Critical
                                  </span>
                                )}
                                {blockedState && (
                                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] ${darkPill("danger")}`}>
                                    Blocked
                                  </span>
                                )}
                                {overdueState && (
                                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] ${darkPill("danger")}`}>
                                    Overdue
                                  </span>
                                )}
                                {task.requires_homeowner_action && (
                                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] ${darkPill("warning")}`}>
                                    Homeowner
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => openEdit(task)}
                                  className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-100"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(task.id)}
                                  className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-200 transition hover:bg-red-500/15"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-black">
            <div className="max-h-[700px] overflow-auto p-4">
              {viewMode === "board" ? (
                <TaskBoardView
                  grouped={grouped}
                  sensors={sensors}
                  handleDragEnd={handleDragEnd}
                  openEdit={openEdit}
                  handleDelete={handleDelete}
                  handleStatus={handleStatus}
                  isOverdue={isOverdue}
                  isBlocked={isBlocked}
                />
              ) : (
                <TaskTimelineView
                  timelineTasks={timelineTasks}
                  timelineDates={timelineDates}
                  timelineSpanDays={timelineSpanDays}
                  formatDateShort={formatDateShort}
                  getDayOffset={getTimelineDayOffset}
                  getBarWidthDays={getTimelineBarWidthDays}
                  getPhaseLabel={getPhaseLabel}
                  isBlocked={isBlocked}
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <ProjectCopilotPanel projectId={projectId} />

      <ProjectHealthCenter
        criticalBlockers={criticalBlockers}
        overdueHomeownerActions={overdueHomeownerActions}
        unscheduledTasks={unscheduledBucketTasks}
        lowFloatTasks={lowFloatBucketTasks}
        onFocusBlocked={() => {
          setShowBlockedOnly(true)
          setShowCriticalOnly(false)
          setShowHomeownerActionOnly(false)
        }}
        onFocusHomeownerActions={() => {
          setShowHomeownerActionOnly(true)
          setShowBlockedOnly(false)
          setShowCriticalOnly(false)
        }}
        onFocusCritical={() => {
          setShowCriticalOnly(true)
          setShowBlockedOnly(false)
        }}
      />

            <HomeownerActionCenter
        items={homeownerActionItems}
        onUseForDraft={(item) => {
          window.dispatchEvent(
            new CustomEvent("use-homeowner-action-for-update", {
              detail: item,
            }),
          )
        }}
      />

      <ProjectVisualAdminPanel projectId={projectId} />

      <ProjectUpdatesPanel projectId={projectId} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl border-zinc-800 bg-zinc-950 p-0 text-zinc-100">
          <DialogHeader className="border-b border-zinc-800 px-6 py-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-black">
                <ClipboardList className="h-4 w-4 text-zinc-300" />
              </div>

              <div className="space-y-1">
                <DialogTitle className="text-left text-xl font-semibold tracking-tight text-zinc-100">
                  New Task
                </DialogTitle>
                <p className="text-left text-sm text-zinc-500">
                  Create a task, assign responsibility, and place it into the project workflow.
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="px-6 py-6">
            <FormNewTask
              projectId={projectId}
              onSuccess={() => {
                setOpen(false)
                fetchTasks()
              }}
              onCancel={() => setOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      <GenerateTasksDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        projectNotes={projectNotes}
        setProjectNotes={setProjectNotes}
        generatedTasks={generatedTasks}
        generateMessage={generateMessage}
        generating={generating}
        insertingGenerated={insertingGenerated}
        handleGenerateTasks={handleGenerateTasks}
        handleInsertGeneratedTasks={handleInsertGeneratedTasks}
        getPhaseLabel={getPhaseLabel}
        onCancel={() => {
          setGenerateOpen(false)
          setGeneratedTasks([])
          setGenerateMessage("")
          setProjectNotes("")
        }}
      />

      <EditTaskDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        editData={editData}
        setEditData={setEditData}
        editingTask={editingTask}
        tasks={tasks}
        saveEdit={saveEdit}
        calculateDurationDays={calculateDurationDays}
        savingEdit={savingEdit}
      />
    </div>
  )
}