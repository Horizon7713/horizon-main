"use client"

import {
  DndContext,
  DragEndEvent,
  closestCenter,
} from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { ClipboardList } from "lucide-react"

import { PhaseColumn } from "./phase-column"
import { SortableTaskCard } from "./sortable-task-card"
import { Task, TaskStatus } from "./task-types"

interface GroupedPhase {
  value: string
  label: string
  tasks: Task[]
}

interface TaskBoardViewProps {
  grouped: GroupedPhase[]
  sensors: ReturnType<typeof Array>
  handleDragEnd: (event: DragEndEvent) => void
  openEdit: (task: Task) => void
  handleDelete: (id: string) => void
  handleStatus: (id: string, status: TaskStatus) => void
  isOverdue: (date: string | null) => boolean
  isBlocked: (task: Task) => boolean
}

export function TaskBoardView({
  grouped,
  sensors,
  handleDragEnd,
  openEdit,
  handleDelete,
  handleStatus,
  isOverdue,
  isBlocked,
}: TaskBoardViewProps) {
  return (
    <DndContext
      sensors={sensors as any}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="overflow-x-auto rounded-2xl">
        <div className="flex min-w-max gap-5 pb-3">
          {grouped.map((group) => (
            <PhaseColumn
              key={group.value}
              phaseId={group.value}
              label={group.label}
              count={group.tasks.length}
            >
              <SortableContext
                items={group.tasks.map((t) => t.id)}
                strategy={verticalListSortingStrategy}
              >
                {group.tasks.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-zinc-800 bg-black p-8 text-center">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950">
                      <ClipboardList className="h-4 w-4 text-zinc-400" />
                    </div>
                    <div className="mt-3 text-sm font-medium text-zinc-200">
                      No tasks in this phase
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
                      Drag tasks here or create a new one.
                    </div>
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
  )
}