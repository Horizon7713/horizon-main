"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { AlertTriangle, ClipboardList, UserPlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabase/client"
import { createTask } from "@/app/project_data/actions"

interface User {
  id: string
  first_name: string
  last_name: string
  email: string
}

interface ProjectMember {
  user_id: string
  role_in_project: string | null
  user: User
}

interface FormNewTaskProps {
  projectId: string
  onSuccess?: () => void
  onCancel?: () => void
}

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

function Section({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="mb-4 flex items-start gap-3">
        <div className="rounded-xl bg-white p-2 ring-1 ring-slate-200">
          {icon}
        </div>
        <div>
          <div className="text-sm font-medium text-slate-800">{title}</div>
          {subtitle && <div className="mt-1 text-xs text-slate-500">{subtitle}</div>}
        </div>
      </div>

      <div className="space-y-4">{children}</div>
    </div>
  )
}

export function FormNewTask({ projectId, onSuccess, onCancel }: FormNewTaskProps) {
  const [formData, setFormData] = useState({
    name: "",
    phase: "",
    status: "not_started" as "not_started" | "in_progress" | "blocked" | "completed",
    dueDate: "",
    assignedTo: "unassigned",
    description: "",
  })

  const [users, setUsers] = useState<ProjectMember[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProjectMembers = async () => {
      setLoadingUsers(true)

      try {
        const { data, error } = await supabase
          .from("project_users")
          .select(
            `
            user_id,
            role_in_project,
            user:user_id (
              id,
              first_name,
              last_name,
              email
            )
          `
          )
          .eq("project_id", projectId)
          .order("user_id")

        if (error) {
          console.error("[tasks] Error fetching project members:", error)
          setUsers([])
        } else {
          const normalizedUsers: ProjectMember[] = ((data ?? []) as any[]).map((member) => ({
  user_id: member.user_id,
  role_in_project: member.role_in_project,
  user: Array.isArray(member.user) ? member.user[0] : member.user,
}))

setUsers(normalizedUsers)
        }
      } catch (err) {
        console.error("[tasks] Error fetching project members:", err)
        setUsers([])
      } finally {
        setLoadingUsers(false)
      }
    }

    fetchProjectMembers()
  }, [projectId])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!formData.name.trim()) {
      setError("Task name is required.")
      setLoading(false)
      return
    }

    if (!formData.phase) {
      setError("Phase is required.")
      setLoading(false)
      return
    }

    try {
      const result = await createTask({
        projectId,
        name: formData.name.trim(),
        phase: formData.phase,
        status: formData.status,
        dueDate: formData.dueDate || undefined,
        assignedTo: formData.assignedTo === "unassigned" ? undefined : formData.assignedTo,
        description: formData.description.trim() || undefined,
      })

      if (!result.success) {
        setError(result.error || "Failed to create task.")
        return
      }

      setFormData({
        name: "",
        phase: "",
        status: "not_started",
        dueDate: "",
        assignedTo: "unassigned",
        description: "",
      })

      onSuccess?.()
    } catch (err) {
      console.error("[tasks] Error creating task:", err)
      setError(err instanceof Error ? err.message : "An error occurred.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <div className="font-medium">Unable to create task</div>
              <div className="mt-1 text-red-600/90">{error}</div>
            </div>
          </div>
        </div>
      )}

      <Section
        icon={<ClipboardList className="h-4 w-4 text-slate-600" />}
        title="Task Details"
        subtitle="Define the task and place it in the correct phase."
      >
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-medium text-slate-700">
            Task Name *
          </Label>
          <Input
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="e.g. Pour foundation"
            disabled={loading}
            className="border-slate-200 bg-white"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="phase" className="text-sm font-medium text-slate-700">
              Phase *
            </Label>
            <Select
              value={formData.phase}
              onValueChange={(value) => handleSelectChange("phase", value)}
              disabled={loading}
            >
              <SelectTrigger id="phase" className="border-slate-200 bg-white text-slate-700">
                <SelectValue placeholder="Select phase" />
              </SelectTrigger>
              <SelectContent>
                {PHASE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status" className="text-sm font-medium text-slate-700">
              Status
            </Label>
            <Select
              value={formData.status}
              onValueChange={(value) => handleSelectChange("status", value)}
              disabled={loading}
            >
              <SelectTrigger id="status" className="border-slate-200 bg-white text-slate-700">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Section>

      <Section
        icon={<UserPlus className="h-4 w-4 text-slate-600" />}
        title="Assignment & Timing"
        subtitle="Set responsibility and target completion timing."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="dueDate" className="text-sm font-medium text-slate-700">
              Due Date
            </Label>
            <Input
              id="dueDate"
              name="dueDate"
              type="date"
              value={formData.dueDate}
              onChange={handleInputChange}
              disabled={loading}
              className="border-slate-200 bg-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="assignedTo" className="text-sm font-medium text-slate-700">
              Assign To
            </Label>
            <Select
              value={formData.assignedTo}
              onValueChange={(value) => handleSelectChange("assignedTo", value)}
              disabled={loading || loadingUsers}
            >
              <SelectTrigger id="assignedTo" className="border-slate-200 bg-white text-slate-700">
                <SelectValue placeholder={loadingUsers ? "Loading members..." : "Select member"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {users.map((member) => {
                  const first = member.user?.first_name || ""
                  const last = member.user?.last_name || ""
                  const fullName = `${first} ${last}`.trim() || member.user?.email || "Unknown User"
                  const role = member.role_in_project ? ` • ${member.role_in_project}` : ""

                  return (
                    <SelectItem key={member.user_id} value={member.user_id}>
                      {fullName}
                      {role}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Section>

      <Section
        icon={<ClipboardList className="h-4 w-4 text-slate-600" />}
        title="Description"
        subtitle="Add optional context for the field team or office."
      >
        <div className="space-y-2">
          <Label htmlFor="description" className="text-sm font-medium text-slate-700">
            Description
          </Label>
          <Textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Add details about this task..."
            disabled={loading}
            rows={5}
            className="border-slate-200 bg-white"
          />
        </div>
      </Section>

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
            className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white hover:bg-blue-700"
        >
          {loading ? "Creating..." : "Create Task"}
        </Button>
      </div>
    </form>
  )
}
