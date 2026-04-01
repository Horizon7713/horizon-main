"use client"

import { ReactNode, useEffect, useMemo, useState } from "react"
import { Edit, Plus, Trash2, GripVertical } from "lucide-react"
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core"
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

import {
  deleteTask,
  generateBaselineTasks,
  insertGeneratedTasks,
  reorderTasks,
  updateTask,
  updateTaskStatus,
} from "@/app/project_data/actions"
import { FormNewTask } from "@/components/form/form-newtask"
import { buildSchedule } from "@/app/project_data/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabase/client"

type TaskStatus = "not_started" | "in_progress" | "blocked" | "completed"

interface Task {
  id: string
  name: string
  phase: string
  status: TaskStatus
  due_date: string | null
  assigned_to: string | null
  description: string | null
  sort_order: number
  depends_on?: string[]
  duration_days?: number | null
  planned_start?: string | null
planned_end?: string | null
trade?: string | null
priority?: string | null
is_milestone?: boolean | null
assigned_to_name?: string | null
blocker_reason?: string | null
blocker_note?: string | null
requires_homeowner_action?: boolean | null
homeowner_action_text?: string | null
homeowner_visible_note?: string | null
 last_updated_by?: string | null
  last_updated_at?: string | null
}

interface ProjectTasksProps {
  projectId: string
  projectType?: string
}
const TRADE_OPTIONS = [
  { value: "general", label: "General" },
  { value: "sitework", label: "Sitework" },
  { value: "concrete", label: "Concrete" },
  { value: "framing", label: "Framing" },
  { value: "roofing", label: "Roofing" },
  { value: "exterior", label: "Exterior" },
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "hvac", label: "HVAC" },
  { value: "insulation", label: "Insulation" },
  { value: "drywall", label: "Drywall" },
  { value: "paint", label: "Paint" },
  { value: "finish_carpentry", label: "Finish Carpentry" },
  { value: "flooring", label: "Flooring" },
  { value: "cabinetry", label: "Cabinetry" },
  { value: "landscape", label: "Landscape" },
]
const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
]
const PHASE_OPTIONS = [
  { value: "sitework", label: "Sitework" },
  { value: "foundation", label: "Foundation" },
  { value: "framing", label: "Framing" },
  { value: "roofing", label: "Roofing" },
  { value: "exterior", label: "Exterior" },
  { value: "rough_in", label: "Rough In" },
  { value: "insulation", label: "Insulation" },
  { value: "drywall", label: "Drywall" },
  { value: "interior_finish", label: "Interior Finish" },
  { value: "cabinetry", label: "Cabinetry" },
  { value: "flooring", label: "Flooring" },
  { value: "punch_list", label: "Punch List" },
]

const STATUS_OPTIONS = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "blocked", label: "Blocked" },
  { value: "completed", label: "Completed" },
]

const BLOCKER_REASON_OPTIONS = [
  { value: "dependency_not_complete", label: "Dependency Not Complete" },
  { value: "waiting_on_homeowner", label: "Waiting on Homeowner" },
  { value: "waiting_on_subcontractor", label: "Waiting on Subcontractor" },
  { value: "waiting_on_materials", label: "Waiting on Materials" },
  { value: "inspection_issue", label: "Inspection Issue" },
  { value: "weather", label: "Weather" },
  { value: "permit_issue", label: "Permit Issue" },
  { value: "change_order", label: "Change Order" },
  { value: "other", label: "Other" },
]

function SortableTaskCard({
  task,
  onEdit,
  onDelete,
  onStatusChange,
  isOverdue,
  isBlocked,
}: {
  task: Task
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: TaskStatus) => void
  isOverdue: (date: string | null) => boolean
  isBlocked: (task: Task) => boolean
}) {
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
    opacity: isDragging ? 0.5 : 1,
  }
  
  const statusLabel = STATUS_OPTIONS.find((s) => s.value === task.status)?.label || task.status

  return (
    <Card ref={setNodeRef} style={style} className="mb-3">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 min-w-0">
            <button
              type="button"
              className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground shrink-0"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4" />
            </button>

            <div className="min-w-0">
              <div className="font-medium break-words">{task.name}</div>

              {task.description && (
  <div className="text-sm text-muted-foreground mt-1 break-words">
    {task.description}
  </div>
)}
{task.trade && (
  <div className="text-xs mt-1 text-muted-foreground">
    Trade: {TRADE_OPTIONS.find((t) => t.value === task.trade)?.label || task.trade}
  </div>
)}
{task.priority && (
  <div className="text-xs mt-1 text-muted-foreground">
    Priority: {PRIORITY_OPTIONS.find((p) => p.value === task.priority)?.label || task.priority}
  </div>
)}
{task.assigned_to_name && (
  <div className="text-xs mt-1 text-muted-foreground">
    Assigned To: {task.assigned_to_name}
  </div>
)}

{task.requires_homeowner_action && (
  <div className="text-xs mt-1 font-medium text-amber-600">
    Homeowner Action Needed
  </div>
)}

{task.blocker_reason && (
  <div className="text-xs mt-1 text-red-500">
    Blocker: {BLOCKER_REASON_OPTIONS.find((b) => b.value === task.blocker_reason)?.label || task.blocker_reason}
  </div>
)}

{task.homeowner_visible_note && (
  <div className="text-xs mt-1 text-muted-foreground">
    Homeowner Note: {task.homeowner_visible_note}
  </div>
)}
{task.duration_days !== null && task.duration_days !== undefined && (
  <div className="text-xs mt-2 text-muted-foreground">
    Duration: {task.duration_days} day{task.duration_days !== 1 ? "s" : ""}
  </div>
)}
{task.is_milestone && (
  <div className="text-xs mt-1 font-semibold text-blue-500">
    Milestone
  </div>
)}
{task.planned_start && (
  <div className="text-xs mt-1 text-muted-foreground">
    Planned Start: {task.planned_start}
  </div>
)}

{task.planned_end && (
  <div className="text-xs mt-1 text-muted-foreground">
    Planned End: {task.planned_end}
  </div>
)}

{isBlocked(task) && (
  <div className="text-xs mt-2 text-red-500 font-medium">
    Blocked by dependencies
  </div>
)}

{task.blocker_note && task.status === "blocked" && (
  <div className="text-xs mt-1 text-red-400">
    {task.blocker_note}
  </div>
)}

{task.last_updated_at && (
  <div className="text-xs mt-2 text-muted-foreground">
    Updated: {task.last_updated_at}
    {task.last_updated_by ? ` by ${task.last_updated_by}` : ""}
  </div>
)}

{task.due_date && (
  <div
    className={`text-xs mt-2 ${
      isOverdue(task.due_date) ? "text-red-500 font-medium" : "text-muted-foreground"
    }`}
  >
    Due: {task.due_date}
  </div>
)}
              
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Select value={task.status} onValueChange={(v: TaskStatus) => onStatusChange(task.id, v)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1" onClick={() => onEdit(task)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>

            <Button size="sm" variant="outline" className="flex-1" onClick={() => onDelete(task.id)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>

          <div className="text-xs text-muted-foreground">{statusLabel}</div>
        </div>
      </CardContent>
    </Card>
  )
}

function PhaseColumn({
  phaseId,
  label,
  count,
  children,
}: {
  phaseId: string
  label: string
  count: number
  children: ReactNode
}) {

  const { setNodeRef, isOver } = useDroppable({
    id: `phase:${phaseId}`,
  })

  return (
    <div
      ref={setNodeRef}
      className={`w-[320px] shrink-0 rounded-xl border ${
        isOver ? "bg-muted/40 ring-2 ring-primary/30" : "bg-muted/20"
      }`}
    >
      <div className="border-b px-4 py-3 rounded-t-xl bg-background">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{label}</h3>
          <span className="text-xs text-muted-foreground">{count}</span>
        </div>
      </div>

      <div className="p-3 min-h-[220px]">{children}</div>
    </div>
  )
}

export function ProjectTasks({ projectId, projectType }: ProjectTasksProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPhase, setSelectedPhase] = useState("all")
const [open, setOpen] = useState(false)
const [generateOpen, setGenerateOpen] = useState(false)
const [generatedTasks, setGeneratedTasks] = useState<
  {
    name: string
    phase: string
    sort_order: number
    description?: string | null
    depends_on_names?: string[]
  }[]
>([])
const [generating, setGenerating] = useState(false)
const [insertingGenerated, setInsertingGenerated] = useState(false)
const [generateMessage, setGenerateMessage] = useState("")
const [projectNotes, setProjectNotes] = useState("")

const [editOpen, setEditOpen] = useState(false)
const [editingTask, setEditingTask] = useState<Task | null>(null)
const [editData, setEditData] = useState<Partial<Task>>({})
const [viewMode, setViewMode] = useState<"board" | "timeline">("board")
const [showBlockedOnly, setShowBlockedOnly] = useState(false)
const [showOverdueOnly, setShowOverdueOnly] = useState(false)
const [showHomeownerActionOnly, setShowHomeownerActionOnly] = useState(false)
const [showNeedsAttentionOnly, setShowNeedsAttentionOnly] = useState(false)
const [assigneeFilter, setAssigneeFilter] = useState("all")

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  )
const [error, setError] = useState<string | null>(null)

const fetchTasks = async () => {
  setError(null)

  const { data, error } = await supabase
    .from("project_tasks")
    .select("*")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true })

  if (error) {
    setError(error.message)
    return
  }

  setTasks((data as Task[]) || [])
}

  useEffect(() => {
    fetchTasks().finally(() => setLoading(false))
  }, [projectId])

  const total = tasks.length
  const completed = tasks.filter((t) => t.status === "completed").length
  const inProgress = tasks.filter((t) => t.status === "in_progress").length
  const blocked = tasks.filter((t) => t.status === "blocked").length
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100)

  const handleDelete = async (id: string) => {
    await deleteTask(id)
    fetchTasks()
  }
const handleGenerateTasks = async () => {
  try {
    setGenerating(true)
    setGenerateMessage("")

    const generated = await generateBaselineTasks(projectNotes, projectType)
    setGeneratedTasks(generated || [])

    if ((generated || []).length > 0) {
      setGenerateMessage(`${generated.length} tasks generated.`)
    } else {
      setGenerateMessage("No tasks were generated.")
    }
  } finally {
    setGenerating(false)
  }
}
const handleInsertGeneratedTasks = async () => {
  if (generatedTasks.length === 0) return

  try {
    setInsertingGenerated(true)
    setGenerateMessage("")

    const result = await insertGeneratedTasks(projectId, generatedTasks)

    await fetchTasks()

    if (result.inserted === 0) {
      setGenerateMessage("All generated tasks already exist for this project.")
    } else {
      setGenerateMessage(`${result.inserted} tasks inserted.`)
    }

    setGeneratedTasks([])
  } finally {
    setInsertingGenerated(false)
  }
}
  const isBlocked = (task: Task) => {
    if (!task.depends_on || task.depends_on.length === 0) return false

    return task.depends_on.some((depId) => {
      const depTask = tasks.find((t) => t.id === depId)
      return depTask && depTask.status !== "completed"
    })
  }

  const getPhaseLabel = (phase: string) => {
  return PHASE_OPTIONS.find((p) => p.value === phase)?.label || phase
}

const handleStatus = async (id: string, status: TaskStatus) => {
  const task = tasks.find((t) => t.id === id)
  if (!task) return

  const blocked = isBlocked(task)

  if (blocked && (status === "in_progress" || status === "completed")) {
    alert("This task is blocked by dependencies")
    return
  }

  if (status === "blocked" && !task.blocker_reason) {
    alert("Add a blocker reason in Edit Task before marking this task blocked.")
    openEdit(task)
    return
  }

  await updateTaskStatus(id, status)
  fetchTasks()
}

  const openEdit = (task: Task) => {
    setEditingTask(task)
    setEditData(task)
    setEditOpen(true)
  }
const calculateDurationDays = (start?: string | null, end?: string | null) => {
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

  if (normalizedEditData.status === "blocked" && !normalizedEditData.blocker_reason) {
    alert("Blocked tasks require a blocker reason")
    return
  }

  const result = await updateTask({
    taskId: editingTask.id,
    name: normalizedEditData.name,
    description: normalizedEditData.description,
    phase: normalizedEditData.phase,
    status: normalizedEditData.status,
    dueDate: normalizedEditData.due_date || undefined,
    assignedTo: normalizedEditData.assigned_to || undefined,
    assignedToName: normalizedEditData.assigned_to_name || undefined,
    dependsOn: normalizedEditData.depends_on || [],
    durationDays: normalizedEditData.duration_days ?? 1,
    plannedStart: normalizedEditData.planned_start || undefined,
    plannedEnd: normalizedEditData.planned_end || undefined,
    trade: normalizedEditData.trade || "general",
    priority: normalizedEditData.priority || "medium",
    isMilestone: normalizedEditData.is_milestone || false,
    blockerReason: normalizedEditData.blocker_reason ?? null,
    blockerNote: normalizedEditData.blocker_note ?? null,
    requiresHomeownerAction: !!normalizedEditData.requires_homeowner_action,
    homeownerActionText: normalizedEditData.homeowner_action_text ?? null,
    homeownerVisibleNote: normalizedEditData.homeowner_visible_note ?? null,
  })

  if (!result.success) {
    alert(result.error || "Failed to save task changes")
    return
  }

  setEditOpen(false)
  setEditingTask(null)
  await fetchTasks()
}

  const isOverdue = (date: string | null) => {
  if (!date) return false
  const due = new Date(date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return due < today
}

const needsAttention = (task: Task) => {
  return (
    task.status === "blocked" ||
    isBlocked(task) ||
    isOverdue(task.due_date) ||
    !!task.requires_homeowner_action ||
    !task.assigned_to_name ||
    task.priority === "critical"
  )
}

const uniqueAssignees = Array.from(
  new Set(tasks.map((t) => t.assigned_to_name).filter(Boolean))
).sort()

const filteredTasks = tasks.filter((task) => {
  if (selectedPhase !== "all" && task.phase !== selectedPhase) return false
  if (showBlockedOnly && task.status !== "blocked" && !isBlocked(task)) return false
  if (showOverdueOnly && !isOverdue(task.due_date)) return false
  if (showHomeownerActionOnly && !task.requires_homeowner_action) return false
  if (showNeedsAttentionOnly && !needsAttention(task)) return false
  if (assigneeFilter !== "all" && task.assigned_to_name !== assigneeFilter) return false
  return true
})

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

const timelineTasks = [...filteredTasks].sort((a, b) => {
  const aStart = a.planned_start || "9999-12-31"
  const bStart = b.planned_start || "9999-12-31"

  if (aStart !== bStart) return aStart.localeCompare(bStart)
  return a.sort_order - b.sort_order
})

const scheduledTasks = timelineTasks.filter((task) => task.planned_start && task.planned_end)

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
        Math.ceil((timelineEnd - timelineStart) / (1000 * 60 * 60 * 24)) + 1
      )
    : 1

const timelineDates = (() => {
  if (timelineStart === null) return []

  const dates: Date[] = []
  const start = new Date(timelineStart)

  for (let i = 0; i < timelineSpanDays; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    dates.push(d)
  }

  return dates
})()

const formatDateShort = (date: Date) => {
  return `${date.getMonth() + 1}/${date.getDate()}`
}

const getDayOffset = (dateString?: string | null) => {
  if (!dateString || timelineStart === null) return 0
  const date = new Date(dateString).getTime()
  return Math.max(
    0,
    Math.floor((date - timelineStart) / (1000 * 60 * 60 * 24))
  )
}

const getBarWidthDays = (start?: string | null, end?: string | null) => {
  if (!start || !end) return 1

  const startTime = new Date(start).getTime()
  const endTime = new Date(end).getTime()

  const diffDays = Math.floor((endTime - startTime) / (1000 * 60 * 60 * 24)) + 1
  return Math.max(1, diffDays)
}

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

    const untouchedOtherPhaseTasks = remainingTasks.filter((t) => t.phase !== targetPhase)

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
      fetchTasks()
      return
    }

    setTasks(updatedTasks)

    const payload = updatedTasks.map((t) => ({
      id: t.id,
      sortOrder: t.sort_order,
      phase: t.phase,
    }))

    await reorderTasks(payload)
    fetchTasks()
  }

  if (loading) return <div>Loading...</div>

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">
              {completed} / {total} tasks completed
            </div>
            <div className="text-sm text-muted-foreground">{percent}%</div>
          </div>

          <Progress value={percent} />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Total</div>
              <div className="text-xl font-semibold">{total}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Completed</div>
              <div className="text-xl font-semibold">{completed}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">In Progress</div>
              <div className="text-xl font-semibold">{inProgress}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Blocked</div>
              <div className="text-xl font-semibold">{blocked}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
  <CardTitle>Tasks Board</CardTitle>

  <div className="flex flex-wrap gap-2">
    <Button
      variant={viewMode === "board" ? "default" : "outline"}
      onClick={() => setViewMode("board")}
    >
      Board View
    </Button>

    <Button
      variant={viewMode === "timeline" ? "default" : "outline"}
      onClick={() => setViewMode("timeline")}
    >
      Timeline View
    </Button>

    <Select value={selectedPhase} onValueChange={setSelectedPhase}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Filter" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Phases</SelectItem>
        {PHASE_OPTIONS.map((p) => (
          <SelectItem key={p.value} value={p.value}>
            {p.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>

    <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
  <SelectTrigger className="w-[200px]">
    <SelectValue placeholder="Assignee Filter" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">All Assignees</SelectItem>
    {uniqueAssignees.map((assignee) => (
      <SelectItem key={assignee} value={assignee!}>
        {assignee}
      </SelectItem>
    ))}
  </SelectContent>
</Select>

<Button
  variant={showBlockedOnly ? "default" : "outline"}
  onClick={() => setShowBlockedOnly((v) => !v)}
>
  Blocked
</Button>

<Button
  variant={showOverdueOnly ? "default" : "outline"}
  onClick={() => setShowOverdueOnly((v) => !v)}
>
  Overdue
</Button>

<Button
  variant={showHomeownerActionOnly ? "default" : "outline"}
  onClick={() => setShowHomeownerActionOnly((v) => !v)}
>
  Homeowner Action
</Button>

<Button
  variant={showNeedsAttentionOnly ? "default" : "outline"}
  onClick={() => setShowNeedsAttentionOnly((v) => !v)}
>
  Needs Attention
</Button>

<Button variant="outline" onClick={() => setGenerateOpen(true)}>
  Generate Tasks
</Button>

<Button
  variant="outline"
  onClick={async () => {
    await buildSchedule(projectId)
    fetchTasks()
  }}
>
  Build Schedule
</Button>

<Button onClick={() => setOpen(true)}>
  <Plus className="mr-2 h-4 w-4" />
  New Task
</Button>
  </div>
</CardHeader>

        <CardContent>
  {error && (
    <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      Failed to load tasks: {error}
    </div>
  )}

<div className="mb-4 flex flex-wrap gap-2 text-sm text-muted-foreground">
  <span>Showing {filteredTasks.length} of {tasks.length} tasks</span>
  {showBlockedOnly && <span>• Blocked</span>}
  {showOverdueOnly && <span>• Overdue</span>}
  {showHomeownerActionOnly && <span>• Homeowner Action</span>}
  {showNeedsAttentionOnly && <span>• Needs Attention</span>}
  {assigneeFilter !== "all" && <span>• Assignee: {assigneeFilter}</span>}
</div>

  {viewMode === "board" ? (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="overflow-x-auto">
        <div className="flex gap-4 min-w-max pb-2">
          {grouped.map((group) => (
            <PhaseColumn
  key={group.value}
  phaseId={group.value}
  label={group.label}
  count={group.tasks.length}
>
  <SortableContext items={group.tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
    {group.tasks.length === 0 ? (
      <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground text-center">
        Drop tasks here
      </div>
    ) : (
      group.tasks.map((task) => (
        <SortableTaskCard
          key={task.id}
          task={task}
          onEdit={openEdit}
          onDelete={handleDelete}
          onStatusChange={handleStatus}
          isOverdue={isOverdue}
          isBlocked={isBlocked}
        />
      ))
    )}
  </SortableContext>
</PhaseColumn>
          ))}
        </div>
      </div>
    </DndContext>
  ) : (
    <div className="overflow-x-auto">
  <table className="w-full border-collapse">
    <thead>
      <tr className="border-b text-left">
        <th className="p-3 text-sm font-medium">Task</th>
        <th className="p-3 text-sm font-medium">Phase</th>
        <th className="p-3 text-sm font-medium">Trade</th>
        <th className="p-3 text-sm font-medium">Priority</th>
        <th className="p-3 text-sm font-medium">Start</th>
        <th className="p-3 text-sm font-medium">End</th>
        <th className="p-3 text-sm font-medium">Duration</th>
        <th className="p-3 text-sm font-medium">Milestone</th>
        <th className="p-3 text-sm font-medium min-w-[420px]">
          <div className="space-y-2">
            <div>Timeline</div>

            {timelineDates.length > 0 && (
              <div
                className="grid gap-1 text-[10px] text-muted-foreground"
                style={{
                  gridTemplateColumns: `repeat(${timelineSpanDays}, minmax(24px, 1fr))`,
                }}
              >
                {timelineDates.map((date) => (
                  <div
                    key={date.toISOString()}
                    className="text-center border-l first:border-l-0 pl-1"
                  >
                    {formatDateShort(date)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </th>
        <th className="p-3 text-sm font-medium">Status</th>
      </tr>
    </thead>

    <tbody>
      {timelineTasks.length === 0 ? (
        <tr>
          <td colSpan={10} className="p-6 text-center text-sm text-muted-foreground">
            No tasks found
          </td>
        </tr>
      ) : (
        timelineTasks.map((task) => (
          <tr key={task.id} className="border-b align-top">
            <td className="p-3">
  <div className="font-medium text-sm">{task.name}</div>

  {task.description && (
    <div className="text-xs text-muted-foreground mt-1">{task.description}</div>
  )}

  {task.assigned_to_name && (
    <div className="text-xs text-muted-foreground mt-1">
      Assigned To: {task.assigned_to_name}
    </div>
  )}

  {task.requires_homeowner_action && (
    <div className="text-xs text-amber-600 mt-1 font-medium">
      Homeowner Action Needed
    </div>
  )}

  {task.homeowner_action_text && (
    <div className="text-xs text-muted-foreground mt-1">
      Action: {task.homeowner_action_text}
    </div>
  )}

  {task.homeowner_visible_note && (
    <div className="text-xs text-muted-foreground mt-1">
      Note: {task.homeowner_visible_note}
    </div>
  )}

  {isBlocked(task) && (
    <div className="text-xs text-red-500 mt-1">Blocked</div>
  )}

  {task.blocker_reason && (
    <div className="text-xs text-red-500 mt-1">
      Blocker: {BLOCKER_REASON_OPTIONS.find((b) => b.value === task.blocker_reason)?.label || task.blocker_reason}
    </div>
  )}

  {task.blocker_note && task.status === "blocked" && (
    <div className="text-xs text-red-400 mt-1">{task.blocker_note}</div>
  )}
</td>

            <td className="p-3 text-sm">{getPhaseLabel(task.phase)}</td>

            <td className="p-3 text-sm">
              {task.trade
                ? TRADE_OPTIONS.find((t) => t.value === task.trade)?.label || task.trade
                : "—"}
            </td>

            <td className="p-3 text-sm">
              {task.priority
                ? PRIORITY_OPTIONS.find((p) => p.value === task.priority)?.label || task.priority
                : "—"}
            </td>

            <td className="p-3 text-sm">{task.planned_start || "—"}</td>
            <td className="p-3 text-sm">{task.planned_end || "—"}</td>

            <td className="p-3 text-sm">
              {task.duration_days !== null && task.duration_days !== undefined
                ? `${task.duration_days} day${task.duration_days !== 1 ? "s" : ""}`
                : "—"}
            </td>

            <td className="p-3 text-sm">{task.is_milestone ? "Yes" : "—"}</td>

            <td className="p-3 min-w-[420px]">
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
                      className="h-8 border-l first:border-l-0"
                    />
                  ))}

                  <div
                    className={`absolute top-1 bottom-1 rounded-md ${
                      task.is_milestone
                        ? "bg-blue-500"
                        : task.priority === "critical"
                        ? "bg-red-500"
                        : task.priority === "high"
                        ? "bg-orange-500"
                        : task.priority === "low"
                        ? "bg-gray-400"
                        : "bg-primary"
                    }`}
                    style={{
                      left: `calc(${(getDayOffset(task.planned_start) / timelineSpanDays) * 100}% + 2px)`,
                      width: `calc(${(getBarWidthDays(task.planned_start, task.planned_end) / timelineSpanDays) * 100}% - 4px)`,
                      minWidth: task.is_milestone ? "12px" : "8px",
                    }}
                    title={`${task.name}: ${task.planned_start} → ${task.planned_end}`}
                  />
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
              )}
            </td>

            <td className="p-3 text-sm">
  <div>{STATUS_OPTIONS.find((s) => s.value === task.status)?.label || task.status}</div>
  {task.last_updated_at && (
    <div className="text-xs text-muted-foreground mt-1">
      Updated: {task.last_updated_at}
      {task.last_updated_by ? ` by ${task.last_updated_by}` : ""}
    </div>
  )}
</td>
          </tr>
        ))
      )}
    </tbody>
  </table>
</div>
  )}
</CardContent>
      </Card>
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>New Task</DialogTitle>
    </DialogHeader>

    <FormNewTask
      projectId={projectId}
      onSuccess={() => {
        setOpen(false)
        fetchTasks()
      }}
      onCancel={() => setOpen(false)}
    />
  </DialogContent>
</Dialog>

<Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
  <DialogContent className="max-w-2xl">
    <DialogHeader>
      <DialogTitle>Generate Baseline Tasks</DialogTitle>
    </DialogHeader>

<div className="space-y-4">
  <div className="text-sm text-muted-foreground">
  This will generate a baseline construction task list for this project. Project notes can slightly tailor the result.
</div>
  <div className="space-y-2">
  <label className="text-sm font-medium">Project Notes</label>
  <Textarea
    value={projectNotes}
    onChange={(e) => setProjectNotes(e.target.value)}
    placeholder="Example: custom home, detached garage, remodel with addition, high-end finishes..."
  />
  <div className="text-xs text-muted-foreground">
    These notes will be used in a future AI version to tailor the generated tasks.
  </div>
</div>

  <div className="rounded-lg border p-4 bg-muted/20 space-y-2">
    <div className="font-medium">What AI v1 will do</div>
    <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
      <li>Create a standard new-construction task list</li>
      <li>Assign each task to a phase</li>
      <li>Set sort order automatically</li>
      <li>Let you review before inserting</li>
    </ul>
  </div>

  {generatedTasks.length > 0 && (
    <div className="space-y-2">
      <div className="font-medium">Generated Tasks Preview</div>

      <div className="max-h-[320px] overflow-y-auto rounded-lg border">
        <div className="divide-y">
          {generatedTasks.map((task, index) => (
            <div key={`${task.name}-${index}`} className="p-3 space-y-1">
  <div className="font-medium text-sm">{task.name}</div>

  <div className="text-xs text-muted-foreground">
    Phase: {getPhaseLabel(task.phase)}
  </div>

  {task.description && (
    <div className="text-xs text-muted-foreground">
      {task.description}
    </div>
  )}

  {task.depends_on_names && task.depends_on_names.length > 0 && (
    <div className="text-xs text-muted-foreground">
      Depends on: {task.depends_on_names.join(", ")}
    </div>
  )}
</div>
          ))}
        </div>
      </div>
    </div>
  )}
{generateMessage && (
  <div className="rounded-md border px-3 py-2 text-sm bg-muted/20">
    {generateMessage}
  </div>
)}
  <div className="flex justify-end gap-2">
  <Button
  variant="outline"
  onClick={() => {
    setGenerateOpen(false)
    setGeneratedTasks([])
    setGenerateMessage("")
    setProjectNotes("")
  }}
  disabled={generating || insertingGenerated}
>
  Cancel
</Button>

  {generatedTasks.length > 0 && (
    <Button onClick={handleInsertGeneratedTasks} disabled={insertingGenerated}>
      {insertingGenerated ? "Inserting..." : "Insert Tasks"}
    </Button>
  )}

  <Button onClick={handleGenerateTasks} disabled={generating || insertingGenerated}>
    {generating ? "Generating..." : generatedTasks.length > 0 ? "Regenerate" : "Generate"}
  </Button>
</div>
</div>
  </DialogContent>
</Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Task Name</label>
              <Input
                value={editData.name || ""}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                placeholder="Task name"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={editData.description || ""}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                placeholder="Description"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Phase</label>
              <Select
                value={(editData.phase as string) || "sitework"}
                onValueChange={(v) => setEditData({ ...editData, phase: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PHASE_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

<div className="space-y-2">
  <label className="text-sm font-medium">Trade</label>
  <Select
    value={(editData.trade as string) || "general"}
    onValueChange={(v) => setEditData({ ...editData, trade: v })}
  >
    <SelectTrigger>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {TRADE_OPTIONS.map((t) => (
        <SelectItem key={t.value} value={t.value}>
          {t.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>

<div className="flex items-center space-x-2">
  <input
    type="checkbox"
    checked={!!editData.is_milestone}
    onChange={(e) =>
      setEditData({
        ...editData,
        is_milestone: e.target.checked,
      })
    }
  />
  <label className="text-sm font-medium">Milestone</label>
</div>

<div className="space-y-2">
  <label className="text-sm font-medium">Priority</label>
  <Select
    value={(editData.priority as string) || "medium"}
    onValueChange={(v) => setEditData({ ...editData, priority: v })}
  >
    <SelectTrigger>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {PRIORITY_OPTIONS.map((p) => (
        <SelectItem key={p.value} value={p.value}>
          {p.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>

<div className="space-y-2">
  <label className="text-sm font-medium">Assigned To Name</label>
  <Input
    value={editData.assigned_to_name || ""}
    onChange={(e) => setEditData({ ...editData, assigned_to_name: e.target.value })}
    placeholder="Example: Mike / ABC Plumbing / Homeowner"
  />
</div>

<div className="flex items-center space-x-2">
  <input
    type="checkbox"
    checked={!!editData.requires_homeowner_action}
    onChange={(e) =>
      setEditData({
        ...editData,
        requires_homeowner_action: e.target.checked,
      })
    }
  />
  <label className="text-sm font-medium">Requires Homeowner Action</label>
</div>

<div className="space-y-2">
  <label className="text-sm font-medium">Homeowner Action Text</label>
  <Textarea
    value={editData.homeowner_action_text || ""}
    onChange={(e) => setEditData({ ...editData, homeowner_action_text: e.target.value })}
    placeholder="Example: Approve tile selection before flooring starts"
  />
</div>

<div className="space-y-2">
  <label className="text-sm font-medium">Homeowner Visible Note</label>
  <Textarea
    value={editData.homeowner_visible_note || ""}
    onChange={(e) => setEditData({ ...editData, homeowner_visible_note: e.target.value })}
    placeholder="Plain-language update that can appear on the homeowner dashboard"
  />
</div>

<div className="space-y-2">
  <label className="text-sm font-medium">Blocker Reason</label>
  <Select
    value={(editData.blocker_reason as string) || ""}
    onValueChange={(v) =>
      setEditData({ ...editData, blocker_reason: v || null })
    }
  >
    <SelectTrigger>
      <SelectValue placeholder="Select blocker reason" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="dependency_not_complete">Dependency Not Complete</SelectItem>
      <SelectItem value="waiting_on_homeowner">Waiting on Homeowner</SelectItem>
      <SelectItem value="waiting_on_subcontractor">Waiting on Subcontractor</SelectItem>
      <SelectItem value="waiting_on_materials">Waiting on Materials</SelectItem>
      <SelectItem value="inspection_issue">Inspection Issue</SelectItem>
      <SelectItem value="weather">Weather</SelectItem>
      <SelectItem value="permit_issue">Permit Issue</SelectItem>
      <SelectItem value="change_order">Change Order</SelectItem>
      <SelectItem value="other">Other</SelectItem>
    </SelectContent>
  </Select>
</div>

<div className="space-y-2">
  <label className="text-sm font-medium">Blocker Note</label>
  <Textarea
    value={editData.blocker_note || ""}
    onChange={(e) => setEditData({ ...editData, blocker_note: e.target.value })}
    placeholder="Explain what is blocking this task"
  />
</div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={(editData.status as string) || "not_started"}
                onValueChange={(v) => setEditData({ ...editData, status: v as TaskStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Due Date</label>
              <Input
                type="date"
                value={editData.due_date || ""}
                onChange={(e) => setEditData({ ...editData, due_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
  <label className="text-sm font-medium">Duration (Days)</label>
  <Input
    type="number"
    min="1"
    value={editData.duration_days ?? 1}
    onChange={(e) =>
      setEditData({
        ...editData,
        duration_days: e.target.value ? Number(e.target.value) : 1,
      })
    }
  />
</div>
<div className="grid grid-cols-2 gap-4">
  <div className="space-y-2">
    <label className="text-sm font-medium">Planned Start</label>
   <Input
  type="date"
  value={editData.planned_start || ""}
  onChange={(e) => {
    const newStart = e.target.value

    setEditData((prev) => ({
      ...prev,
      planned_start: newStart,
      duration_days: calculateDurationDays(newStart, prev.planned_end),
    }))
  }}
/>
  </div>

  <div className="space-y-2">
    <label className="text-sm font-medium">Planned End</label>
   <Input
  type="date"
  value={editData.planned_end || ""}
  onChange={(e) => {
    const newEnd = e.target.value

    setEditData((prev) => ({
      ...prev,
      planned_end: newEnd,
      duration_days: calculateDurationDays(prev.planned_start, newEnd),
    }))
  }}
/>
  </div>
</div>

            <div className="space-y-2 rounded-lg border p-4 bg-muted/20">
              <div className="text-sm font-semibold">Dependencies</div>
              <div className="text-xs text-muted-foreground">
                Select tasks that must be completed first.
              </div>

              <div className="max-h-56 overflow-y-auto space-y-2 pt-2">
                {tasks.filter((t) => t.id !== editingTask?.id).length === 0 ? (
                  <div className="text-sm text-muted-foreground">No other tasks available</div>
                ) : (
                  tasks
                    .filter((t) => t.id !== editingTask?.id)
                    .map((task) => {
                      const checked = (editData.depends_on || []).includes(task.id)

                      return (
                        <label
                          key={task.id}
                          className="flex items-center gap-3 rounded border p-2 text-sm cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={checked}
                            onChange={(e) => {
                              const current = editData.depends_on || []

                              if (e.target.checked) {
                                setEditData({
                                  ...editData,
                                  depends_on: [...current, task.id],
                                })
                              } else {
                                setEditData({
                                  ...editData,
                                  depends_on: current.filter((id) => id !== task.id),
                                })
                              }
                            }}
                          />
                          <span>
                            {task.name} <span className="text-muted-foreground">({task.phase})</span>
                          </span>
                        </label>
                      )
                    })
                )}
              </div>
            </div>

            <Button onClick={saveEdit}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}