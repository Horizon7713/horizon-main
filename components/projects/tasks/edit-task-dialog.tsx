"use client"

import { Dispatch, SetStateAction } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Task } from "./task-types"

type EditTaskDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  editData: Partial<Task>
  setEditData: Dispatch<SetStateAction<Partial<Task>>>
  editingTask: Task | null
  tasks: Task[]
  saveEdit: () => Promise<void>
  calculateDurationDays: (start?: string | null, end?: string | null) => number
  savingEdit: boolean
}

const STATUS_OPTIONS = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "blocked", label: "Blocked" },
  { value: "completed", label: "Completed" },
]

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
]

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {description ? (
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        ) : null}
      </div>
      <div className="grid gap-4">{children}</div>
    </section>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  )
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none ring-0 transition focus:border-slate-400 ${
        props.className || ""
      }`}
    />
  )
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`min-h-[96px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 transition focus:border-slate-400 ${
        props.className || ""
      }`}
    />
  )
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none ring-0 transition focus:border-slate-400 ${
        props.className || ""
      }`}
    />
  )
}

export function EditTaskDialog({
  open,
  onOpenChange,
  editData,
  setEditData,
  editingTask,
  tasks,
  saveEdit,
  savingEdit,
}: EditTaskDialogProps) {
  const dependencyOptions = tasks.filter((t) => t.id !== editingTask?.id)

  const selectedDependencies = new Set(editData.depends_on || [])

  const updateField = <K extends keyof Task>(key: K, value: Task[K]) => {
    setEditData((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const toggleDependency = (taskId: string) => {
    const current = editData.depends_on || []
    const next = current.includes(taskId)
      ? current.filter((id) => id !== taskId)
      : [...current, taskId]

    setEditData((prev) => ({
      ...prev,
      depends_on: next,
    }))
  }

  const showBlockerFields =
    editData.status === "blocked" ||
    !!editData.blocker_reason ||
    !!editData.blocker_note

  const showHomeownerFields =
    !!editData.requires_homeowner_action ||
    !!editData.homeowner_action_text ||
    !!editData.homeowner_visible_note

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto rounded-3xl border-0 bg-slate-50 p-0 shadow-2xl ring-1 ring-slate-200/70">
        <DialogHeader className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-6 py-5 backdrop-blur">
          <DialogTitle className="text-left text-2xl font-semibold tracking-tight text-slate-900">
            Edit Task
          </DialogTitle>
          <p className="text-left text-sm text-slate-500">
            Clean up the task details here. Schedule dates below are calculated from dependencies and locked dates.
          </p>
        </DialogHeader>

        <div className="grid gap-5 px-6 py-6">
          <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <Section
              title="Basic"
              description="The main task details people actually care about."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Task Name">
                  <Input
                    value={editData.name || ""}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="Enter task name"
                  />
                </Field>

                <Field label="Assignee Name">
                  <Input
                    value={editData.assigned_to_name || ""}
                    onChange={(e) =>
                      updateField("assigned_to_name", e.target.value)
                    }
                    placeholder="Who owns this?"
                  />
                </Field>
              </div>

              <Field label="Description">
                <Textarea
                  value={editData.description || ""}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="Short notes about the task"
                />
              </Field>

              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Status">
                  <Select
                    value={editData.status || "not_started"}
                    onChange={(e) =>
                      updateField("status", e.target.value as Task["status"])
                    }
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="Phase">
                  <Input
                    value={editData.phase || ""}
                    onChange={(e) => updateField("phase", e.target.value)}
                    placeholder="Phase"
                  />
                </Field>

                <Field label="Priority">
                  <Select
                    value={editData.priority || "medium"}
                    onChange={(e) =>
                      updateField("priority", e.target.value as Task["priority"])
                    }
                  >
                    {PRIORITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            </Section>

            <Section
              title="Schedule Summary"
              description="These are the dates the schedule engine should drive."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Estimated Start
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {editData.planned_start || "Not scheduled"}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Estimated Finish
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {editData.planned_end || "Not scheduled"}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Float
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {editData.total_float_days ?? "—"} days
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Critical Path
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {editData.is_critical ? "Yes" : "No"}
                  </div>
                </div>
              </div>
            </Section>
          </div>

          <Section
            title="Schedule Inputs"
            description="Only edit what should actually influence the schedule."
          >
            <div className="grid gap-4 md:grid-cols-4">
              <Field label="Duration (days)">
                <Input
                  type="number"
                  min={1}
                  value={editData.duration_days ?? 1}
                  onChange={(e) =>
                    updateField("duration_days", Number(e.target.value || 1))
                  }
                />
              </Field>

              <Field label="Lag (days)">
                <Input
                  type="number"
                  min={0}
                  value={editData.lag_days ?? 0}
                  onChange={(e) =>
                    updateField("lag_days", Number(e.target.value || 0))
                  }
                />
              </Field>

              <Field label="Locked Start">
                <Input
                  type="date"
                  value={editData.locked_start_date || ""}
                  onChange={(e) =>
                    updateField("locked_start_date", e.target.value)
                  }
                />
              </Field>

              <Field label="Locked End">
                <Input
                  type="date"
                  value={editData.locked_end_date || ""}
                  onChange={(e) => updateField("locked_end_date", e.target.value)}
                />
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Due Date">
                <Input
                  type="date"
                  value={editData.due_date || ""}
                  onChange={(e) => updateField("due_date", e.target.value)}
                />
              </Field>

              <Field label="Trade">
                <Input
                  value={editData.trade || ""}
                  onChange={(e) => updateField("trade", e.target.value)}
                  placeholder="general"
                />
              </Field>
            </div>

            <div className="grid gap-2">
              <div className="text-sm font-medium text-slate-700">Dependencies</div>
              <div className="grid max-h-64 gap-2 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3">
                {dependencyOptions.length === 0 ? (
                  <div className="text-sm text-slate-500">No other tasks available.</div>
                ) : (
                  dependencyOptions.map((task) => (
                    <label
                      key={task.id}
                      className="flex items-start gap-3 rounded-xl border border-slate-200 px-3 py-2 hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedDependencies.has(task.id)}
                        onChange={() => toggleDependency(task.id)}
                        className="mt-1 h-4 w-4"
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-900">
                          {task.name}
                        </div>
                        <div className="text-xs text-slate-500">
                          {task.phase} · {task.status}
                        </div>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>
          </Section>

          <div className="grid gap-5 xl:grid-cols-2">
            <Section
              title="Blockers"
              description="Only fill this out when the task is blocked."
            >
              <div className="grid gap-4">
                <Field label="Blocker Reason">
                  <Input
                    value={editData.blocker_reason || ""}
                    onChange={(e) =>
                      updateField("blocker_reason", e.target.value)
                    }
                    placeholder="Waiting on permit, materials, dependency, etc."
                  />
                </Field>

                <Field label="Blocker Note">
                  <Textarea
                    value={editData.blocker_note || ""}
                    onChange={(e) => updateField("blocker_note", e.target.value)}
                    placeholder="Optional details"
                  />
                </Field>

                {!showBlockerFields && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                    No blocker details set.
                  </div>
                )}
              </div>
            </Section>

            <Section
              title="Homeowner Action"
              description="Only show this when the homeowner needs to do something."
            >
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <input
                  type="checkbox"
                  checked={!!editData.requires_homeowner_action}
                  onChange={(e) =>
                    updateField("requires_homeowner_action", e.target.checked)
                  }
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium text-slate-700">
                  Requires homeowner action
                </span>
              </label>

              {showHomeownerFields && (
                <>
                  <Field label="Action Text">
                    <Input
                      value={editData.homeowner_action_text || ""}
                      onChange={(e) =>
                        updateField("homeowner_action_text", e.target.value)
                      }
                      placeholder="Approve finish selection, sign permit form, etc."
                    />
                  </Field>

                  <Field label="Visible Note">
                    <Textarea
                      value={editData.homeowner_visible_note || ""}
                      onChange={(e) =>
                        updateField("homeowner_visible_note", e.target.value)
                      }
                      placeholder="What the homeowner should know"
                    />
                  </Field>
                </>
              )}

              {!showHomeownerFields && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  No homeowner action needed.
                </div>
              )}
            </Section>
          </div>
        </div>

        <div className="sticky bottom-0 z-10 flex items-center justify-end gap-3 border-t border-slate-200 bg-white/95 px-6 py-4 backdrop-blur">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={saveEdit}
            disabled={savingEdit}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingEdit ? "Saving..." : "Save Task"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}