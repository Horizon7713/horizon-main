"use client"

import { useEffect, useState } from "react"
import {
  Building2,
  CalendarDays,
  DollarSign,
  PencilLine,
  RefreshCcw,
  Ruler,
  Bath,
  DoorOpen,
  PanelsTopLeft,
  Package,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { buildSchedule } from "@/app/project_data/actions"

interface EditProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: {
    id: string
    name: string
    start_date: string | null
    end_date: string | null
    budget: number | null
    square_feet: number | null
    bathroom_count: number | null
    window_count: number | null
    door_count: number | null
    cabinet_count: number | null
  }
  updateProject: (data: {
    projectId: string
    name?: string
    startDate?: string | null
    endDate?: string | null
    budget?: number | null
    squareFeet?: number | null
    bathroomCount?: number | null
    windowCount?: number | null
    doorCount?: number | null
    cabinetCount?: number | null
  }) => Promise<{ success: boolean; error?: string }>
  onSaved?: () => void | Promise<void>
}

function SectionHeader({
  icon: Icon,
  eyebrow,
  title,
  subtitle,
}: {
  icon: React.ComponentType<{ className?: string }>
  eyebrow: string
  title: string
  subtitle: string
}) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950">
        <Icon className="h-4 w-4 text-zinc-300" />
      </div>

      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
          {eyebrow}
        </div>
        <div className="mt-1 text-sm font-semibold text-zinc-100">{title}</div>
        <div className="mt-1 text-xs text-zinc-500">{subtitle}</div>
      </div>
    </div>
  )
}

export function EditProjectDialog({
  open,
  onOpenChange,
  project,
  updateProject,
  onSaved,
}: EditProjectDialogProps) {
  const [loading, setLoading] = useState(false)
  const [rebuilding, setRebuilding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    startDate: "",
    endDate: "",
    budget: "",
    squareFeet: "",
    bathroomCount: "",
    windowCount: "",
    doorCount: "",
    cabinetCount: "",
  })

  useEffect(() => {
    if (!project) return

    setFormData({
      name: project.name || "",
      startDate: project.start_date || "",
      endDate: project.end_date || "",
      budget: project.budget != null ? String(project.budget) : "",
      squareFeet: project.square_feet != null ? String(project.square_feet) : "",
      bathroomCount: project.bathroom_count != null ? String(project.bathroom_count) : "",
      windowCount: project.window_count != null ? String(project.window_count) : "",
      doorCount: project.door_count != null ? String(project.door_count) : "",
      cabinetCount: project.cabinet_count != null ? String(project.cabinet_count) : "",
    })
  }, [project])

  const getPayload = () => ({
    projectId: project.id,
    name: formData.name,
    startDate: formData.startDate || null,
    endDate: formData.endDate || null,
    budget: formData.budget ? Number.parseFloat(formData.budget) : null,
    squareFeet: formData.squareFeet ? Number.parseFloat(formData.squareFeet) : null,
    bathroomCount: formData.bathroomCount ? Number.parseInt(formData.bathroomCount, 10) : null,
    windowCount: formData.windowCount ? Number.parseInt(formData.windowCount, 10) : null,
    doorCount: formData.doorCount ? Number.parseInt(formData.doorCount, 10) : null,
    cabinetCount: formData.cabinetCount ? Number.parseInt(formData.cabinetCount, 10) : null,
  })

  const handleSave = async (alsoRebuild: boolean) => {
    setError(null)
    if (alsoRebuild) {
      setRebuilding(true)
    } else {
      setLoading(true)
    }

    try {
      const result = await updateProject(getPayload())

      if (!result.success) {
        setError(result.error || "Failed to update project")
        return
      }

      if (alsoRebuild) {
        const scheduleResult = await buildSchedule(project.id)
        if (!scheduleResult?.success) {
          setError(scheduleResult?.error || "Project saved, but schedule rebuild failed.")
          if (onSaved) await onSaved()
          return
        }
      }

      if (onSaved) await onSaved()
      onOpenChange(false)
    } finally {
      setLoading(false)
      setRebuilding(false)
    }
  }

  const inputClassName =
    "h-11 rounded-xl border-zinc-800 bg-black text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-1 focus-visible:ring-zinc-700"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl border-zinc-800 bg-zinc-950 p-0 text-zinc-100">
        <DialogHeader className="border-b border-zinc-800 px-5 py-4">
          <DialogTitle className="flex items-center gap-3 text-left">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-800 bg-black">
              <PencilLine className="h-5 w-5 text-zinc-200" />
            </div>

            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Project Maintenance
              </div>
              <div className="mt-1 text-lg font-semibold text-zinc-100">
                Edit Project
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 p-5">
          {error ? (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <div className="rounded-2xl border border-zinc-800 bg-black p-4">
            <SectionHeader
              icon={Building2}
              eyebrow="Project Core"
              title="Primary Project Details"
              subtitle="Update the project name, budget, and active schedule window."
            />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label className="text-zinc-300">Project Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={inputClassName}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-300">Budget</Label>
                <div className="relative">
                  <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    className={`${inputClassName} pl-9`}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-300">Start Date</Label>
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className={`${inputClassName} pl-9`}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-300">End Date</Label>
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <Input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className={`${inputClassName} pl-9`}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-black p-4">
            <SectionHeader
              icon={Ruler}
              eyebrow="Scheduling Inputs"
              title="Quantity-Based Planning Inputs"
              subtitle="These values drive quantity-based schedule calculations."
            />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <div className="space-y-2">
                <Label className="text-zinc-300">Square Feet</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.squareFeet}
                  onChange={(e) => setFormData({ ...formData, squareFeet: e.target.value })}
                  className={inputClassName}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-300">Bathrooms</Label>
                <div className="relative">
                  <Bath className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={formData.bathroomCount}
                    onChange={(e) => setFormData({ ...formData, bathroomCount: e.target.value })}
                    className={`${inputClassName} pl-9`}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-300">Windows</Label>
                <div className="relative">
                  <PanelsTopLeft className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={formData.windowCount}
                    onChange={(e) => setFormData({ ...formData, windowCount: e.target.value })}
                    className={`${inputClassName} pl-9`}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-300">Doors</Label>
                <div className="relative">
                  <DoorOpen className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={formData.doorCount}
                    onChange={(e) => setFormData({ ...formData, doorCount: e.target.value })}
                    className={`${inputClassName} pl-9`}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-300">Cabinets</Label>
                <div className="relative">
                  <Package className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={formData.cabinetCount}
                    onChange={(e) => setFormData({ ...formData, cabinetCount: e.target.value })}
                    className={`${inputClassName} pl-9`}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-800 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading || rebuilding}
              className="border-zinc-800 bg-black text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-100"
            >
              Cancel
            </Button>

            <Button
              variant="outline"
              onClick={() => handleSave(false)}
              disabled={loading || rebuilding}
              className="border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-100"
            >
              {loading ? "Saving..." : "Save Only"}
            </Button>

            <Button
              onClick={() => handleSave(true)}
              disabled={loading || rebuilding}
              className="border border-zinc-700 bg-zinc-900 text-zinc-100 hover:border-zinc-600 hover:bg-zinc-800"
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              {rebuilding ? "Saving + Rebuilding..." : "Save + Rebuild Schedule"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}