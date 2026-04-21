"use client"

import { Sparkles, ClipboardList } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

interface GeneratedTaskPreview {
  name: string
  phase: string
  sort_order: number
  description?: string | null
  depends_on_names?: string[]
}

interface GenerateTasksDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectNotes: string
  setProjectNotes: (value: string) => void
  generatedTasks: GeneratedTaskPreview[]
  generateMessage: string
  generating: boolean
  insertingGenerated: boolean
  handleGenerateTasks: () => void | Promise<void>
  handleInsertGeneratedTasks: () => void | Promise<void>
  getPhaseLabel: (phase: string) => string
  onCancel: () => void
}

export function GenerateTasksDialog({
  open,
  onOpenChange,
  projectNotes,
  setProjectNotes,
  generatedTasks,
  generateMessage,
  generating,
  insertingGenerated,
  handleGenerateTasks,
  handleInsertGeneratedTasks,
  getPhaseLabel,
  onCancel,
}: GenerateTasksDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl rounded-2xl border-0 bg-white p-0 shadow-xl ring-1 ring-slate-200/70">
        <DialogHeader className="border-b border-slate-200 bg-slate-50/70 px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-blue-50 p-2.5 ring-1 ring-blue-200">
              <Sparkles className="h-5 w-5 text-blue-700" />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-left text-xl font-semibold tracking-tight text-slate-900">
                Generate Baseline Tasks
              </DialogTitle>
              <p className="text-left text-sm text-slate-500">
                Create a starting task list for this project, then review it before inserting.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 px-6 py-6">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="text-sm font-medium text-slate-800">Project Notes</div>
            <div className="mt-1 text-xs text-slate-500">
              Add context like build type, scope, finish level, or special conditions.
            </div>

            <Textarea
              value={projectNotes}
              onChange={(e) => setProjectNotes(e.target.value)}
              placeholder="Example: custom home, detached garage, remodel with addition, high-end finishes..."
              className="mt-3 min-h-[120px] border-slate-200 bg-white text-slate-800 placeholder:text-slate-400"
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-slate-50 p-2 ring-1 ring-slate-200">
                <ClipboardList className="h-4 w-4 text-slate-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-slate-800">What this generates</div>
                <ul className="mt-2 space-y-1 text-sm text-slate-500">
                  <li>• Standard construction tasks</li>
                  <li>• Phase assignments</li>
                  <li>• Sort order</li>
                  <li>• A reviewable preview before insert</li>
                </ul>
              </div>
            </div>
          </div>

          {generatedTasks.length > 0 && (
            <div className="space-y-3">
              <div className="text-sm font-medium text-slate-800">Generated Tasks Preview</div>

              <div className="max-h-[340px] overflow-y-auto rounded-2xl border border-slate-200 bg-white">
                <div className="divide-y divide-slate-200">
                  {generatedTasks.map((task, index) => (
                    <div key={`${task.name}-${index}`} className="p-4">
                      <div className="text-sm font-semibold text-slate-900">{task.name}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        Phase: {getPhaseLabel(task.phase)}
                      </div>

                      {task.description && (
                        <div className="mt-2 text-xs text-slate-500">{task.description}</div>
                      )}

                      {task.depends_on_names && task.depends_on_names.length > 0 && (
                        <div className="mt-2 text-xs text-slate-500">
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
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {generateMessage}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={generating || insertingGenerated}
              className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Button>

            {generatedTasks.length > 0 && (
              <Button
                onClick={handleInsertGeneratedTasks}
                disabled={insertingGenerated}
                className="border-0 bg-blue-600 text-white hover:bg-blue-700"
              >
                {insertingGenerated ? "Inserting..." : "Insert Tasks"}
              </Button>
            )}

            <Button
              onClick={handleGenerateTasks}
              disabled={generating || insertingGenerated}
              className="border-0 bg-blue-600 text-white hover:bg-blue-700"
            >
              {generating ? "Generating..." : generatedTasks.length > 0 ? "Regenerate" : "Generate"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}