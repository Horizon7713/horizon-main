"use client"

import {
  CalendarRange,
  Filter,
  GanttChartSquare,
  LayoutGrid,
  Loader2,
  Plus,
  Sparkles,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PHASE_OPTIONS } from "./task-types"

interface TaskToolbarProps {
  viewMode: "board" | "timeline"
  setViewMode: (value: "board" | "timeline") => void
  selectedPhase: string
  setSelectedPhase: (value: string) => void
  assigneeFilter: string
  setAssigneeFilter: (value: string) => void
  uniqueAssignees: string[]
  showBlockedOnly: boolean
  setShowBlockedOnly: React.Dispatch<React.SetStateAction<boolean>>
  showOverdueOnly: boolean
  setShowOverdueOnly: React.Dispatch<React.SetStateAction<boolean>>
  showHomeownerActionOnly: boolean
  setShowHomeownerActionOnly: React.Dispatch<React.SetStateAction<boolean>>
  showNeedsAttentionOnly: boolean
  setShowNeedsAttentionOnly: React.Dispatch<React.SetStateAction<boolean>>
  showCriticalOnly: boolean
  setShowCriticalOnly: React.Dispatch<React.SetStateAction<boolean>>
  onOpenGenerate: () => void
  onBuildSchedule: () => void | Promise<void>
  onOpenNewTask: () => void
  buildingSchedule?: boolean
}

function filterButtonClass(active: boolean) {
  return active
    ? "border-amber-500/20 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15"
    : "border-zinc-800 bg-black text-zinc-300 hover:border-zinc-700 hover:bg-zinc-950 hover:text-zinc-100"
}

function modeButtonClass(active: boolean) {
  return active
    ? "border-zinc-700 bg-zinc-900 text-zinc-100"
    : "border-zinc-800 bg-black text-zinc-300 hover:border-zinc-700 hover:bg-zinc-950 hover:text-zinc-100"
}

export function TaskToolbar({
  viewMode,
  setViewMode,
  selectedPhase,
  setSelectedPhase,
  assigneeFilter,
  setAssigneeFilter,
  uniqueAssignees,
  showBlockedOnly,
  setShowBlockedOnly,
  showOverdueOnly,
  setShowOverdueOnly,
  showHomeownerActionOnly,
  setShowHomeownerActionOnly,
  showNeedsAttentionOnly,
  setShowNeedsAttentionOnly,
  showCriticalOnly,
  setShowCriticalOnly,
  onOpenGenerate,
  onBuildSchedule,
  onOpenNewTask,
  buildingSchedule = false,
}: TaskToolbarProps) {
  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-1">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Task Operations
          </div>
          <CardTitle className="text-xl font-semibold tracking-tight text-zinc-100">
            Tasks Board
          </CardTitle>
          <p className="text-sm text-zinc-500">
            Manage field execution, blockers, homeowner actions, and schedule visibility.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={onOpenGenerate}
            className="border-zinc-800 bg-black text-zinc-300 hover:border-zinc-700 hover:bg-zinc-950 hover:text-zinc-100"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Generate Tasks
          </Button>

          <Button
            variant="outline"
            onClick={onBuildSchedule}
            disabled={buildingSchedule}
            className="border-zinc-800 bg-black text-zinc-300 hover:border-zinc-700 hover:bg-zinc-950 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {buildingSchedule ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CalendarRange className="mr-2 h-4 w-4" />
            )}
            {buildingSchedule ? "Building..." : "Build Schedule"}
          </Button>

          <Button
            onClick={onOpenNewTask}
            className="border border-zinc-700 bg-zinc-900 text-zinc-100 hover:border-zinc-600 hover:bg-zinc-800"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Task
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-black p-4">
        <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => setViewMode("board")}
              className={modeButtonClass(viewMode === "board")}
            >
              <LayoutGrid className="mr-2 h-4 w-4" />
              Board
            </Button>

            <Button
              variant="outline"
              onClick={() => setViewMode("timeline")}
              className={modeButtonClass(viewMode === "timeline")}
            >
              <GanttChartSquare className="mr-2 h-4 w-4" />
              Timeline
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              <Filter className="h-3.5 w-3.5" />
              Filters
            </div>

            <Select value={selectedPhase} onValueChange={setSelectedPhase}>
              <SelectTrigger className="w-[190px] border-zinc-800 bg-zinc-950 text-zinc-100">
                <SelectValue placeholder="Phase" />
              </SelectTrigger>
              <SelectContent className="border-zinc-800 bg-zinc-950 text-zinc-100">
                <SelectItem value="all">All Phases</SelectItem>
                {PHASE_OPTIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
              <SelectTrigger className="w-[190px] border-zinc-800 bg-zinc-950 text-zinc-100">
                <SelectValue placeholder="Assignee" />
              </SelectTrigger>
              <SelectContent className="border-zinc-800 bg-zinc-950 text-zinc-100">
                <SelectItem value="all">All Assignees</SelectItem>
                {uniqueAssignees.map((assignee) => (
                  <SelectItem key={assignee} value={assignee}>
                    {assignee}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => setShowBlockedOnly((v) => !v)}
              className={filterButtonClass(showBlockedOnly)}
            >
              Blocked
            </Button>

            <Button
              variant="outline"
              onClick={() => setShowOverdueOnly((v) => !v)}
              className={filterButtonClass(showOverdueOnly)}
            >
              Overdue
            </Button>

            <Button
              variant="outline"
              onClick={() => setShowHomeownerActionOnly((v) => !v)}
              className={filterButtonClass(showHomeownerActionOnly)}
            >
              Homeowner Action
            </Button>

            <Button
              variant="outline"
              onClick={() => setShowNeedsAttentionOnly((v) => !v)}
              className={filterButtonClass(showNeedsAttentionOnly)}
            >
              Needs Attention
            </Button>

            <Button
              variant="outline"
              onClick={() => setShowCriticalOnly((v) => !v)}
              className={filterButtonClass(showCriticalOnly)}
            >
              Critical Path
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}